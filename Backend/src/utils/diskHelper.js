const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { ROOT } = require('../config/storage');

const WARN_THRESHOLD_PERCENT = 85;

async function getDiskUsage(dirPath = ROOT) {
  try {
    await fs.access(dirPath);
  } catch {
    return { total: 0, used: 0, free: 0, usagePercent: 0, warning: false };
  }

  const stat = await fs.stat(dirPath);
  const dev = stat.dev;

  const platform = os.platform();
  let total = 0;
  let used = 0;
  let free = 0;

  if (platform === 'win32') {
    const drive = path.parse(path.resolve(dirPath)).root;
    try {
      const { execSync } = require('child_process');
      const out = execSync(`wmic logicaldisk where "DeviceID='${drive.replace('\\', '')}'" get Size,FreeSpace`, { encoding: 'utf8' });
      const lines = out.trim().split(/\r?\n/).filter((l) => l.trim());
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          const a = parseInt(parts[0], 10) || 0;
          const b = parseInt(parts[1], 10) || 0;
          if (a <= b) {
            free = a;
            total = b;
          } else {
            total = a;
            free = b;
          }
          used = total - free;
        }
      }
      if (total === 0 && free === 0) {
        const out2 = execSync('wmic logicaldisk get Size,FreeSpace', { encoding: 'utf8' });
        const lines2 = out2.trim().split(/\r?\n/).filter((l) => l.trim());
        for (let i = 1; i < lines2.length; i++) {
          const p = lines2[i].trim().split(/\s+/).filter(Boolean);
          if (p.length >= 2) {
            const a = parseInt(p[0], 10) || 0;
            const b = parseInt(p[1], 10) || 0;
            if (a <= b) {
              free += a;
              total += b;
            } else {
              total += a;
              free += b;
            }
          }
        }
        used = total - free;
      }
    } catch {
      total = 0;
      used = 0;
      free = 0;
    }
  } else {
    try {
      const { execSync } = require('child_process');
      const out = execSync(`df -k "${dirPath}"`, { encoding: 'utf8' });
      const lines = out.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        total = parseInt(parts[1], 10) * 1024;
        used = parseInt(parts[2], 10) * 1024;
        free = parseInt(parts[3], 10) * 1024;
      }
    } catch {
      total = 0;
      used = 0;
      free = 0;
    }
  }

  const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0;
  const warning = usagePercent >= WARN_THRESHOLD_PERCENT;

  return {
    total,
    used,
    free,
    usagePercent,
    warning,
  };
}

module.exports = { getDiskUsage, WARN_THRESHOLD_PERCENT };
