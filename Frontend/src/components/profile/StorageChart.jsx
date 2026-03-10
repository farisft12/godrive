import { motion } from 'framer-motion';
import { formatSize } from '../../utils/fileIcons';

export default function StorageChart({ used, total, fileCount = 0 }) {
  const available = Math.max(0, total - used);
  const percent = total ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
    >
      <h3 className="font-medium text-gray-900 mb-4">Storage</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-medium text-gray-900">{formatSize(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Used</span>
          <span className="font-medium text-gray-900">{formatSize(used)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Available</span>
          <span className="font-medium text-gray-900">{formatSize(available)}</span>
        </div>
        {fileCount >= 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Files</span>
            <span className="font-medium text-gray-900">{fileCount.toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-primary-500 rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{percent}% used</p>
      </div>
    </motion.div>
  );
}
