import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const planId = searchParams.get('plan');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState('idle'); // idle | fadeOut
  const { user, loading: authLoading, login } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    };
  }, []);

  const startLoginTransition = (to) => {
    setTransitioning(true);
    setTransitionStage('fadeOut');
    navTimerRef.current = window.setTimeout(() => navigate(to, { replace: true }), 280);
  };

  // Jangan auto-redirect saat animasi login sedang jalan,
  // karena `user` akan langsung ter-set dan akan memotong animasi.
  if (!authLoading && user && !transitioning) {
    const to = redirect === '/checkout' && planId ? `/checkout?plan=${planId}` : redirect;
    return <Navigate to={to} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      const to = redirect === '/checkout' && planId ? `/checkout?plan=${planId}` : redirect;
      startLoginTransition(to);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      showError(msg);
      if (err.response?.status === 403 && msg.includes('verifikasi')) {
        navigate('/verify', { state: { email }, replace: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const cardVariants = {
    idle: { opacity: 1, y: 0, scale: 1 },
    fadeOut: {
      opacity: 0,
      y: 6,
      scale: 0.98,
      transition: { duration: 0.25 },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-primary-600">
            GoDrive
          </Link>
        </div>
        <motion.div
          initial={false}
          animate={transitionStage}
          variants={cardVariants}
          className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 relative ${transitioning ? 'pointer-events-none select-none' : ''}`}
        >
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Log in</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            </div>
            <button
              type="submit"
              disabled={loading || transitioning}
              className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
