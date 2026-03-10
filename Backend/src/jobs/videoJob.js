const videoService = require('../services/videoService');

async function processVideoJob(data) {
  const { fileId, userId } = data;
  if (!fileId || !userId) return;
  await videoService.processVideo(fileId, userId);
}

module.exports = { processVideoJob };
