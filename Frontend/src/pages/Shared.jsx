import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { Share2 } from 'lucide-react';

export default function Shared() {
  return (
    <DashboardLayout
      sidebarFolders={[]}
      currentFolderId={null}
      searchQuery=""
      onSearchChange={() => {}}
      onUpload={() => {}}
      onCreateFolder={() => {}}
      searchPlaceholder="Search shared files..."
    >
      <div className="flex flex-1 flex-col min-h-0 bg-white">
        <div className="px-4 py-6 border-b border-gray-100">
          <h1 className="text-xl font-semibold text-gray-900">Shared with you</h1>
          <p className="text-sm text-gray-500 mt-1">
            Files shared with you will appear here. Use the share link from others to access files.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center flex-1 py-16 text-gray-500"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Share2 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm">No shared files yet</p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
