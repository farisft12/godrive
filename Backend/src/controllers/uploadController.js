const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const uploadService = require('../services/uploadService');
const quotaService = require('../services/quotaService');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const { CHUNK_UPLOADS } = require('../config/storage');
const { CHUNK_SIZE_BYTES, getChunkLimitBytes } = require('../middleware/uploadMiddleware');
const Folder = require('../models/Folder');
const settingsHelper = require('../utils/settingsHelper');

const CHUNK_UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const BODY_FILENAME = 'body';
const META_FILENAME = 'meta.json';
const CHUNK_LOCK_FILENAME = '.chunk.lock';
const CHUNK_LOCK_RETRIES = 1200; // ~30s max wait (1200 * 25ms)
const CHUNK_LOCK_WAIT_MS = 25;
const CHUNK_LOCK_STALE_MS = 2 * 60 * 1000; // 2 minutes

// Serialize chunk writes per uploadId (in-process).
const _uploadLocks = new Map();
function withUploadLock(uploadId, fn) {
  const current = _uploadLocks.get(uploadId) || Promise.resolve();
  const next = current.then(fn, fn);
  _uploadLocks.set(
    uploadId,
    next.finally(() => {
      if (_uploadLocks.get(uploadId) === next) _uploadLocks.delete(uploadId);
    })
  );
  return next;
}

// Cross-process lock: only one process can append to a given upload at a time.
async function withChunkFileLock(dirPath, fn) {
  const lockPath = path.join(dirPath, CHUNK_LOCK_FILENAME);
  let fd;
  for (let i = 0; i < CHUNK_LOCK_RETRIES; i++) {
    try {
      fd = await fs.open(lockPath, 'wx');
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // If lock file is stale (e.g., previous process crashed), remove it and retry immediately.
      try {
        const st = await fs.stat(lockPath).catch(() => null);
        if (st && Date.now() - st.mtimeMs > CHUNK_LOCK_STALE_MS) {
          await fs.unlink(lockPath).catch(() => {});
          require('fs').appendFileSync(
            path.join(process.cwd(), 'debug-eb84bb.log'),
            JSON.stringify({
              sessionId: 'eb84bb',
              runId: 'pre-fix',
              hypothesisId: 'V3',
              location: 'uploadController.js:withChunkFileLock',
              message: 'removed stale lock',
              data: { lockAgeMs: Date.now() - st.mtimeMs, dirPath },
              timestamp: Date.now(),
            }) + '\n'
          );
          continue;
        }
      } catch (_) {}
      if (i === CHUNK_LOCK_RETRIES - 1) throw new Error('Chunk upload lock timeout');
      await new Promise((r) => setTimeout(r, CHUNK_LOCK_WAIT_MS));
    }
  }
  try {
    return await fn();
  } finally {
    if (fd) await fd.close().catch(() => {});
    await fs.unlink(lockPath).catch(() => {});
  }
}

async function cleanupOldChunkUploads() {
  try {
    const dirs = await fs.readdir(CHUNK_UPLOADS);
    const now = Date.now();
    for (const name of dirs) {
      const dirPath = path.join(CHUNK_UPLOADS, name);
      const stat = await fs.stat(dirPath).catch(() => null);
      if (stat && stat.isDirectory() && now - stat.mtimeMs > CHUNK_UPLOAD_MAX_AGE_MS) {
        await fs.rm(dirPath, { recursive: true }).catch(() => {});
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[uploadController] cleanupOldChunkUploads:', err.message);
  }
}

async function upload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const folderId = req.body.folder_id || null;
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder || folder.user_id !== req.userId) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    const file = await uploadService.processUpload(
      req.userId,
      folderId,
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    const { encrypted_path, ...rest } = file;
    res.status(201).json(rest);
  } catch (err) {
    next(err);
  }
}

