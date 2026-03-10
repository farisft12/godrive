/**
 * CRC16-CCITT for QRIS (EMVCO / BI).
 * Used to compute the checksum at the end of the QRIS payload (Tag 63).
 *
 * Algorithm:
 * - Polynomial: 0x1021 (CCITT)
 * - Initial value: 0xFFFF
 * - Input: payload string as UTF-8 bytes (per QRIS spec)
 * - Output: 4-character uppercase hex (e.g. "A1B2")
 */

/**
 * Calculate CRC16-CCITT over the given payload string.
 * The payload should be the full string including "6304" before the CRC field.
 * Returns 4-character hex string (uppercase).
 *
 * @param {string} payload - Full payload string including "6304" (CRC placeholder)
 * @returns {string} - 4-char hex CRC, e.g. "A1B2"
 */
function calculateCRC(payload) {
  const buf = Buffer.from(payload, 'utf8');
  let crc = 0xffff;
  const poly = 0x1021;

  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i] << 8;
    for (let k = 0; k < 8; k++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ poly : crc << 1;
    }
  }
  crc &= 0xffff;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

module.exports = { calculateCRC };
