const User = require('../models/User');
const File = require('../models/File');

async function checkQuota(userId, additionalBytes) {
  const user = await User.findById(userId);
  if (!user) return { allowed: false, reason: 'User not found' };
  const used = Number(user.storage_used);
  const quota = Number(user.storage_quota);
  if (used + additionalBytes > quota) {
    return { allowed: false, reason: 'Storage quota exceeded', used, quota };
  }
  return { allowed: true, used, quota };
}

async function checkAndReserve(userId, additionalBytes) {
  const result = await checkQuota(userId, additionalBytes);
  return result.allowed;
}

async function addUsage(userId, bytes) {
  const updated = await User.updateStorageUsed(userId, bytes);
  return updated;
}

async function removeUsage(userId, bytes) {
  const updated = await User.updateStorageUsed(userId, -bytes);
  return updated;
}

async function recalculateUserUsage(userId) {
  const total = await File.getTotalSizeByUser(userId);
  await User.setStorageUsed(userId, total);
  return total;
}

module.exports = {
  checkQuota,
  checkAndReserve,
  addUsage,
  removeUsage,
  recalculateUserUsage,
};