async function initChunked(req, res, next) {
  try {
    await cleanupOldChunkUploads();

    const { original_name, mime_type, total_size, folder_id } = req.body || {};
    const totalSize = total_size != null ? parseInt(String(total_size), 10) : NaN;
    if (!original_name || typeof original_name !== 'string' || !Number.isFinite(totalSize) || totalSize <= 0) {
      return res.status(400).json({ error: 'original_name and total_size required' });
    }

    const maxUploadMb = (await settingsHelper.getSetting('max_upload_mb')) || process.env.MAX_UPLOAD_MB || '500';
    const maxBytes = parseInt(String(maxUploadMb), 10) * 1024 * 1024;
    if (totalSize > maxBytes) {
      return res.status(413).json({ error: 'File exceeds max upload size' });
    }

    const folderId = folder_id || null;
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder || folder.user_id !== req.userId) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    const quotaOk = await quotaService.checkAndReserve(req.userId, totalSize);
    if (!quotaOk) {
      return res.status(403).json({ error: 'Storage quota exceeded' });
    }

    const uploadId = uuidv4();
    const dirPath = path.join(CHUNK_UPLOADS, uploadId);
    // Reset session dir defensively (avoid stale body data causing size mismatch)
    try {
      const st = await fs.stat(dirPath).catch(() => null);
      if (st) await fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
    } catch (_) {}
    await fs.mkdir(dirPath, { recursive: true });

    const meta = {
      userId: req.userId,
      folderId,
      originalName: String(original_name).trim(),
      mimeType: mime_type ? String(mime_type).trim() : null,
      totalSize,
      nextIndex: 0,
      createdAt: Date.now(),
    };
    await fs.writeFile(path.join(dirPath, META_FILENAME), JSON.stringify(meta));
    // Ensure body file starts empty even if dir pre-existed
    await fs.writeFile(path.join(dirPath, BODY_FILENAME), Buffer.alloc(0));

    res.status(200).json({ upload_id: uploadId, chunk_size: getChunkLimitBytes() });
  } catch (err) {
    next(err);
  }
}

