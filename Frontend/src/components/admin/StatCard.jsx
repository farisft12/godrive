import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {sub != null && sub !== '' && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg bg-gray-100 text-gray-600">
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
    </motion.div>
  );
}
