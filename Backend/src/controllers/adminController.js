const { pool } = require('../config/database');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { getDiskUsage } = require('../utils/diskHelper');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function getStats(req, res, next) {
  try {
    const usersCount = await pool.query('SELECT COUNT(*)::int AS c FROM users');
    const filesCount = await pool.query('SELECT COUNT(*)::int AS c FROM files WHERE trashed_at IS NULL');
    const storageResult = await pool.query('SELECT COALESCE(SUM(storage_used), 0)::bigint AS total FROM users');
    let sharesCount = 0;
    try {
      const shares = await pool.query(
        `SELECT COUNT(*)::int AS c FROM shares WHERE (expires_at IS NULL OR expires_at > NOW())`
      );
      sharesCount = shares.rows[0].c;
    } catch (_) {}

    res.json({
      total_users: usersCount.rows[0].c,
      total_files: filesCount.rows[0].c,
      total_storage_used: Number(storageResult.rows[0].total),
      active_shared_links: sharesCount,
    });
  } catch (err) {
    next(err);
  }
}

async function getStorageAnalytics(req, res, next) {
  try {
    const usage = await getDiskUsage();
    const topUsers = await pool.query(
      `SELECT id, name, email, storage_used, storage_quota
       FROM users ORDER BY storage_used DESC NULLS LAST LIMIT 10`
    );
    const largestFiles = await pool.query(
      `SELECT f.id, f.original_name, f.size_bytes, f.user_id, f.created_at, u.name AS owner_name
       FROM files f JOIN users u ON f.user_id = u.id
       WHERE f.trashed_at IS NULL ORDER BY f.size_bytes DESC LIMIT 20`
    );

    res.json({
      disk: {
        total: usage.total,
        used: usage.used,
        free: usage.free,
        usage_percent: usage.usagePercent,
        warning: usage.warning,
      },
      top_users_by_storage: topUsers.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        storage_used: Number(r.storage_used),
        storage_quota: Number(r.storage_quota),
      })),
      largest_files: largestFiles.rows.map((r) => ({
        id: r.id,
        original_name: r.original_name,
        size_bytes: Number(r.size_bytes),
        user_id: r.user_id,
        owner_name: r.owner_name,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const search = req.query.search || '';
    const { users, total } = await User.listForAdmin({ limit, offset, search });
    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        storage_quota: Number(u.storage_quota),
        storage_used: Number(u.storage_used),
        role: u.role || 'user',
        created_at: u.created_at,
      })),
      total,
    });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const fileCount = await pool.query(
      'SELECT COUNT(*)::int AS c FROM files WHERE user_id = $1 AND trashed_at IS NULL',
      [req.params.id]
    );
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      storage_quota: Number(user.storage_quota),
      storage_used: Number(user.storage_used),
      role: user.role || 'user',
      created_at: user.created_at,
      updated_at: user.updated_at,
      file_count: fileCount.rows[0].c,
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { storage_quota, role, password } = req.body || {};
    if (storage_quota != null) {
      await User.updateQuota(id, Number(storage_quota));
    }
    if (role != null && ['user', 'admin', 'suspended'].includes(role)) {
      await User.setRole(id, role);
    }
    if (password != null && String(password).length >= 8) {
      const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
      await pool.query('UPDATE users SET password = $2 WHERE id = $1', [id, hash]);
    }

    const updated = await User.findById(id);
    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      storage_quota: Number(updated.storage_quota),
      storage_used: Number(updated.storage_used),
      role: updated.role || 'user',
    });
  } catch (err) {
    next(err);
  }
}

const dedupService = require('../services/dedupService');
const File = require('../models/File');

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { rows: files } = await pool.query(
      'SELECT id, blob_id FROM files WHERE user_id = $1',
      [id]
    );
    for (const f of files) {
      await dedupService.releaseBlob(f.blob_id);
      await File.remove(f.id, id);
    }
    await pool.query('DELETE FROM folders WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM shares WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM activities WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, storage_quota } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password required' });
    }
    const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const created = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash: hash,
      storageQuota: storage_quota != null ? Number(storage_quota) : 1073741824,
    });
    const withRole = await User.findById(created.id);
    res.status(201).json({
      id: withRole.id,
      name: withRole.name,
      email: withRole.email,
      storage_quota: Number(withRole.storage_quota),
      storage_used: Number(withRole.storage_used),
      role: withRole.role || 'user',
      created_at: withRole.created_at,
    });
  } catch (err) {
    if (err.statusCode === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
}

async function listShares(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    let rows;
    try {
      const result = await pool.query(
        `SELECT s.id, s.token, s.file_id, s.folder_id, s.expires_at, s.created_at,
                u.name AS owner_name, u.email AS owner_email,
                f.original_name AS file_name
         FROM shares s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN files f ON s.file_id = f.id
         WHERE (s.expires_at IS NULL OR s.expires_at > NOW())
         ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      rows = result.rows;
    } catch (queryErr) {
      if (queryErr.code === '42703' && (queryErr.message || '').includes('folder_id')) {
        const result = await pool.query(
          `SELECT s.id, s.token, s.file_id, s.expires_at, s.created_at,
                  u.name AS owner_name, u.email AS owner_email,
                  f.original_name AS file_name
           FROM shares s
           JOIN users u ON s.user_id = u.id
           LEFT JOIN files f ON s.file_id = f.id
           WHERE (s.expires_at IS NULL OR s.expires_at > NOW())
           ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        rows = result.rows.map((r) => ({ ...r, folder_id: null }));
      } else {
        throw queryErr;
      }
    }
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int AS c FROM shares WHERE (expires_at IS NULL OR expires_at > NOW())'
    );
    res.json({ shares: rows, total: countRows[0].c });
  } catch (err) {
    next(err);
  }
}

