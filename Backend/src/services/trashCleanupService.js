const File = require('../models/File');
const quotaService = require('./quotaService');
const dedupService = require('./dedupService');
const Activity = require('../models/Activity');
const settingsHelper = require('../utils/settingsHelper');

function getEnvRetentionDays() {
  const raw = parseInt(process.env.TRASH_RETENTION_DAYS || '30', 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 30;
}

async function getRetentionDays() {
  const fromDb = await settingsHelper.getSetting('trash_retention_days');
  const raw = fromDb != null ? parseInt(String(fromDb), 10) : NaN;
  if (Number.isFinite(raw) && raw >= 1) return raw;
  return getEnvRetentionDays();
}

async function cleanupTrashedFilesOnce({ limit = 200 } = {}) {
  const days = await getRetentionDays();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const candidates = await File.listTrashedOlderThan(cutoff, limit);
  let deleted = 0;

  for (const row of candidates) {
    const userId = row.user_id;
    try {
      await quotaService.removeUsage(userId, Number(row.size_bytes) || 0);
      await dedupService.releaseBlob(row.blob_id);
      await File.remove(row.id, userId);
      await Activity.log({
        userId,
        action: 'cleanup_delete',
        resourceType: 'file',
        resourceId: row.id,
        details: { name: row.original_name, trashed_at: row.trashed_at, retention_days: days },
      });
      deleted += 1;
    } catch (err) {
      // Don't crash cleanup job; continue.
      console.warn('[trashCleanup] failed for file', row.id, err.message);
    }
  }

  return { retention_days: days, cutoff, scanned: candidates.length, deleted };
}

module.exports = { getRetentionDays, cleanupTrashedFilesOnce };

