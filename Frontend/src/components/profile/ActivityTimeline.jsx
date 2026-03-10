import { motion } from 'framer-motion';
import { Upload, Trash2, Share2, FileText } from 'lucide-react';
import { formatDate } from '../../utils/fileIcons';

const actionIcons = {
  upload: Upload,
  delete: Trash2,
  share: Share2,
  rename: FileText,
  move: FileText,
  trash: Trash2,
  restore: FileText,
  register: FileText,
  login: FileText,
};

export default function ActivityTimeline({ activities }) {
  if (!activities?.length) {
    return (
      <p className="text-sm text-gray-500 py-4">No recent activity.</p>
    );
  }

  return (
    <ul className="space-y-0">
      {activities.map((item, i) => {
        const Icon = actionIcons[item.action] || FileText;
        const details = item.details || {};
        const desc = details.newName || details.name || details.email || item.resource_type || item.action;
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex gap-3 py-3 border-b border-gray-100 last:border-0"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900 capitalize">{item.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-500 truncate">{typeof desc === 'string' ? desc : JSON.stringify(desc)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.created_at)}</p>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
