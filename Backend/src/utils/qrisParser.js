/**
 * QRIS EMV TLV parser and modifier.
 * Converts static QRIS payload to dynamic and injects payment amount (Tag 54).
 * Only Tag 01 (POI 11→12) and Tag 54 (add/update amount) are changed; all other segments preserved.
 *
 * EMV TLV: Tag (2 digits) + Length (2 digits) + Value.
 * For QRIS, length = character count (not bytes). Parse and rebuild use character lengths.
 */

const { calculateCRC } = require('./crc16');

/**
 * Parse QRIS payload into TLV segments.
 * Length in payload is interpreted as character count; value is substring of that many characters.
 * @param {string} payload - Raw QRIS payload (may include CRC at end)
 * @returns {{ tag: string, length: number, value: string }[]}
 */
function parseTLV(payload) {
  const segments = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) break;
    const tag = payload.substring(i, i + 2);
    const lenStr = payload.substring(i + 2, i + 4);
    const length = parseInt(lenStr, 10);
    if (isNaN(length) || length < 0 || i + 4 + length > payload.length) break;
    const value = payload.substring(i + 4, i + 4 + length);
    segments.push({ tag, length, value });
    i += 4 + length;
  }
  return segments;
}

/**
 * Rebuild payload string from TLV segments (no CRC).
 * Length written = value.length (character count), per EMVCO.
 * @param {{ tag: string, length: number, value: string }[]} segments
 * @returns {string}
 */
function segmentsToString(segments) {
  const pad2 = (n) => String(n).padStart(2, '0');
  return segments.map((s) => s.tag + pad2(s.value.length) + s.value).join('');
}

/**
 * Convert static QRIS (Point of Initiation 11) to dynamic (12).
 * Tag 01 value "11" → "12".
 * @param {string} payload - Static QRIS payload
 * @returns {string} - Payload with POI set to dynamic (no CRC update here)
 */
function replaceStaticToDynamic(payload) {
  const segments = parseTLV(payload);
  for (const seg of segments) {
    if (seg.tag === '01' && seg.value === '11') {
      seg.value = '12';
      seg.length = 2;
      break;
    }
  }
  return segmentsToString(segments);
}

/**
 * Inject or replace Tag 54 (Transaction Amount) in the payload.
 * For IDR, amount must be integer (no decimal) per QRIS spec — e.g. 180247 not 180247.00.
 */
function injectAmount(payload, amount) {
  const amountStr = String(Math.round(Number(amount)));
  const segments = parseTLV(payload);
  const pad2 = (n) => String(n).padStart(2, '0');
  let found54 = false;
  for (const seg of segments) {
    if (seg.tag === '54') {
      seg.value = amountStr;
      seg.length = amountStr.length;
      found54 = true;
      break;
    }
  }
  if (!found54) {
    const idx53 = segments.findIndex((s) => s.tag === '53');
    const insertAt = idx53 >= 0 ? idx53 + 1 : segments.length;
    segments.splice(insertAt, 0, {
      tag: '54',
      length: amountStr.length,
      value: amountStr,
    });
  }
  return segmentsToString(segments);
}

/**
 * Rebuild full payload with valid CRC.
 * Strips existing CRC (last 6 chars: "6304" + 4 hex), recalculates, appends.
 * CRC input must be exact: payloadWithoutCrc + "6304" with no trim or extra chars.
 *
 * @param {string} payloadWithoutCrc - Payload string without 6304XXXX at end
 * @returns {string} - Full payload with 6304 + CRC
 */
function rebuildPayload(payloadWithoutCrc) {
  const crcInput = payloadWithoutCrc + '6304';
  const crc = calculateCRC(crcInput);
  return payloadWithoutCrc + '6304' + crc;
}

/**
 * Convert static QRIS to dynamic — exact logic from reference (Express + QRCode).
 * 1) Strip last 8 chars (6304 + 4 hex CRC)
 * 2) Replace 010211 → 010212 (POI static → dynamic)
 * 3) Insert Tag 54 after "5303360": 54 + pad2(amount.length) + amount
 * 4) Append 6304 + CRC16-CCITT (charCodeAt loop to match reference)
 *
 * @param {string} staticPayload - Full static QRIS string (including 6304XXXX at end)
 * @param {number} amount - Amount in IDR (integer)
 * @returns {string} - Dynamic QRIS payload with amount and new CRC
 */
function crc16CharCodeAt(str) {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function staticToDynamicSimple(staticPayload, amount) {
  const amountStr = String(Math.round(Number(amount)));
  if (!amountStr || amount <= 0) throw new Error('Amount must be greater than 0');

  let payload = staticPayload.replace(/010211/, '010212');
  payload = payload.substring(0, payload.length - 8);

  const amountField = '54' + String(amountStr.length).padStart(2, '0') + amountStr;
  payload = payload.replace('5303360', '5303360' + amountField);

  payload = payload + '6304';
  const crc = crc16CharCodeAt(payload);
  payload = payload + crc;

  return payload;
}

/**
 * Full pipeline: static payload → dynamic → inject amount → rebuild CRC.
 * Only modifies Tag 01 (11→12) and Tag 54 (add/update); all other segments preserved.
 * Use when STATIC_QRIS_PAYLOAD is set and you want a dynamic payload with amount.
 *
 * @param {string} staticPayload - Full static QRIS payload (including CRC)
 * @param {number} amount - Payment amount
 * @returns {string} - Dynamic QRIS payload with amount and new CRC
 */
function staticToDynamicWithAmount(staticPayload, amount) {
  const withoutCrc = staticPayload.replace(/6304[0-9A-Fa-f]{4}$/, '');
  const segments = parseTLV(withoutCrc);

  let poiUpdated = false;
  let has54 = false;
  let idx53 = -1;

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s.tag === '01' && s.value === '11') {
      s.value = '12';
      s.length = 2;
      poiUpdated = true;
    }
    if (s.tag === '53') idx53 = i;
    if (s.tag === '54') {
      s.value = String(Math.round(Number(amount)));
      s.length = s.value.length;
      has54 = true;
    }
  }
  if (!poiUpdated) {
    for (const s of segments) {
      if (s.tag === '01') {
        s.value = '12';
        s.length = 2;
        break;
      }
    }
  }
  if (!has54) {
    const amountStr = String(Math.round(Number(amount)));
    const insertAt = idx53 >= 0 ? idx53 + 1 : segments.length;
    segments.splice(insertAt, 0, { tag: '54', length: amountStr.length, value: amountStr });
  }

  const withoutCrcNew = segmentsToString(segments);
  return rebuildPayload(withoutCrcNew);
}

module.exports = {
  parseTLV,
  replaceStaticToDynamic,
  injectAmount,
  rebuildPayload,
  staticToDynamicSimple,
  segmentsToString,
  staticToDynamicWithAmount,
};