async function statusChunked(req, res, next) {
  try {
    const uploadId = req.query.upload_id ? String(req.query.upload_id) : '';
    if (!uploadId) return res.status(400).json({ error: 'upload_id required' });

    const dirPath = path.join(CHUNK_UPLOADS, uploadId);
    const metaPath = path.join(dirPath, META_FILENAME);
    let metaRaw;
    try {
      metaRaw = await fs.readFile(metaPath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') return res.status(404).json({ error: 'Upload session not found' });
      throw e;
    }

    let meta;
    try {
      meta = JSON.parse(metaRaw);
    } catch (_) {
      return res.status(400).json({ error: 'Upload session invalid' });
    }
    if (meta.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    return res.json({
      upload_id: uploadId,
      next_index: meta.nextIndex || 0,
      received_size: meta.receivedSize || 0,
      total_size: meta.totalSize || 0,
      chunk_size: getChunkLimitBytes(),
    });
  } catch (err) {
    next(err);
  }
}

async function uploadChunk(req, res, next) {
  try {
    if (!req.file || (!req.file.buffer && !req.file.path)) {
      return res.status(400).json({ error: 'No chunk uploaded' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const uploadId = body.upload_id;
    const index = body.index != null ? parseInt(String(body.index), 10) : NaN;
    if (!uploadId || !Number.isInteger(index) || index < 0) {
      return res.status(400).json({
        error: 'upload_id and index required',
        debug: process.env.NODE_ENV !== 'production' ? { hasBody: Object.keys(body).length > 0, bodyKeys: Object.keys(body) } : undefined,
      });
    }

    await withUploadLock(uploadId, async () => {
      const dirPath = path.join(CHUNK_UPLOADS, uploadId);
      await withChunkFileLock(dirPath, async () => {
        const chunkPath = req.file.path || null;
        const chunkSize = req.file.size || (req.file.buffer ? req.file.buffer.length : 0);
        // #region agent log
        require('fs').appendFileSync(path.join(process.cwd(), 'debug-eb84bb.log'), JSON.stringify({sessionId:'eb84bb',runId:'pre-fix',hypothesisId:'V2',location:'uploadController.js:uploadChunk',message:'chunk received',data:{uploadId,index,chunkSize,hasPath:!!chunkPath,hasBuffer:!!req.file.buffer},timestamp:Date.now()})+'\n');
        // #endregion

        const metaPath = path.join(dirPath, META_FILENAME);
        let metaRaw;
        try {
          metaRaw = await fs.readFile(metaPath, 'utf8');
        } catch (e) {
          if (e.code === 'ENOENT') {
            res.status(404).json({ error: 'Upload session not found' });
            return;
          }
          throw e;
        }

        let meta;
        try {
          meta = JSON.parse(metaRaw);
        } catch (e) {
          console.error('[uploadChunk] Invalid meta.json:', e.message);
          res.status(400).json({ error: 'Upload session invalid' });
          return;
        }

        if (meta.userId !== req.userId) {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
        if (index !== meta.nextIndex) {
          res.status(400).json({ error: 'Wrong chunk index', expected: meta.nextIndex });
          return;
        }

        const bodyPath = path.join(dirPath, BODY_FILENAME);
        if (req.file.buffer) {
          await fs.appendFile(bodyPath, req.file.buffer);
        } else if (chunkPath) {
          const fsSync = require('fs');
          await new Promise((resolve, reject) => {
            const rs = fsSync.createReadStream(chunkPath);
            const ws = fsSync.createWriteStream(bodyPath, { flags: 'a' });
            rs.on('error', reject);
            ws.on('error', reject);
            ws.on('close', resolve);
            rs.pipe(ws);
          });
          await fs.unlink(chunkPath).catch(() => {});
        }

        meta.nextIndex += 1;
        meta.receivedSize = (meta.receivedSize || 0) + chunkSize;
        await fs.writeFile(metaPath, JSON.stringify(meta));
        res.status(200).json({ received: meta.receivedSize });
      });
    });
  } catch (err) {
    console.error('[uploadChunk]', err.message || err);
    if (process.env.NODE_ENV !== 'production') console.error(err.stack);
    const message = err.code === 'ENOENT' ? 'Upload session not found' : (err.message || 'Chunk upload failed');
    const status = err.code === 'ENOENT' ? 404 : 500;
    res.status(status).json({ error: message });
  }
}

async function completeChunked(req, res, next) {
  try {
    const { upload_id: uploadId } = req.body || {};
    if (!uploadId) {
      return res.status(400).json({ error: 'upload_id required' });
    }

    const dirPath = path.join(CHUNK_UPLOADS, uploadId);
    const metaPath = path.join(dirPath, META_FILENAME);
    const bodyPath = path.join(dirPath, BODY_FILENAME);

    let metaRaw;
    try {
      metaRaw = await fs.readFile(metaPath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') return res.status(404).json({ error: 'Upload session not found' });
      throw e;
    }

    const meta = JSON.parse(metaRaw);
    if (meta.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const stat = await fs.stat(bodyPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return res.status(400).json({ error: 'No file data received' });
    }
    if (stat.size !== meta.totalSize) {
      // Fallback: extra bytes are usually duplicate appends (race). If meta says we got the right total, truncate and proceed.
      if (stat.size > meta.totalSize && meta.receivedSize === meta.totalSize) {
        await fs.truncate(bodyPath, meta.totalSize);
      } else {
        return res.status(400).json({ error: 'Size mismatch', expected: meta.totalSize, received: stat.size });
      }
    }

    const file = await uploadService.processUpload(
      req.userId,
      meta.folderId,
      bodyPath,
      meta.originalName,
      meta.mimeType
    );

    await fs.rm(dirPath, { recursive: true }).catch(() => {});

    const { encrypted_path, ...rest } = file;
    res.status(201).json(rest);
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadSingle, initChunked, statusChunked, uploadChunk, completeChunked };
