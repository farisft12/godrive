import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { filesApi } from '../services/axios';
import { useToast } from '../context/ToastContext';

export default function UploadModal({ open, onClose, folderId, onUploaded, initialFiles = [] }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [files, setFiles] = useState([]);
  const toast = useToast();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initialFiles?.length > 0) {
      setFiles([...initialFiles]);
    } else {
      setFiles([]);
    }
  }, [open, initialFiles]);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    noClick: files.length > 0,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const newProgress = {};
    files.forEach((_, i) => (newProgress[i] = 0));
    setProgress(newProgress);

    let success = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folder_id', folderId);
      try {
        await filesApi.upload(formData, (e) => {
          const p = e.loaded && e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          setProgress((prev) => ({ ...prev, [i]: p }));
        });
        success++;
      } catch (err) {
        toast.error(`${file.name}: ${err.response?.data?.error || err.message}`);
      }
    }

    setUploading(false);
    setFiles([]);
    setProgress({});
    if (success > 0) {
      toast.success(`${success} file(s) uploaded`);
      onUploaded?.();
    }
    if (success === files.length) onClose();
  };

  const cancel = () => {
    if (!uploading) {
      setFiles([]);
      setProgress({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={cancel} className="relative z-50" initialFocus={closeButtonRef}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <Dialog.Title className="text-lg font-semibold">Upload files</Dialog.Title>
            <button ref={closeButtonRef} type="button" onClick={cancel} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            {...getRootProps()}
            className={`
              m-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <input {...getInputProps()} />
            <p className="text-gray-600">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </p>
          </div>

          {files.length > 0 && (
            <div className="px-4 pb-4 overflow-y-auto flex-1">
              <ul className="space-y-2">
                {files.map((file, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="truncate flex-1">{file.name}</span>
                    {uploading ? (
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 transition-all"
                          style={{ width: `${progress[i] ?? 0}%` }}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
            <button
              type="button"
              onClick={cancel}
              disabled={uploading}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadAll}
              disabled={files.length === 0 || uploading}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