async function listLogs(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const action = req.query.action || '';
    const userId = req.query.user_id || '';
    const rows = await Activity.findAllForAdmin({ limit, offset, action, userId });
    res.json({ logs: rows });
  } catch (err) {
    next(err);
  }
}

async function getServerHealth(req, res, next) {
  try {
    const os = require('os');
    const usage = await getDiskUsage();
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    res.json({
      cpu: { count: cpus.length, load_avg: os.loadavg() },
      memory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        usage_percent: totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 100) : 0,
      },
      disk: {
        total: usage.total,
        used: usage.used,
        free: usage.free,
        usage_percent: usage.usagePercent,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPlans(req, res, next) {
  try {
    const plans = await fetchPlansFromDb();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
}

async function fetchPlansFromDb() {
  try {
    let rows;
    try {
      const result = await pool.query(
        `SELECT id, name, storage_bytes, price_amount, price_currency, sort_order,
                COALESCE(billing_interval, 'monthly') AS billing_interval,
                price_yearly, COALESCE(discount_percent, 0) AS discount_percent
         FROM storage_plans
         WHERE (deleted_at IS NULL)
         ORDER BY sort_order ASC, storage_bytes ASC`
      );
      rows = result.rows;
    } catch (queryErr) {
      if (queryErr.code === '42703' && (queryErr.message || '').includes('deleted_at')) {
        try {
          const result = await pool.query(
            `SELECT id, name, storage_bytes, price_amount, price_currency, sort_order,
                    COALESCE(billing_interval, 'monthly') AS billing_interval,
                    price_yearly, COALESCE(discount_percent, 0) AS discount_percent
             FROM storage_plans
             ORDER BY sort_order ASC, storage_bytes ASC`
          );
          rows = result.rows;
        } catch (noDeletedAtErr) {
          if (noDeletedAtErr.code === '42703') {
            const result = await pool.query(
              `SELECT id, name, storage_bytes, price_amount, price_currency, sort_order
               FROM storage_plans ORDER BY sort_order ASC, storage_bytes ASC`
            );
            rows = result.rows.map((r) => ({
              ...r,
              billing_interval: 'monthly',
              price_yearly: null,
              discount_percent: 0,
            }));
          } else {
            throw noDeletedAtErr;
          }
        }
      } else {
        throw queryErr;
      }
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      storage_bytes: Number(r.storage_bytes),
      price_amount: Number(r.price_amount),
      price_currency: r.price_currency || 'IDR',
      sort_order: r.sort_order,
      billing_interval: r.billing_interval || 'monthly',
      price_yearly: r.price_yearly != null ? Number(r.price_yearly) : null,
      discount_percent: Number(r.discount_percent) || 0,
    }));
  } catch (err) {
    console.error('fetchPlansFromDb:', err.message);
    return [];
  }
}

async function updatePlan(req, res, next) {
  try {
    const { id } = req.params;
    const { name, storage_bytes, price_amount, price_currency, billing_interval, price_yearly, discount_percent } = req.body;
    const updates = [];
    const params = [];
    let i = 1;
    if (name !== undefined) {
      updates.push(`name = $${i++}`);
      params.push(String(name).trim());
    }
    if (storage_bytes !== undefined) {
      updates.push(`storage_bytes = $${i++}`);
      params.push(BigInt(storage_bytes));
    }
    if (price_amount !== undefined) {
      updates.push(`price_amount = $${i++}`);
      params.push(parseFloat(price_amount));
    }
    if (price_currency !== undefined) {
      updates.push(`price_currency = $${i++}`);
      params.push(String(price_currency).trim());
    }
    if (billing_interval !== undefined) {
      updates.push(`billing_interval = $${i++}`);
      params.push(billing_interval === 'yearly' ? 'yearly' : 'monthly');
    }
    if (price_yearly !== undefined) {
      updates.push(`price_yearly = $${i++}`);
      params.push(price_yearly === null || price_yearly === '' ? null : parseFloat(price_yearly));
    }
    if (discount_percent !== undefined) {
      updates.push(`discount_percent = $${i++}`);
      params.push(parseInt(discount_percent, 10) || 0);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE storage_plans SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, name, storage_bytes, price_amount, price_currency, sort_order, billing_interval, price_yearly, discount_percent`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const r = rows[0];
    await Activity.log({
      userId: req.user.id,
      action: 'admin_plan_update',
      resourceType: 'storage_plan',
      resourceId: r.id,
      details: req.body || {},
    });
    res.json({
      plan: {
        id: r.id,
        name: r.name,
        storage_bytes: Number(r.storage_bytes),
        price_amount: Number(r.price_amount),
        price_currency: r.price_currency,
        sort_order: r.sort_order,
        billing_interval: r.billing_interval || 'monthly',
        price_yearly: r.price_yearly != null ? Number(r.price_yearly) : null,
        discount_percent: Number(r.discount_percent) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function createPlan(req, res, next) {
  try {
    const { name, storage_bytes, price_amount, price_currency, sort_order, billing_interval, price_yearly, discount_percent } = req.body;
    if (!name || storage_bytes === undefined) return res.status(400).json({ error: 'name and storage_bytes required' });
    const { rows } = await pool.query(
      `INSERT INTO storage_plans (name, storage_bytes, price_amount, price_currency, sort_order, billing_interval, price_yearly, discount_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, storage_bytes, price_amount, price_currency, sort_order, billing_interval, price_yearly, discount_percent`,
      [
        String(name).trim(),
        BigInt(storage_bytes),
        price_amount != null ? parseFloat(price_amount) : 0,
        price_currency || 'IDR',
        sort_order != null ? parseInt(sort_order, 10) : 0,
        billing_interval === 'yearly' ? 'yearly' : 'monthly',
        price_yearly != null && price_yearly !== '' ? parseFloat(price_yearly) : null,
        discount_percent != null ? parseInt(discount_percent, 10) || 0 : 0,
      ]
    );
    const r = rows[0];
    await Activity.log({
      userId: req.user.id,
      action: 'admin_plan_create',
      resourceType: 'storage_plan',
      resourceId: r.id,
      details: req.body || {},
    });
    res.status(201).json({
      plan: {
        id: r.id,
        name: r.name,
        storage_bytes: Number(r.storage_bytes),
        price_amount: Number(r.price_amount),
        price_currency: r.price_currency,
        sort_order: r.sort_order,
        billing_interval: r.billing_interval || 'monthly',
        price_yearly: r.price_yearly != null ? Number(r.price_yearly) : null,
        discount_percent: Number(r.discount_percent) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function deletePlan(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE storage_plans SET deleted_at = NOW() WHERE id = $1 AND (deleted_at IS NULL) RETURNING id',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan not found' });
    await Activity.log({
      userId: req.user.id,
      action: 'admin_plan_delete',
      resourceType: 'storage_plan',
      resourceId: rows[0].id,
      details: {},
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    const settingsHelper = require('../utils/settingsHelper');
    const maxUploadMb = (await settingsHelper.getSetting('max_upload_mb')) || process.env.MAX_UPLOAD_MB || 500;
    const trashRetentionDays = (await settingsHelper.getSetting('trash_retention_days')) || process.env.TRASH_RETENTION_DAYS || 30;
    const paymentEnabled = (await settingsHelper.getSetting('payment_enabled'));
    const paymentGateway = (await settingsHelper.getSetting('payment_gateway')) || 'manual';
    const paymentInstructions = (await settingsHelper.getSetting('payment_instructions')) || '';
    const qrisNmid = (await settingsHelper.getSetting('qris_nmid')) || '';
    const qrisMerchantName = (await settingsHelper.getSetting('qris_merchant_name')) || '';
    const qrisMerchantCity = (await settingsHelper.getSetting('qris_merchant_city')) || '';
    const qrisMode = (await settingsHelper.getSetting('qris_mode')) || 'static';
    res.json({
      max_upload_mb: parseInt(String(maxUploadMb), 10) || 500,
      default_storage_bytes: 1073741824,
      trash_retention_days: parseInt(String(trashRetentionDays), 10) || 30,
      payment_enabled: paymentEnabled !== 'false' && paymentEnabled !== '0',
      payment_gateway: paymentGateway,
      payment_instructions: paymentInstructions,
      qris_nmid: qrisNmid,
      qris_merchant_name: qrisMerchantName,
      qris_merchant_city: qrisMerchantCity,
      qris_mode: qrisMode === 'static' ? 'static' : 'dynamic',
    });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settingsHelper = require('../utils/settingsHelper');
    const { max_upload_mb, trash_retention_days, payment_enabled, payment_gateway, payment_instructions, qris_nmid, qris_merchant_name, qris_merchant_city, qris_mode } = req.body || {};
    if (max_upload_mb !== undefined) {
      const mb = Math.min(5000, Math.max(1, parseInt(String(max_upload_mb), 10) || 500));
      await settingsHelper.setSetting('max_upload_mb', mb);
    }
    if (trash_retention_days !== undefined) {
      const days = Math.min(3650, Math.max(1, parseInt(String(trash_retention_days), 10) || 30));
      await settingsHelper.setSetting('trash_retention_days', days);
    }
    if (payment_enabled !== undefined) {
      await settingsHelper.setSetting('payment_enabled', payment_enabled ? 'true' : 'false');
    }
    if (payment_gateway !== undefined) {
      await settingsHelper.setSetting('payment_gateway', String(payment_gateway).trim() || 'manual');
    }
    if (payment_instructions !== undefined) {
      await settingsHelper.setSetting('payment_instructions', String(payment_instructions));
    }
    if (qris_nmid !== undefined) await settingsHelper.setSetting('qris_nmid', String(qris_nmid).trim());
    if (qris_merchant_name !== undefined) await settingsHelper.setSetting('qris_merchant_name', String(qris_merchant_name).trim());
    if (qris_merchant_city !== undefined) await settingsHelper.setSetting('qris_merchant_city', String(qris_merchant_city).trim());
    if (qris_mode !== undefined) await settingsHelper.setSetting('qris_mode', qris_mode === 'static' ? 'static' : 'dynamic');
    const maxUploadMb = (await settingsHelper.getSetting('max_upload_mb')) || process.env.MAX_UPLOAD_MB || 500;
    const trashRetentionDays = (await settingsHelper.getSetting('trash_retention_days')) || process.env.TRASH_RETENTION_DAYS || 30;
    const paymentEnabled = (await settingsHelper.getSetting('payment_enabled'));
    const paymentGateway = (await settingsHelper.getSetting('payment_gateway')) || 'manual';
    const paymentInstructions = (await settingsHelper.getSetting('payment_instructions')) || '';
    const qrisNmid = (await settingsHelper.getSetting('qris_nmid')) || '';
    const qrisMerchantName = (await settingsHelper.getSetting('qris_merchant_name')) || '';
    const qrisMerchantCity = (await settingsHelper.getSetting('qris_merchant_city')) || '';
    const qrisMode = (await settingsHelper.getSetting('qris_mode')) || 'static';
    await Activity.log({
      userId: req.user.id,
      action: 'admin_settings_update',
      resourceType: 'settings',
      resourceId: null,
      details: req.body || {},
    });
    res.json({
      max_upload_mb: parseInt(String(maxUploadMb), 10) || 500,
      default_storage_bytes: 1073741824,
      trash_retention_days: parseInt(String(trashRetentionDays), 10) || 30,
      payment_enabled: paymentEnabled !== 'false' && paymentEnabled !== '0',
      payment_gateway: paymentGateway,
      payment_instructions: paymentInstructions,
      qris_nmid: qrisNmid,
      qris_merchant_name: qrisMerchantName,
      qris_merchant_city: qrisMerchantCity,
      qris_mode: qrisMode === 'static' ? 'static' : 'dynamic',
    });
  } catch (err) {
    next(err);
  }
}

async function listFiles(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const userId = req.query.user_id || '';
    const folderId = req.query.folder_id || '';

    let q = `SELECT f.id, f.original_name, f.mime_type, f.size_bytes, f.folder_id, f.created_at, f.updated_at, u.name AS owner_name, u.email AS owner_email
             FROM files f JOIN users u ON f.user_id = u.id WHERE f.trashed_at IS NULL`;
    const params = [];
    if (userId) {
      params.push(userId);
      q += ` AND f.user_id = $${params.length}`;
    }
    if (folderId) {
      params.push(folderId);
      q += ` AND f.folder_id = $${params.length}`;
    }
    params.push(limit, offset);
    q += ` ORDER BY f.updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const { rows } = await pool.query(q, params);
    res.json({ files: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  getStorageAnalytics,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  createUser,
  listShares,
  listLogs,
  getServerHealth,
  getPlans,
  fetchPlansFromDb,
  updatePlan,
  createPlan,
  deletePlan,
  getSettings,
  updateSettings,
  listFiles,
};
