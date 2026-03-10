const compressionService = require('../services/compressionService');

async function processCompressionJob(data) {
  const { fileId, userId } = data;
  if (!fileId || !userId) return;
  await compressionService.compressFile(fileId, userId);
}

module.exports = { processCompressionJob };
