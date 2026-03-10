import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, X } from 'lucide-react';

export default function SharedUploadPopup({ uploads = [] }) {
  if (uploads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {uploads.map((u) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${u.progress ?? 0}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
            {u.done && (
              u.error ? (
                <X className="w-5 h-5 text-red-500 shrink-0" />
              ) : (
                <Check className="w-5 h-5 text-green-600 shrink-0" />
              )
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
