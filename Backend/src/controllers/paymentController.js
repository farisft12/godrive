const { pool } = require('../config/database');
const { PAYMENT_PROOFS, ROOT } = require('../config/storage');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { buildDynamicPayload, buildStaticPayload } = require('../utils/qrisHelper');
const settingsHelper = require('../utils/settingsHelper');

let qrisDynamicGeneratorLib;
let qrisParser;
function getQrisDynamicGeneratorLib() {
  if (!qrisDynamicGeneratorLib) {
    try {
      qrisDynamicGeneratorLib = require('qris-dynamic-generator');
    } catch (e) {
      console.warn('qris-dynamic-generator not loaded:', e.message);
      return null;
    }
  }
  return qrisDynamicGeneratorLib;
}
function getQrisParser() {
  if (!qrisParser) {
    try {
      qrisParser = require('../utils/qrisParser');
    } catch (e) {
      console.warn('qrisParser not loaded:', e.message);
      return null;
    }
  }
  return qrisParser;
}

function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'GD-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function getPlanById(planId) {
  const { rows } = await pool.query(
    `SELECT id, name, storage_bytes, price_amount, price_currency,
            COALESCE(billing_interval, 'monthly') AS billing_interval,
            price_yearly, COALESCE(discount_percent, 0) AS discount_percent
     FROM storage_plans WHERE id = $1`,
    [planId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    storage_bytes: Number(r.storage_bytes),
    price_amount: Number(r.price_amount),
    price_currency: r.price_currency || 'IDR',
    billing_interval: r.billing_interval || 'monthly',
    price_yearly: r.price_yearly != null ? Number(r.price_yearly) : null,
    discount_percent: Number(r.discount_percent) || 0,
  };
}

async function createOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { plan_id, billing_interval } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

    const plan = await getPlanById(plan_id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const isYearly = billing_interval === 'yearly' && plan.price_yearly != null && plan.price_yearly > 0;
    const basePrice = isYearly ? plan.price_yearly : plan.price_amount;
    const totalAfterTax = basePrice * 1.11;
    const discountPercent = Number(plan.discount_percent) || 0;
    const grandTotal = totalAfterTax * (1 - discountPercent / 100);
    const uniqueCode = 0;
    const amount = Math.round(grandTotal);
    const interval = isYearly ? 'yearly' : 'monthly';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let orderId = null;
    let foundUnique = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateOrderId();
      const exists = await pool.query('SELECT 1 FROM payments WHERE order_id = $1', [candidate]);
      if (!exists.rows[0]) {
        orderId = candidate;
        foundUnique = true;
        break;
      }
    }
    if (!foundUnique || !orderId) {
      return res.status(503).json({ error: 'Could not generate unique order ID. Please try again.' });
    }

    const hasNew = await paymentsHasNewColumns();
    if (hasNew) {
      await pool.query(
        `INSERT INTO payments (order_id, user_id, plan_id, base_price, unique_code, amount, currency, billing_interval, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)`,
        [orderId, userId, plan.id, basePrice, uniqueCode, amount, plan.price_currency || 'IDR', interval, expiresAt]
      );
    } else {
      await pool.query(
        `INSERT INTO payments (order_id, user_id, plan_id, amount, currency, billing_interval, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
        [orderId, userId, plan.id, amount, plan.price_currency || 'IDR', interval]
      );
    }

    const rowFields = hasNew
      ? 'id, order_id, plan_id, base_price, unique_code, amount, currency, billing_interval, expires_at, status, created_at'
      : 'id, order_id, plan_id, amount, currency, billing_interval, status, created_at';
    const { rows } = await pool.query(
      `SELECT ${rowFields} FROM payments WHERE order_id = $1`,
      [orderId]
    );
    const row = rows[0];
    const payment = {
      id: row.id,
      order_id: row.order_id,
      plan_id: row.plan_id,
      plan: plan,
      base_price: row.base_price != null ? Number(row.base_price) : null,
      unique_code: row.unique_code != null ? Number(row.unique_code) : null,
      amount: Number(row.amount),
      currency: row.currency,
      billing_interval: row.billing_interval,
      expires_at: row.expires_at || null,
      status: row.status,
      created_at: row.created_at,
    };
    res.status(201).json({ payment, plan });
  } catch (err) {
    next(err);
  }
}

async function getOrderByOrderId(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    let hasNewColumns = false;
    try {
      hasNewColumns = await paymentsHasNewColumns();
    } catch (e) {
      hasNewColumns = false;
    }
    const selectFields = hasNewColumns
      ? `p.id, p.order_id, p.user_id, p.plan_id, p.base_price, p.unique_code, p.amount, p.currency, p.billing_interval,
         p.expires_at, p.proof_image, p.payment_note, p.status, p.created_at, p.verified_at`
      : `p.id, p.order_id, p.user_id, p.plan_id, p.amount, p.currency, p.billing_interval,
         p.proof_image, p.payment_note, p.status, p.created_at, p.verified_at`;
    let rows;
    try {
      const result = await pool.query(
        `SELECT ${selectFields}
         FROM payments p
         WHERE p.order_id = $1`,
        [orderId]
      );
      rows = result.rows;
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        return res.status(404).json({ error: 'Order not found' });
      }
      throw dbErr;
    }
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Not your order' });

    const r = rows[0];
    if (r.status === 'PENDING') {
      const createdAt = r.created_at ? new Date(r.created_at).getTime() : 0;
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (createdAt < thirtyMinutesAgo) {
        await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
        return res.status(404).json({ error: 'Order expired. Buat order baru dari halaman Pilihan Paket.' });
      }
    }

    const plan = await getPlanById(r.plan_id);
    const basePrice = r.base_price != null ? Number(r.base_price) : null;
    const uniqueCode = r.unique_code != null ? Number(r.unique_code) : null;
    const expiresAt = r.expires_at || null;
    const expired = expiresAt && new Date(expiresAt) < new Date();
    res.json({
      payment: {
        id: r.id,
        order_id: r.order_id,
        plan_id: r.plan_id,
        plan: plan,
        base_price: basePrice,
        unique_code: uniqueCode,
        amount: Number(r.amount),
        currency: r.currency,
        billing_interval: r.billing_interval || 'monthly',
        expires_at: expiresAt,
        is_expired: expired,
        proof_image: r.proof_image,
        payment_note: r.payment_note,
        status: r.status,
        created_at: r.created_at,
        verified_at: r.verified_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function paymentsHasNewColumns() {
  try {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'base_price'`
    );
    return rows.length > 0;
  } catch (_) {
    return false;
  }
}

