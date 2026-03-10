import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Cloud,
  Lock,
  Share2,
  FolderOpen,
  Zap,
  LogIn,
  UserPlus,
  FileText,
  Image,
  File,
  LayoutDashboard,
} from 'lucide-react';
import { plansApi } from '../services/axios';
import { formatSize } from '../utils/fileIcons';
import { useAuth } from '../context/AuthContext';
import BillingToggle from '../components/BillingToggle';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const features = [
  {
    icon: Lock,
    title: 'Secure Storage',
    description: 'Your files are encrypted and protected. Store with confidence.',
  },
  {
    icon: Zap,
    title: 'Fast Upload',
    description: 'Upload and sync quickly. Resumable transfers for large files.',
  },
  {
    icon: Share2,
    title: 'File Sharing',
    description: 'Share links or invite others. You control the access.',
  },
  {
    icon: FolderOpen,
    title: 'Smart Organization',
    description: 'Folders, search, and structure. Find what you need fast.',
  },
];

const footerLinks = [
  { label: 'About', to: '#' },
  { label: 'Contact', to: '#' },
  { label: 'Privacy Policy', to: '#' },
];

export default function Welcome() {
  const { user } = useAuth();
  const [yearly, setYearly] = useState(true);
  const { data: plansData } = useQuery({
    queryKey: ['public', 'plans'],
    queryFn: () => plansApi.getPlans(),
  });
  const plans = plansData?.plans ?? [];

  const formatPrice = (amount, currency = 'IDR') => {
    if (currency === 'IDR' || !currency) return `Rp ${Number(amount).toLocaleString('id-ID')}`;
    return `${currency} ${Number(amount).toLocaleString()}`;
  };

  const getGrandTotal = (plan, useYearly) => {
    const base = useYearly ? plan.price_yearly : plan.price_amount;
    if (base == null || base === '') return 0;
    const totalAfterTax = Number(base) * 1.11;
    const discountPct = plan.discount_percent ?? 0;
    return Math.round(totalAfterTax * (1 - discountPct / 100));
  };

  const savePercent = Math.max(17, ...(plans.map((p) => p.discount_percent || 0)));

  return (
    <div className="min-h-screen bg-white text-gray-800 antialiased">
      {/* ——— Navbar ——— */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b border-gray-100"
      >
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-800 font-semibold hover:opacity-90 transition-opacity"
          >
            <Cloud className="w-7 h-7 text-blue-600" />
            <span>GoDrive</span>
          </Link>
          <div className="flex items-center gap-6 sm:gap-8">
            <Link
              to="#features"
              className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
            >
              Harga
            </Link>
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
                >
                  Login
                </Link>
                <Link to="/register">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Register
                  </motion.span>
                </Link>
              </>
            )}
          </div>
        </nav>
      </motion.header>

      {/* ——— Hero (two columns) ——— */}
      <section className="px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-20 sm:pb-24 lg:pb-28">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
            {/* Left: headline, description, buttons */}
            <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold text-gray-900 tracking-tight leading-tight"
              >
                Your Private Cloud Storage
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="mt-5 sm:mt-6 text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0"
              >
                Store, organize, and share your files securely from anywhere.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16 }}
                className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4"
              >
                <Link to="/register">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Get Started
                  </motion.span>
                </Link>
                <Link to="/login">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </motion.span>
                </Link>
              </motion.div>
            </div>
            {/* Right: illustration / dashboard preview */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 mt-12 lg:mt-0 order-1 lg:order-2 flex justify-center lg:justify-end"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full max-w-md aspect-[4/3] rounded-2xl bg-gray-50 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden"
              >
                {/* Browser-style header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-gray-200" />
                    <span className="w-3 h-3 rounded-full bg-gray-200" />
                    <span className="w-3 h-3 rounded-full bg-gray-200" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <span className="text-xs text-gray-400 font-medium">GoDrive</span>
                  </div>
                </div>
                {/* Mock content */}
                <div className="flex-1 p-4 flex flex-col gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-100"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        {i % 2 === 0 ? (
                          <Image className="w-4 h-4 text-blue-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                        <div className="h-2 bg-gray-100 rounded w-1/2 mt-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ——— Product Preview ——— */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 sm:mb-14"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              See GoDrive in action
            </h2>
            <p className="mt-3 text-gray-600 max-w-lg mx-auto">
              A clean dashboard to manage all your files in one place.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="flex justify-center"
          >
            <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/40 border border-gray-200 bg-white">
              {/* Dashboard mockup */}
              <div className="aspect-video sm:aspect-[2/1] flex flex-col">
                <div className="h-12 border-b border-gray-200 flex items-center gap-2 px-4 bg-white">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">GoDrive</span>
                  <span className="text-gray-400 text-sm ml-2">Dashboard</span>
                </div>
                <div className="flex-1 flex">
                  <div className="w-48 sm:w-56 border-r border-gray-200 bg-gray-50/80 p-3 space-y-1">
                    {['My Files', 'Shared', 'Recent', 'Trash'].map((label, i) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          i === 0 ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600'
                        }`}
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { icon: FileText, name: 'Document.pdf' },
                        { icon: Image, name: 'Photo.jpg' },
                        { icon: File, name: 'Report.xlsx' },
                        { icon: Image, name: 'Design.png' },
                        { icon: FileText, name: 'Notes.txt' },
                        { icon: File, name: 'Data.csv' },
                      ].map(({ icon: Icon, name }) => (
                        <div
                          key={name}
                          className="flex flex-col items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/80 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="text-xs text-gray-600 truncate w-full text-center">
                            {name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ——— Features ——— */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="text-center mb-14 sm:mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-2xl sm:text-3xl font-bold text-gray-900"
            >
              Everything you need
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-3 text-gray-600 max-w-lg mx-auto"
            >
              Simple, powerful tools to store, sync, and share your files.
            </motion.p>
          </motion.div>
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-40px' }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {features.map(({ icon: Icon, title, description }) => (
              <motion.div
                key={title}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-7 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ——— Pricing (from Admin Plans) ——— */}
      {plans.length > 0 && (
        <section id="pricing" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Pilihan Paket</h2>
              <p className="mt-3 text-gray-600">Penyimpanan sesuai kebutuhan. Pilih per bulan atau per tahun.</p>
            </motion.div>
            <BillingToggle yearly={yearly} onChange={setYearly} savePercent={savePercent} />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {plans.map((plan, i) => {
                const hasYearly = plan.price_yearly != null && plan.price_yearly > 0;
                const displayYearly = yearly && hasYearly;
                const grandTotal = getGrandTotal(plan, displayYearly);
                const priceLabel = displayYearly ? '/ tahun' : '/ bulan';
                const checkoutQuery = displayYearly ? `?plan=${plan.id}&yearly=1` : `?plan=${plan.id}`;
                return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all"
                >
                  {plan.discount_percent > 0 && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium mb-3">
                      Hemat {plan.discount_percent}%
                    </span>
                  )}
                  <h3 className="font-semibold text-gray-900 text-lg">{plan.name}</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{formatSize(plan.storage_bytes)}</p>
                  <p className="text-sm text-gray-500 mt-1">penyimpanan</p>
                  <p className="mt-4 text-xl font-semibold text-gray-900">
                    {grandTotal === 0 ? 'Gratis' : formatPrice(grandTotal, plan.price_currency)}
                    {grandTotal > 0 && priceLabel}
                  </p>
                  {hasYearly && !displayYearly && (
                    <p className="text-sm text-gray-600 mt-1">
                      {formatPrice(getGrandTotal(plan, true), plan.price_currency)}/ tahun
                    </p>
                  )}
                  <Link
                    to={user ? `/checkout${checkoutQuery}` : `/login?redirect=${encodeURIComponent('/checkout' + checkoutQuery)}`}
                    className="mt-6 block"
                  >
                    <span className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                      Pilih
                    </span>
                  </Link>
                </motion.div>
              );})}
            </motion.div>
          </div>
        </section>
      )}

      {/* ——— CTA ——— */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28 bg-gradient-to-b from-gray-50 to-white">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Start managing your files with GoDrive today.
          </h2>
          <p className="mt-4 text-gray-600">
            Create a free account and get started in seconds.
          </p>
          <div className="mt-8">
            <Link to="/register">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ——— Footer ——— */}
      <footer className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-gray-500 text-sm font-medium">GoDrive</span>
          <nav className="flex items-center gap-6 sm:gap-8">
            {footerLinks.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="text-gray-500 hover:text-gray-800 text-sm transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="max-w-5xl mx-auto mt-4 text-center sm:text-left">
          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} GoDrive. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
