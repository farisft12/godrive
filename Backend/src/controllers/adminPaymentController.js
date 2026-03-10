const { pool } = require('../config/database');
const { PAYMENT_PROOFS } = require('../config/storage');
const path = require('path');
const fs = require('fs');
const paymentController = require('./paymentController');
const emailService = require('../services/emailService');

function isPaymentsTableMissing(err) {
  const msg = (err && err.message) ? String(err.message) : '';
  const code = err && err.code;
  return code === '42P01' || /relation "payments" does not exist/i.test(msg) || /table "payments" does not exist/i.test(msg);
}

function isPaymentsSchemaError(err) {
  const msg = (err && err.message) ? String(err.message) : '';
  const code = err && err.code;
  return code === '42703' || code === '42P01' || /column.*does not exist/i.test(msg) || /relation "payments" does not exist/i.test(msg) || /relation "storage_plans" does not exist/i.test(msg);
}

async function listPayments(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || '';

    let q = `SELECT p.id, p.order_id, p.user_id, p.plan_id, p.base_price, p.unique_code, p.amount, p.currency, p.billing_interval,
              p.expires_at, p.proof_image, p.payment_note, p.status, p.created_at, p.verified_at, p.admin_note,
              u.name AS user_name, u.email AS user_email
              FROM payments p
              JOIN users u ON p.user_id = u.id`;
    const params = [];
    if (status) {
      params.push(status);
      q += ` WHERE p.status = $${params.length}`;
    }
    q += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    let rows;
    try {
      const result = await pool.query(q, params);
      rows = result.rows;
    } catch (colErr) {
      if (isPaymentsSchemaError(colErr)) {
        const minQ = status
          ? `SELECT p.id, p.order_id, p.user_id, p.plan_id, p.amount, p.currency, p.billing_interval,
          p.proof_image, p.payment_note, p.status, p.created_at, p.verified_at,
          u.name AS user_name, u.email AS user_email
          FROM payments p JOIN users u ON p.user_id = u.id
          WHERE p.status = $1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`
          : `SELECT p.id, p.order_id, p.user_id, p.plan_id, p.amount, p.currency, p.billing_interval,
          p.proof_image, p.payment_note, p.status, p.created_at, p.verified_at,
          u.name AS user_name, u.email AS user_email
          FROM payments p JOIN users u ON p.user_id = u.id
          ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`;
        const minParams = status ? [status, limit, offset] : [limit, offset];
        const minResult = await pool.query(minQ, minParams);
        rows = minResult.rows.map((r) => ({
          ...r,
          base_price: null,
          unique_code: null,
          expires_at: null,
          admin_note: null,
        }));
      } else {
        throw colErr;
      }
    }

    const countQ = status ? 'SELECT COUNT(*)::int AS c FROM payments WHERE status = $1' : 'SELECT COUNT(*)::int AS c FROM payments';
    const countParams = status ? [status] : [];
    const countResult = await pool.query(countQ, countParams);
    const total = countResult.rows[0].c;

    const planIds = [...new Set(rows.map((r) => r.plan_id))];
    const plans = {};
    for (const planId of planIds) {
      try {
        const plan = await paymentController.getPlanById(planId);
        if (plan) plans[planId] = plan;
      } catch (_) {
        plans[planId] = { name: 'Unknown', storage_bytes: 0 };
      }
    }

    const payments = rows.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      user_id: r.user_id,
      user_name: r.user_name,
      user_email: r.user_email,
      plan_id: r.plan_id,
      plan: plans[r.plan_id] || { name: 'Unknown', storage_bytes: 0 },
      base_price: r.base_price != null ? Number(r.base_price) : null,
      unique_code: r.unique_code != null ? Number(r.unique_code) : null,
      amount: Number(r.amount),
      currency: r.currency,
      billing_interval: r.billing_interval,
      expires_at: r.expires_at,
      proof_image: r.proof_image,
      payment_note: r.payment_note,
      status: r.status,
      created_at: r.created_at,
      verified_at: r.verified_at,
      admin_note: r.admin_note || null,
    }));

    res.json({ payments, total });
  } catch (err) {
    if (isPaymentsTableMissing(err) || isPaymentsSchemaError(err)) {
      return res.json({ payments: [], total: 0 });
    }
    next(err);
  }
}

