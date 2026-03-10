import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../services/axios';
import { useToast } from '../context/ToastContext';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery) setEmail(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    const fromState = location.state?.email;
    if (fromState) setEmail(fromState);
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email wajib diisi');
      return;
    }
    if (!code.trim() || code.trim().length !== 6) {
      setError('Masukkan kode 6 digit dari WhatsApp/email');
      return;
    }
    setLoading(true);
    try {
      await authApi.verify(email.trim().toLowerCase(), code.trim());
      showSuccess('Verifikasi berhasil. Silakan masuk dengan akun Anda.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Verifikasi gagal';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Email wajib diisi');
      return;
    }
    setResendLoading(true);
    setError('');
    try {
      await authApi.sendVerification(email.trim().toLowerCase());
      showSuccess('Kode verifikasi baru telah dikirim ke WhatsApp/email Anda.');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Gagal mengirim ulang kode';
      setError(msg);
      showError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl font-bold text-primary-600 hover:opacity-90 transition-opacity">
            GoDrive
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8"
        >
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Verifikasi akun</h1>
          <p className="text-sm text-gray-500 mb-6">
            Masukkan kode 6 digit yang dikirim ke WhatsApp/email Anda.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="verify-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="anda@contoh.com"
              />
            </div>
            <div>
              <label htmlFor="verify-code" className="block text-sm font-medium text-gray-700 mb-1">
                Kode verifikasi
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-lg tracking-widest"
                placeholder="000000"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </motion.button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
            >
              {resendLoading ? 'Mengirim...' : 'Kirim ulang kode'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Sudah verifikasi?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Masuk
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
