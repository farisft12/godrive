import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Normalize WhatsApp number to 62xxxxxxxxxx (no + or leading 0)
function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return '62' + digits;
}

function validatePassword(password) {
  if (password.length < 8) return 'Password minimal 8 karakter';
  if (!/[A-Z]/.test(password)) return 'Password harus ada huruf besar';
  if (!/[a-z]/.test(password)) return 'Password harus ada huruf kecil';
  if (!/[0-9]/.test(password)) return 'Password harus ada angka';
  return null;
}

function getPasswordStrength(password) {
  if (!password.length) return { level: 0, label: '', color: 'bg-gray-200' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { level: 1, label: 'Lemah', color: 'bg-red-500' };
  if (score <= 2) return { level: 2, label: 'Cukup', color: 'bg-amber-500' };
  if (score <= 4) return { level: 3, label: 'Baik', color: 'bg-emerald-500' };
  return { level: 4, label: 'Kuat', color: 'bg-primary-600' };
}

function validatePhone(phone) {
  const p = phone.replace(/\D/g, '');
  if (p.length < 10) return 'Nomor WhatsApp tidak valid';
  const normalized = p.startsWith('62') ? p : p.startsWith('0') ? '62' + p.slice(1) : '62' + p;
  if (normalized.length < 11 || normalized.length > 14) return 'Nomor WhatsApp tidak valid';
  return null;
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    const tName = name.trim();
    if (!tName) newErrors.name = 'Nama wajib diisi';
    else if (tName.length < 2) newErrors.name = 'Nama minimal 2 karakter';

    if (!email.trim()) newErrors.email = 'Email wajib diisi';

    const phoneErr = validatePhone(phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const pwdErr = validatePassword(password);
    if (pwdErr) newErrors.password = pwdErr;

    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'Konfirmasi password tidak sama';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const result = await register({
        name: tName,
        email: email.trim().toLowerCase(),
        password,
        phone: normalizePhone(phone),
      });
      if (result && result.requiresVerification) {
        navigate('/verify', { state: { email: email.trim().toLowerCase() }, replace: true });
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'Registrasi gagal');
    } finally {
      setLoading(false);
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-6"
        >
          <Link to="/" className="text-2xl font-bold text-primary-600 hover:opacity-90 transition-opacity">
            GoDrive
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8"
        >
          <motion.h1
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-semibold text-gray-900 mb-6"
          >
            Buat akun
          </motion.h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nama
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.name ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                }`}
                placeholder="Nama lengkap"
              />
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.name}
                </motion.p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.email ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                }`}
                placeholder="anda@contoh.com"
              />
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                No. WhatsApp
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                }}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.phone ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                }`}
                placeholder="08xxxxxxxxxx atau 628xxxxxxxxxx"
              />
              {errors.phone && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.phone}
                </motion.p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                  }}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.password ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                  }`}
                  placeholder="Min. 8 karakter, huruf besar, kecil, dan angka"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {password.length > 0 && (() => {
                const strength = getPasswordStrength(password);
                return (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 overflow-hidden"
                  >
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: i <= strength.level ? 1 : 0 }}
                          transition={{ duration: 0.25, delay: i * 0.06 }}
                          className={`h-1.5 flex-1 rounded-full origin-left ${i <= strength.level ? strength.color : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                    <motion.p
                      key={strength.label}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1.5 text-xs font-medium"
                      style={{
                        color: strength.level <= 1 ? '#dc2626' : strength.level <= 2 ? '#d97706' : strength.level <= 3 ? '#059669' : '#2563eb',
                      }}
                    >
                      Kekuatan: {strength.label}
                    </motion.p>
                  </motion.div>
                );
              })()}
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.password}
                </motion.p>
              )}
            </div>
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
                Konfirmasi Password
              </label>
              <div className="relative">
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => {
                    setPasswordConfirm(e.target.value);
                    if (errors.passwordConfirm) setErrors((prev) => ({ ...prev, passwordConfirm: null }));
                  }}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.passwordConfirm ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                  }`}
                  placeholder="Ulangi password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  aria-label={showPasswordConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                  tabIndex={-1}
                >
                  {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.passwordConfirm && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.passwordConfirm}
                </motion.p>
              )}
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Membuat akun...' : 'Daftar'}
            </motion.button>
          </form>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-6 text-center text-sm text-gray-600"
          >
            Sudah punya akun?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Masuk
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}
