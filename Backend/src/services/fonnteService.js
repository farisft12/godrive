/**
 * Send WhatsApp message via Fonnte API.
 * Env: FOONTE_URL, FOONTE_TOKEN. Target: number with country code (e.g. 6288704464961).
 */
const FOONTE_URL = (process.env.FOONTE_URL || 'https://api.fonnte.com').replace(/\/$/, '');
const FOONTE_TOKEN = process.env.FOONTE_TOKEN;

function isConfigured() {
  return !!FOONTE_TOKEN;
}

/**
 * @param {string} target - WhatsApp number (e.g. 6288704464961 or 088704464961)
 * @param {string} message - Plain text message
 * @returns {Promise<{ status: boolean, detail?: string, reason?: string }>}
 */
async function sendMessage(target, message) {
  if (!FOONTE_TOKEN) {
    console.warn('Fonnte: FOONTE_TOKEN not set, skipping send');
    return { status: false, reason: 'Fonnte not configured' };
  }
  let num = String(target).replace(/\D/g, '');
  if (num.startsWith('0')) num = '62' + num.slice(1);
  if (!num.startsWith('62')) num = '62' + num;
  const url = FOONTE_URL + '/send';
  const body = new URLSearchParams();
  body.set('target', num);
  body.set('message', message);
  body.set('countryCode', '62');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: FOONTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const data = await res.json().catch(() => ({}));
    const status = data.status === true || data.Status === true;
    return {
      status,
      detail: data.detail,
      reason: data.reason,
    };
  } catch (err) {
    console.error('Fonnte send error:', err.message);
    return { status: false, reason: err.message };
  }
}

module.exports = { sendMessage, isConfigured };
