import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';

function formatPrice(amount, currency = 'IDR') {
  if (currency === 'IDR' || !currency) {
    return `Rp ${Number(amount).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${Number(amount).toLocaleString()}`;
}

/** Format nomor pesanan seperti template: GDV.2026-0308-7712-44590 */
function formatOrderNumber(orderId, createdAt) {
  if (!orderId) return '—';
  const d = createdAt ? new Date(createdAt) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const suffix = orderId.replace(/^GD-?/i, '').toUpperCase();
  return `GDV.${y}-${m}${day}-${suffix}`;
}

function formatOrderDate(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())} WITA`;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#eeeeee',
    paddingVertical: 20,
    paddingHorizontal: 48,
    fontFamily: 'Helvetica',
  },
  card: {
    width: 500,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 40,
    paddingBottom: 10,
  },
  brand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    margin: 0,
  },
  intro: {
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  introText: {
    fontSize: 14,
    color: '#3c4043',
    lineHeight: 1.5,
    margin: 0,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
    marginHorizontal: 40,
  },
  meta: {
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: '#5f6368',
  },
  metaLabelBold: {
    fontFamily: 'Helvetica-Bold',
  },
  metaValue: {
    fontSize: 13,
    color: '#5f6368',
    textAlign: 'right',
  },
  itemsSection: {
    paddingHorizontal: 40,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
    paddingVertical: 10,
    marginBottom: 0,
  },
  tableHeaderItem: {
    fontSize: 14,
    color: '#3c4043',
    fontFamily: 'Helvetica-Bold',
  },
  tableHeaderPrice: {
    fontSize: 14,
    color: '#3c4043',
    fontFamily: 'Helvetica-Bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    paddingBottom: 5,
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 14,
    color: '#3c4043',
    fontFamily: 'Helvetica-Bold',
  },
  itemSub: {
    fontSize: 12,
    color: '#70757a',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#3c4043',
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  taxLabel: {
    fontSize: 14,
    color: '#70757a',
  },
  taxValue: {
    fontSize: 14,
    color: '#3c4043',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e8eaed',
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 0,
  },
  totalLabel: {
    fontSize: 16,
    color: '#3c4043',
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    fontSize: 16,
    color: '#3c4043',
    fontFamily: 'Helvetica-Bold',
  },
  paymentSection: {
    paddingHorizontal: 40,
    paddingTop: 10,
    paddingBottom: 30,
  },
  paymentText: {
    fontSize: 12,
    color: '#70757a',
    marginBottom: 0,
  },
  paymentTextBold: {
    fontFamily: 'Helvetica-Bold',
  },
  authText: {
    fontSize: 12,
    color: '#70757a',
    lineHeight: 1.5,
    marginTop: 15,
  },
  footer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 30,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  footerHelp: {
    fontSize: 12,
    color: '#70757a',
    marginBottom: 10,
  },
  footerLink: {
    color: '#3b82f6',
  },
  footerCopy: {
    fontSize: 11,
    color: '#bdc1c6',
    lineHeight: 1.5,
    textAlign: 'center',
  },
});

export default function InvoicePDF({ payment, customerName = '', customerEmail = '' }) {
  const amountTotal = Number(payment?.amount) || 0;
  const currency = payment?.currency || 'IDR';
  const planName = payment?.plan?.name || 'Paket Penyimpanan';
  const orderId = payment?.order_id || '—';
  const createdAt = payment?.created_at;
  const orderDateStr = formatOrderDate(createdAt);
  const orderNumberDisplay = formatOrderNumber(orderId, createdAt);
  const email = customerEmail || '—';
  const interval = String(payment?.billing_interval ?? payment?.billingInterval ?? 'monthly').toLowerCase();
  const isYearly = interval === 'yearly';
  const periodLabel = isYearly ? '/tahun' : '/bln';
  const formatWithPeriod = (amt) => `${formatPrice(amt, currency)}${periodLabel}`;

  // Pajak 11%: total = subtotal * 1.11 => subtotal = total / 1.11
  const subtotal = Math.round(amountTotal / 1.11);
  const taxAmount = amountTotal - subtotal;

  // Nama item seperti template:
  const itemLabel = planName && /2\s*tb|2tb/i.test(planName)
    ? '2 TB Personal Drive (GoDrive)'
    : planName && /6\s*tb|6tb/i.test(planName)
      ? '6 TB Personal Drive (GoDrive)'
      : `${planName} (GoDrive)`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.brand}>GoDrive</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.introText}>
              Terima kasih.{'\n\n'}
              Anda telah melakukan pembelian langganan dari <Text style={{ fontFamily: 'Helvetica-Bold' }}>GoDrive Cloud Storage</Text> di aplikasi GoDrive. Anda akan otomatis ditagih sebesar <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatWithPeriod(amountTotal)}</Text>, kecuali jika langganan dibatalkan. Anda dapat membatalkannya kapan saja di pengaturan akun.
            </Text>
          </View>

          <View style={styles.hr} />

          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, styles.metaLabelBold]}>Nomor pesanan:</Text>
              <Text style={styles.metaValue}>{orderNumberDisplay}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, styles.metaLabelBold]}>Tanggal pesanan:</Text>
              <Text style={styles.metaValue}>{orderDateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, styles.metaLabelBold]}>Akun Anda:</Text>
              <Text style={styles.metaValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.itemsSection}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderItem}>Item</Text>
              <Text style={styles.tableHeaderPrice}>Harga</Text>
            </View>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{itemLabel}</Text>
                <Text style={styles.itemSub}>Memperpanjang langganan secara otomatis</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(subtotal, currency)}</Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>Pajak (11%)</Text>
              <Text style={styles.taxValue}>{formatPrice(taxAmount, currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatWithPeriod(amountTotal)}</Text>
            </View>
          </View>

          <View style={styles.paymentSection}>
            <Text style={styles.paymentText}>
              Metode pembayaran: <Text style={styles.paymentTextBold}>QRIS (Dana/GoPay)</Text>
            </Text>
            <Text style={styles.authText}>
              Dengan berlangganan, Anda memberi kami otorisasi untuk menagih biaya langganan kepada Anda secara otomatis sampai langganan tersebut dibatalkan.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerHelp}>
              Ada pertanyaan? Kunjungi Pusat Bantuan GoDrive.
            </Text>
            <Text style={styles.footerCopy}>
              © 2026 GoDrive Indonesia | Banjarmasin, Kalimantan Selatan.{'\n'}
              Harap jangan balas email ini.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
