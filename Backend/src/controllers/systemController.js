const { getDiskUsage, WARN_THRESHOLD_PERCENT } = require('../utils/diskHelper');
const { logStorageWarningIfNeeded } = require('../middleware/errorMiddleware');

async function getStorage(req, res, next) {
  try {
    const usage = await getDiskUsage();
    if (usage.warning) {
      await logStorageWarningIfNeeded();
    }
    res.json({
      total: usage.total,
      used: usage.used,
      free: usage.free,
      usage_percent: usage.usagePercent,
      warning: usage.warning,
      warning_threshold_percent: WARN_THRESHOLD_PERCENT,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStorage };
