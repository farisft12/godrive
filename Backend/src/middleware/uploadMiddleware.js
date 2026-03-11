const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { TEMP, PAYMENT_PROOFS, ensureDirs } = require('../config/storage');

ensureDirs();

// Chunk size for chunked uploads (MB). Minimum 1 so Multer always accepts at least 1 MB per chunk.
const _rawChunkMb = parseInt(process.env.CHUNK_SIZE_MB || '1', 10);
const CHUNK_SIZE_MB = Number.isFinite(_rawChunkMb) && _rawChunkMb >= 1 ? _rawChunkMb : 1;
const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;

/** Per-request chunk limit so env changes (e.g. after restart) are used. Use this for chunk upload middleware. */
function getChunkLimitBytes() {
  const raw = parseInt(process.env.CHUNK_SIZE_MB || '1', 10);
  const mb = Number.isFinite(raw) && raw >= 1 ? raw : 1;
  return mb * 1024 * 1024;
}

/** Chunk upload: memory storage, single file field "chunk", limit from getChunkLimitBytes() per request */
function createChunkUploadMiddleware() {
  return (req, res, next) => {
    const limitBytes = getChunkLimitBytes();
    const m = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: limitBytes },
      fileFilter,
    });
    m.single('chunk')(req, res, next);
  };
}

const uploadChunk = createChunkUploadMiddleware();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, uuidv4() + ext);
  },
});

const paymentProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PAYMENT_PROOFS);
  },
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const safe = (req.params.orderId || '').replace(/[^a-zA-Z0-9-_]/g, '') || 'proof';
    cb(null, `${safe}_${Date.now()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const banned = /\.(exe|bat|cmd|sh|php|phtml|jsp)$/i;
  if (banned.test(path.extname(file.originalname))) {
    return cb(new Error('File type not allowed'), false);
  }
  cb(null, true);
}

function paymentProofFileFilter(req, file, cb) {
  const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
  if (!allowed.test(path.extname(file.originalname))) {
    return cb(new Error('Only image files (jpg, png, gif, webp) are allowed'), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_MB || '500', 10) * 1024 * 1024,
  },
  fileFilter,
});

const PAYMENT_PROOF_MAX_MB = 5;
const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  limits: { fileSize: PAYMENT_PROOF_MAX_MB * 1024 * 1024 },
  fileFilter: paymentProofFileFilter,
}).single('proof');

const uploadSingle = (fieldName = 'file') => upload.single(fieldName);

/** Dynamic limit from DB (settings table). Use for file uploads. */
async function uploadSingleDynamic(fieldName = 'file') {
  const settingsHelper = require('../utils/settingsHelper');
  const maxUploadMb = (await settingsHelper.getSetting('max_upload_mb')) || process.env.MAX_UPLOAD_MB || '500';
  const limitBytes = parseInt(String(maxUploadMb), 10) * 1024 * 1024;
  const m = multer({
    storage,
    limits: { fileSize: limitBytes },
    fileFilter,
  });
  return m.single(fieldName);
}

function middlewareWithDynamicLimit(fieldName = 'file') {
  return async (req, res, next) => {
    try {
      const single = await uploadSingleDynamic(fieldName);
      single(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { upload, uploadSingle, uploadPaymentProof, uploadChunk, uploadSingleDynamic, middlewareWithDynamicLimit, CHUNK_SIZE_MB, CHUNK_SIZE_BYTES, getChunkLimitBytes };
