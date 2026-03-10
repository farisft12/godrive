/**
 * Email notifications for payments. Uses nodemailer if SMTP is configured.
 * Set in .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM (e.g. GoDrive <noreply@godrive.com>)
 */
let transporter = null;

function init() {
  try {
    const nodemailer = require('nodemailer');
    const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
    const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD;
    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  } catch (_) {
    // nodemailer not installed or config missing
  }
}

init();

function getFrom() {
  return process.env.MAIL_FROM || process.env.SMTP_FROM || 'GoDrive <noreply@godrive.com>';
}

function send(to, subject, html) {
  if (!transporter) return Promise.resolve();
  return transporter.sendMail({
    from: getFrom(),
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  });
}

function sendPaymentReceived(payment) {
  const email = payment.email || payment.user_email;
  if (!email) return Promise.resolve();
  const amount = Number(payment.amount);
  const amountStr = amount.toLocaleString('id-ID');
  return send(
    email,
    'Bukti pembayaran diterima – GoDrive',
    `<p>Halo ${payment.name || 'Pengguna'},</p>
     <p>Bukti pembayaran untuk order <strong>${payment.order_id}</strong> telah kami terima.</p>
     <p>Nominal: <strong>Rp ${amountStr}</strong>.</p>
     <p>Kami akan memverifikasi dan memberitahu Anda setelah proses selesai.</p>
     <p>— Tim GoDrive</p>`
  );
}

function sendPaymentApproved(payment) {
  const email = payment.email || payment.user_email;
  if (!email) return Promise.resolve();
  const amount = Number(payment.amount);
  const amountStr = amount.toLocaleString('id-ID');
  return send(
    email,
    'Pembayaran Anda telah diverifikasi – GoDrive',
    `<p>Halo ${payment.name || payment.user_name || 'Pengguna'},</p>
     <p>Pembayaran Anda untuk order <strong>${payment.order_id}</strong> (Rp ${amountStr}) telah diverifikasi.</p>
     <p><strong>Penyimpanan GoDrive Anda telah ditingkatkan.</strong> Anda dapat memeriksa kuota baru di Pengaturan atau Dashboard.</p>
     <p>Terima kasih.</p>
     <p>— Tim GoDrive</p>`
  );
}

function sendPaymentRejected(payment) {
  const email = payment.email || payment.user_email;
  if (!email) return Promise.resolve();
  return send(
    email,
    'Pembayaran ditolak – GoDrive',
    `<p>Halo ${payment.name || payment.user_name || 'Pengguna'},</p>
     <p>Pembayaran untuk order <strong>${payment.order_id}</strong> tidak dapat kami verifikasi dan statusnya ditolak.</p>
     <p>Jika Anda sudah melakukan pembayaran, silakan unggah ulang bukti pembayaran yang valid dari halaman checkout atau hubungi kami.</p>
     <p>— Tim GoDrive</p>`
  );
}

module.exports = {
  send,
  sendPaymentReceived,
  sendPaymentApproved,
  sendPaymentRejected,
};