async function uploadProof(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const note = (req.body && req.body.payment_note) ? String(req.body.payment_note).trim() : null;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Proof image is required' });

    const { rows } = await pool.query(
      'SELECT id, user_id, status, proof_image FROM payments WHERE order_id = $1',
      [orderId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Not your order' });
    if (rows[0].status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending orders can receive proof. Current status: ' + rows[0].status });
    }
    const hasExpiry = await paymentsHasNewColumns();
    if (hasExpiry) {
      const expResult = await pool.query('SELECT expires_at FROM payments WHERE order_id = $1', [orderId]);
      const expiresAt = expResult.rows[0]?.expires_at;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        return res.status(400).json({ error: 'Order has expired. Please create a new order.' });
      }
    }

    const relativePath = path.join('payment_proofs', file.filename);
    const proofDir = path.join(ROOT, 'payment_proofs');
    const oldFilePath = rows[0].proof_image ? path.join(proofDir, path.basename(rows[0].proof_image)) : null;
    if (oldFilePath && fs.existsSync(oldFilePath)) {
      try { fs.unlinkSync(oldFilePath); } catch (_) {}
    }

    await pool.query(
      `UPDATE payments SET proof_image = $1, payment_note = $2, status = 'WAITING_VERIFICATION' WHERE order_id = $3`,
      [relativePath, note || null, orderId]
    );

    const emailService = require('../services/emailService');
    const paymentRow = (await pool.query(
      `SELECT p.*, u.email, u.name FROM payments p JOIN users u ON p.user_id = u.id WHERE p.order_id = $1`,
      [orderId]
    )).rows[0];
    if (paymentRow && emailService.sendPaymentReceived) {
      emailService.sendPaymentReceived(paymentRow).catch(() => {});
    }

    const { rows: updated } = await pool.query(
      `SELECT id, order_id, plan_id, amount, currency, billing_interval, proof_image, payment_note, status, created_at
       FROM payments WHERE order_id = $1`,
      [orderId]
    );
    const r = updated[0];
    const plan = await getPlanById(r.plan_id);
    res.json({
      payment: {
        id: r.id,
        order_id: r.order_id,
        plan_id: r.plan_id,
        plan,
        amount: Number(r.amount),
        currency: r.currency,
        billing_interval: r.billing_interval,
        proof_image: r.proof_image,
        payment_note: r.payment_note,
        status: r.status,
        created_at: r.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listMyPayments(req, res, next) {
  try {
    const userId = req.user.id;

    // Hapus tagihan PENDING yang sudah lewat 30 menit (belum dibayar)
    await pool.query(
      `DELETE FROM payments
       WHERE user_id = $1 AND status = 'PENDING'
         AND created_at < NOW() - INTERVAL '30 minutes'`,
      [userId]
    );

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const hasNew = await paymentsHasNewColumns();
    const selectFields = hasNew
      ? `p.id, p.order_id, p.plan_id, p.base_price, p.unique_code, p.amount, p.currency, p.billing_interval, p.expires_at,
         p.proof_image, p.status, p.created_at`
      : `p.id, p.order_id, p.plan_id, p.amount, p.currency, p.billing_interval,
         p.proof_image, p.status, p.created_at`;

    const { rows } = await pool.query(
      `SELECT ${selectFields}
       FROM payments p
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const countResult = await pool.query('SELECT COUNT(*)::int AS c FROM payments WHERE user_id = $1', [userId]);
    const total = countResult.rows[0].c;

    const planIds = [...new Set(rows.map((r) => r.plan_id))];
    const plans = {};
    for (const planId of planIds) {
      const plan = await getPlanById(planId);
      if (plan) plans[planId] = plan;
    }

    const payments = rows.map((r) => {
      const expired = r.expires_at && new Date(r.expires_at) < new Date();
      return {
        id: r.id,
        order_id: r.order_id,
        plan_id: r.plan_id,
        plan: plans[r.plan_id] || { name: 'Unknown', storage_bytes: 0 },
        base_price: r.base_price != null ? Number(r.base_price) : null,
        unique_code: r.unique_code != null ? Number(r.unique_code) : null,
        amount: Number(r.amount),
        currency: r.currency,
        billing_interval: r.billing_interval,
        expires_at: r.expires_at || null,
        is_expired: expired,
        proof_image: r.proof_image,
        status: r.status,
        created_at: r.created_at,
      };
    });

    res.json({ payments, total });
  } catch (err) {
    next(err);
  }
}

function serveProofImage(req, res, next) {
  const userId = req.user.id;
  const { orderId } = req.params;
  pool.query('SELECT proof_image, user_id FROM payments WHERE order_id = $1', [orderId])
    .then(({ rows }) => {
      if (!rows[0] || rows[0].user_id !== userId) return res.status(404).end();
      if (!rows[0].proof_image) return res.status(404).end();
      const filePath = path.join(PAYMENT_PROOFS, path.basename(rows[0].proof_image));
      if (!fs.existsSync(filePath)) return res.status(404).end();
      res.sendFile(path.resolve(filePath));
    })
    .catch(next);
}

async function serveDynamicQris(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { rows } = await pool.query(
      'SELECT order_id, user_id, amount FROM payments WHERE order_id = $1',
      [orderId]
    );
    if (!rows[0] || rows[0].user_id !== userId) return res.status(404).end();
    const amount = Number(rows[0].amount);
    if (amount <= 0) return res.status(400).json({ error: 'Order amount is zero' });

    const nmid = (await settingsHelper.getSetting('qris_nmid')) || process.env.QRIS_NMID || 'CONFIGURE_QRIS_NMID';
    const merchantName = (await settingsHelper.getSetting('qris_merchant_name')) || process.env.QRIS_MERCHANT_NAME || 'CONFIGURE_MERCHANT_NAME';
    const merchantCity = (await settingsHelper.getSetting('qris_merchant_city')) || process.env.QRIS_MERCHANT_CITY || 'CONFIGURE_MERCHANT_CITY';
    const ref = String(rows[0].order_id || orderId).replace(/^GD-/, '');

    let payload;
    const staticPayloadEnv = process.env.STATIC_QRIS_PAYLOAD || process.env.STATIC_QRIS_PAYLOAD_STRING;
    const parser = getQrisParser();
    if (staticPayloadEnv && staticPayloadEnv.trim().length > 20) {
      const raw = staticPayloadEnv.trim();
      try {
        if (parser && typeof parser.staticToDynamicSimple === 'function') {
          payload = parser.staticToDynamicSimple(raw, Math.round(amount));
        } else {
          const Lib = getQrisDynamicGeneratorLib();
          if (Lib) {
            const QRIS = new Lib(raw);
            payload = QRIS.generate(Math.round(amount));
          } else {
            payload = buildDynamicPayload({ nmid, merchantName, merchantCity, amount, reference: ref });
          }
        }
      } catch (_) {
        payload = buildDynamicPayload({ nmid, merchantName, merchantCity, amount, reference: ref });
      }
    } else {
      payload = buildDynamicPayload({ nmid, merchantName, merchantCity, amount, reference: ref });
    }

    const buffer = await QRCode.toBuffer(payload, { type: 'png', margin: 2, width: 280 });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'private, no-cache');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Generate dynamic QRIS for an order.
 * When STATIC_QRIS_PAYLOAD is set: use staticToDynamicSimple (our CRC16-CCITT) first, then library/parser fallback.
 * POST /api/payments/generate-qris body: { orderId, amount? } — amount from DB if omitted.
 */
async function generateQris(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderId, amount: bodyAmount } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const { rows } = await pool.query(
      'SELECT order_id, user_id, amount FROM payments WHERE order_id = $1',
      [orderId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Not your order' });

    const amount = bodyAmount != null ? Number(bodyAmount) : Number(rows[0].amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const nmid = (await settingsHelper.getSetting('qris_nmid')) || process.env.QRIS_NMID || 'CONFIGURE_QRIS_NMID';
    const merchantName = (await settingsHelper.getSetting('qris_merchant_name')) || process.env.QRIS_MERCHANT_NAME || 'CONFIGURE_MERCHANT_NAME';
    const merchantCity = (await settingsHelper.getSetting('qris_merchant_city')) || process.env.QRIS_MERCHANT_CITY || 'CONFIGURE_MERCHANT_CITY';
    const ref = String(rows[0].order_id || orderId).replace(/^GD-/, '');

    let payload;
    const staticPayloadEnv = process.env.STATIC_QRIS_PAYLOAD || process.env.STATIC_QRIS_PAYLOAD_STRING;
    const parser = getQrisParser();
    if (staticPayloadEnv && staticPayloadEnv.trim().length > 20) {
      const raw = staticPayloadEnv.trim();
      try {
        if (parser && typeof parser.staticToDynamicSimple === 'function') {
          payload = parser.staticToDynamicSimple(raw, Math.round(amount));
        } else {
          const Lib = getQrisDynamicGeneratorLib();
          if (Lib) {
            const QRIS = new Lib(raw);
            payload = QRIS.generate(Math.round(amount));
          } else {
            payload = buildDynamicPayload({ nmid, merchantName, merchantCity, amount, reference: ref });
          }
        }
      } catch (e) {
        if (parser && typeof parser.staticToDynamicWithAmount === 'function') {
          try {
            payload = parser.staticToDynamicWithAmount(raw, amount);
          } catch (_) {
            payload = buildDynamicPayload({ nmid, merchantName, merchantCity, amount, reference: ref });
          }
        } else {
          payload = buildDynamicPayload({ nmid, merchantName, merchantCity, amount, reference: ref });
        }
      }
    } else {
      payload = buildDynamicPayload({ nmid, merchantName, merchantCity, amount, reference: ref });
    }

    const buffer = await QRCode.toBuffer(payload, { type: 'png', margin: 2, width: 280 });
    const qrImageBase64 = buffer.toString('base64');

    res.json({
      success: true,
      amount,
      orderId,
      payload,
      qrImage: `data:image/png;base64,${qrImageBase64}`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getOrderByOrderId,
  uploadProof,
  listMyPayments,
  serveProofImage,
  serveDynamicQris,
  generateQris,
  getPlanById,
};
