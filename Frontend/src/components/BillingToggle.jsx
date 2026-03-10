import { motion } from 'framer-motion';

export default function BillingToggle({ yearly, onChange, savePercent = 17 }) {
  return (
    <div className="flex flex-col items-center gap-2 mb-10">
      <div className="inline-flex items-center p-1 rounded-full bg-gray-100 border border-gray-200">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
            !yearly ? 'text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {yearly ? null : (
            <motion.span
              layoutId="billing-pill"
              className="absolute inset-0 rounded-full bg-primary-600"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">Bulanan</span>
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
            yearly ? 'text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {yearly ? (
            <motion.span
              layoutId="billing-pill"
              className="absolute inset-0 rounded-full bg-primary-600"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          ) : null}
          <span className="relative">Tahunan</span>
        </button>
      </div>
      {savePercent > 0 && (
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
          Hemat {savePercent}%
        </span>
      )}
    </div>
  );
}
