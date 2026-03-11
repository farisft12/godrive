/**
 * Storage paths configuration
 * Supports single-node now; paths can map to different volumes later
 */
const path = require('path');
const fs = require('fs');

const ROOT = process.env.STORAGE_ROOT || path.join(__dirname, '..', '..', 'storage');
const UPLOADS = path.join(ROOT, 'uploads');
const STREAMS = path.join(ROOT, 'streams');
const TEMP = path.join(ROOT, 'temp');
const CHUNK_UPLOADS = path.join(TEMP, 'chunk_uploads');
const PAYMENT_PROOFS = path.join(ROOT, 'payment_proofs');

function ensureDirs() {
  [ROOT, UPLOADS, STREAMS, TEMP, CHUNK_UPLOADS, PAYMENT_PROOFS].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

module.exports = {
  ROOT,
  UPLOADS,
  STREAMS,
  TEMP,
  CHUNK_UPLOADS,
  PAYMENT_PROOFS,
  ensureDirs,
};
