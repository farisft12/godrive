require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ensureDirs } = require('./config/storage');
const { errorMiddleware } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const shareRoutes = require('./routes/shareRoutes');
const searchRoutes = require('./routes/searchRoutes');
const systemRoutes = require('./routes/systemRoutes');
const streamRoutes = require('./routes/streamRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

ensureDirs();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProduction
    ? (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || false)
    : (process.env.CORS_ORIGIN || '*'),
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/plans', (req, res, next) => {
  const adminController = require('./controllers/adminController');
  adminController.fetchPlansFromDb().then((plans) => res.json({ plans })).catch(next);
});

app.get('/api/settings/payment', async (req, res) => {
  try {
    const settingsHelper = require('./utils/settingsHelper');
    const paymentGateway = (await settingsHelper.getSetting('payment_gateway')) || 'qris';
    const paymentInstructions = (await settingsHelper.getSetting('payment_instructions')) || '';
    const qrisMode = (await settingsHelper.getSetting('qris_mode')) || 'static';
    res.json({
      payment_gateway: paymentGateway,
      payment_instructions: paymentInstructions,
      qris_mode: qrisMode === 'static' ? 'static' : 'dynamic',
    });
  } catch (err) {
    res.json({ payment_gateway: 'qris', payment_instructions: '', qris_mode: 'static' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => {
  res.json({
    name: 'GoDrive API',
    version: '1.0',
    docs: '/api/auth, /api/files, /api/folders, /api/share, /api/search, /api/system',
    health: '/health',
  });
});

app.use(errorMiddleware);

module.exports = app;
