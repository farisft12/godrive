const { getDiskUsage, WARN_THRESHOLD_PERCENT } = require('../utils/diskHelper');

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  if (err.message && err.message.includes('File type not allowed')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Error:', err);
  const isClientError = status >= 400 && status < 500;
  const is501 = status === 501;
  const responseMessage = (isClientError || is501) ? message : (process.env.NODE_ENV === 'production' ? 'Something went wrong' : message);
  res.status(status).json({
    error: responseMessage,
  });
}

async function logStorageWarningIfNeeded() {
  const usage = await getDiskUsage();
  if (usage.warning) {
    console.warn(
      `[GoDrive] Storage usage is ${usage.usagePercent}% (threshold: ${WARN_THRESHOLD_PERCENT}%). Consider upgrading storage.`
    );
  }
}

module.exports = { errorMiddleware, logStorageWarningIfNeeded };