async function getPayment(req, res, next) {
  try {
    const id = req.params.id;
    const { rows } = await pool.query(
      `SELECT p.*, u.name AS user_name, u.email AS user_email
       FROM payments p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
    const r = rows[0];
    const plan = await paymentController.getPlanById(r.plan_id);
    res.json({
      payment: {
        id: r.id,
        order_id: r.order_id,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        plan_id: r.plan_id,
        plan: plan || { name: 'Unknown', storage_bytes: 0 },
        base_price: r.base_price != null ? Number(r.base_price) : null,
        unique_code: r.unique_code != null ? Number(r.unique_code) : null,
        amount: Number(r.amount),
        currency: r.currency,
        billing_interval: r.billing_interval,
        expires_at: r.expires_at,
        proof_image: r.proof_image,
        payment_note: r.payment_note,
        status: r.status,
        created_at: r.created_at,
        verified_at: r.verified_at,
        verified_by: r.verified_by,
        admin_note: r.admin_note || null,
      },
    });
  } catch (err) {
    if (isPaymentsTableMissing(err)) {
      return res.status(404).json({ error: 'Payments table not set up. Run database migration add_payments_table.sql' });
    }
    next(err);
  }
}

async function approvePayment(req, res, next) {
  try {
    const id = req.params.id;
    const adminId = req.user.id;

    const { rows } = await pool.query(
      `SELECT p.*, u.email AS user_email, u.name AS user_name, sp.storage_bytes
       FROM payments p
       JOIN users u ON p.user_id = u.id
       JOIN storage_plans sp ON p.plan_id = sp.id
       WHERE p.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
    const pay = rows[0];
    if (pay.status !== 'WAITING_VERIFICATION') {
      return res.status(400).json({ error: 'Only payments with status WAITING_VERIFICATION can be approved. Current: ' + pay.status });
    }
    const expired = pay.expires_at && new Date(pay.expires_at) < new Date();
    if (expired) {
      return res.status(400).json({ error: 'Order has expired. Expired orders cannot be approved.' });
    }

    await pool.query(
      'UPDATE users SET storage_quota = $1, updated_at = NOW() WHERE id = $2',
      [pay.storage_bytes, pay.user_id]
    );
    await pool.query(
      `UPDATE payments SET status = 'APPROVED', verified_at = NOW(), verified_by = $1 WHERE id = $2`,
      [adminId, id]
    );

    const paymentForEmail = {
      order_id: pay.order_id,
      amount: pay.amount,
      name: pay.user_name,
      email: pay.user_email,
    };
    emailService.sendPaymentApproved(paymentForEmail).catch(() => {});

    const { rows: updated } = await pool.query(
      `SELECT p.*, u.name AS user_name, u.email AS user_email
       FROM payments p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
      [id]
    );
    const r = updated[0];
    const plan = await paymentController.getPlanById(r.plan_id);
    res.json({
      payment: {
        id: r.id,
        order_id: r.order_id,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        plan_id: r.plan_id,
        plan: plan || {},
        base_price: r.base_price != null ? Number(r.base_price) : null,
        unique_code: r.unique_code != null ? Number(r.unique_code) : null,
        amount: Number(r.amount),
        currency: r.currency,
        billing_interval: r.billing_interval,
        proof_image: r.proof_image,
        payment_note: r.payment_note,
        status: r.status,
        created_at: r.created_at,
        verified_at: r.verified_at,
        verified_by: r.verified_by,
        admin_note: r.admin_note || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function rejectPayment(req, res, next) {
  try {
    const id = req.params.id;
    const adminNote = (req.body && req.body.admin_note) ? String(req.body.admin_note).trim() : null;

    const { rows } = await pool.query(
      `SELECT p.*, u.email AS user_email, u.name AS user_name FROM payments p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
    const pay = rows[0];
    if (pay.status !== 'WAITING_VERIFICATION') {
      return res.status(400).json({ error: 'Only payments with status WAITING_VERIFICATION can be rejected. Current: ' + pay.status });
    }

    await pool.query(
      "UPDATE payments SET status = 'REJECTED', admin_note = $1 WHERE id = $2",
      [adminNote || null, id]
    );

    const paymentForEmail = {
      order_id: pay.order_id,
      name: pay.user_name,
      email: pay.user_email,
    };
    emailService.sendPaymentRejected(paymentForEmail).catch(() => {});

    const { rows: updated } = await pool.query(
      `SELECT p.*, u.name AS user_name, u.email AS user_email
       FROM payments p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
      [id]
    );
    const r = updated[0];
    const plan = await paymentController.getPlanById(r.plan_id);
    res.json({
      payment: {
        id: r.id,
        order_id: r.order_id,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        plan_id: r.plan_id,
        plan: plan || {},
        base_price: r.base_price != null ? Number(r.base_price) : null,
        unique_code: r.unique_code != null ? Number(r.unique_code) : null,
        amount: Number(r.amount),
        currency: r.currency,
        billing_interval: r.billing_interval,
        proof_image: r.proof_image,
        payment_note: r.payment_note,
        status: r.status,
        created_at: r.created_at,
        verified_at: r.verified_at,
        verified_by: r.verified_by,
        admin_note: r.admin_note || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPaymentStats(req, res, next) {
  try {
    const totalRevenue = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::decimal AS total FROM payments WHERE status = 'APPROVED'`
    );
    const pending = await pool.query(`SELECT COUNT(*)::int AS c FROM payments WHERE status = 'PENDING'`);
    const waiting = await pool.query(`SELECT COUNT(*)::int AS c FROM payments WHERE status = 'WAITING_VERIFICATION'`);
    const approved = await pool.query(`SELECT COUNT(*)::int AS c FROM payments WHERE status = 'APPROVED'`);
    const rejected = await pool.query(`SELECT COUNT(*)::int AS c FROM payments WHERE status = 'REJECTED'`);
    const monthly = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::decimal AS total FROM payments
       WHERE status = 'APPROVED' AND created_at >= date_trunc('month', CURRENT_DATE)`
    );
    res.json({
      total_revenue: Number(totalRevenue.rows[0].total),
      pending_count: pending.rows[0].c,
      waiting_verification_count: waiting.rows[0].c,
      approved_count: approved.rows[0].c,
      rejected_count: rejected.rows[0].c,
      monthly_income: Number(monthly.rows[0].total),
    });
  } catch (err) {
    if (isPaymentsTableMissing(err) || isPaymentsSchemaError(err)) {
      return res.json({
        total_revenue: 0,
        pending_count: 0,
        waiting_verification_count: 0,
        approved_count: 0,
        rejected_count: 0,
        monthly_income: 0,
      });
    }
    next(err);
  }
}

function servePaymentProof(req, res, next) {
  const id = req.params.id;
  pool.query('SELECT proof_image FROM payments WHERE id = $1', [id])
    .then(({ rows }) => {
      if (!rows[0] || !rows[0].proof_image) return res.status(404).end();
      const filePath = path.join(PAYMENT_PROOFS, path.basename(rows[0].proof_image));
      if (!fs.existsSync(filePath)) return res.status(404).end();
      res.sendFile(path.resolve(filePath));
    })
    .catch(next);
}

module.exports = {
  listPayments,
  getPayment,
  approvePayment,
  rejectPayment,
  getPaymentStats,
  servePaymentProof,
};
