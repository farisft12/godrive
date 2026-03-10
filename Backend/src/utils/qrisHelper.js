/**
 * QRIS payload builder (EMVCO / BI).
 * Builds payload from scratch for reliable dynamic QR that scans without "tidak sah" / TH91.
 *
 * Spec (BI/EMVCO):
 * - Tag order: 00, 01, 26, 51, 52, 53, [54], 58, 59, 60, 62, 63.
 * - Tag 01: Point of Initiation — 11 = static, 12 = dynamic.
 * - Tag 26: Payload Format Indicator (e.g. ID.CO.QRIS.WWW).
 * - Tag 51: Acquirer / switching — ID 14 chars (e.g. ID.CO.QRIS.W) + NMID 15 chars. Must match acquirer.
 * - Tag 52: Merchant Category Code (e.g. 5411).
 * - Tag 53: Currency (360 = IDR).
 * - Tag 54: Transaction amount (optional for static). Integer only for IDR (no decimal), e.g. "180247".
 * - Tag 58: Country (ID).
 * - Tag 59: Merchant name (max 25 chars).
 * - Tag 60: Merchant city (max 15 chars).
 * - Tag 62: Additional data (e.g. sub-tag 07 = reference).
 * - Tag 63: CRC16-CCITT (4 hex chars). Input = payload + "6304" as UTF-8 bytes.
 *
 * Ref: https://blog.isan.eu.org/post/mencoba-memahami-qris
 */

function pad2(n) {
  const s = String(n);
  return s.length >= 2 ? s : '0' + s;
}

function crc16ccittBytes(str) {
  /* CRC16-CCITT: poly 0x1021, init 0xFFFF, over UTF-8 bytes of str (per QRIS spec). */
  const buf = Buffer.from(str, 'utf8');
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

/**
 * Build full QRIS payload. Order: 00, 01, 26, 51, 52, 53, [54], 58, 59, 60, 62, 63.
 * Length fields = character count (EMVCO).
 */
function buildPayload(opts) {
  const isStatic = opts.static === true;
  let nmid = (opts.nmid || 'ID1025453509719').trim();
  if (nmid.length !== 15) {
    if (nmid.length > 15) nmid = nmid.substring(0, 15);
    else nmid = nmid.padEnd(15, '0');
  }
  const name = (opts.merchantName || 'GODRIVE, TRANSPORTASI').substring(0, 25);
  const city = (opts.merchantCity || 'JAKARTA').substring(0, 15);
  const amount = Number(opts.amount) || 0;
  const ref = (opts.reference || '').replace(/[^A-Za-z0-9]/g, '').substring(0, 25) || 'ORDER';

  const guid = 'ID.CO.QRIS.WWW';       // 16 chars (tag 26)
  const guidSwitch = 'ID.CO.QRIS.WW';  // 14 chars (tag 51 — per spec & blog.isan)
  const umi = 'UMI';

  const t00 = '00' + pad2(2) + '01';
  const t01 = '01' + pad2(2) + (isStatic ? '11' : '12');

  const t26val = '00' + pad2(guid.length) + guid + '03' + pad2(umi.length) + umi;
  const t26 = '26' + pad2(t26val.length) + t26val;

  const t51val = '00' + pad2(guidSwitch.length) + guidSwitch + '02' + pad2(nmid.length) + nmid + '03' + pad2(umi.length) + umi;
  const t51 = '51' + pad2(t51val.length) + t51val;

  const t52 = '52' + pad2(4) + '5411';
  const t53 = '53' + pad2(3) + '360';

  let withoutCrc = t00 + t01 + t26 + t51 + t52 + t53;
  if (!isStatic && amount > 0) {
    const amountStr = String(Math.round(amount));  // Tag 54: integer only for IDR (QRIS spec)
    withoutCrc += '54' + pad2(amountStr.length) + amountStr;
  }
  withoutCrc += '58' + pad2(2) + 'ID';
  withoutCrc += '59' + pad2(name.length) + name;
  withoutCrc += '60' + pad2(city.length) + city;
  const t62ref = '07' + pad2(ref.length) + ref;
  withoutCrc += '62' + pad2(t62ref.length) + t62ref;

  const crcInput = withoutCrc + '6304';
  const crc = crc16ccittBytes(crcInput);
  return withoutCrc + '6304' + crc;
}

function buildDynamicPayload(opts) {
  return buildPayload({ ...opts, static: false });
}

function buildStaticPayload(opts) {
  return buildPayload({ ...opts, static: true, amount: 0 });
}

module.exports = { buildDynamicPayload, buildStaticPayload };
