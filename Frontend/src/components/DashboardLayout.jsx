import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import UploadPopup from './UploadPopup';
import { useUpload } from '../context/UploadContext';

const DRAG_MOVE_TYPE = 'application/x-godrive-move';

export default function DashboardLayout({
  children,
  sidebarFolders = [],
  currentFolderId = null,
  uploadFolderId = null,
  searchQuery = '',
  onSearchChange,
  onUpload,
  onCreateFolder,
  searchPlaceholder,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { addFiles } = useUpload();

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles, evt) => {
      setDragOver(false);
      if (evt?.dataTransfer?.types?.includes(DRAG_MOVE_TYPE)) return;
      if (acceptedFiles.length > 0) {
        addFiles(acceptedFiles, uploadFolderId);
      }
    },
    [addFiles, uploadFolderId]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: (evt) => {
      if (evt?.dataTransfer?.types?.includes(DRAG_MOVE_TYPE)) return;
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar
        onMenuClick={() => setSidebarOpen((o) => !o)}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onUpload={onUpload}
        onCreateFolder={onCreateFolder}
        placeholder={searchPlaceholder}
      />
      <div className="flex flex-1 min-h-0 relative">
        <Sidebar
          folders={sidebarFolders}
          currentFolderId={currentFolderId}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden" {...getRootProps()}>
          <input {...getInputProps()} />
          {children}
        </main>
      </div>

      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary-500/10 backdrop-blur-sm pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border-2 border-dashed border-primary-400 px-12 py-10 text-center pointer-events-none"
            >
              <p className="text-lg font-semibold text-gray-900">Drop files to upload</p>
              <p className="text-sm text-gray-500 mt-1">Release to add files to this folder</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <UploadPopup />
    </div>
  );
}
