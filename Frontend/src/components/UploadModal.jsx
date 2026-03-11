import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Trash2 } from 'lucide-react';
import { useUpload } from '../context/UploadContext';

export default function UploadModal({ open, onClose, folderId, onUploaded, initialFiles = [], onFilesChange }) {
  const [files, setFiles] = useState([]);
  const { addFiles } = useUpload();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initialFiles?.length > 0) {
      setFiles([...initialFiles]);
    } else {
      setFiles([]);
    }
    // Intentionally depend only on open so we don't reset files when parent re-renders (e.g. after file picker closes) and passes new initialFiles reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sync local files to parent so state survives unmount/remount (e.g. React Strict Mode)
  useEffect(() => {
    if (open && onFilesChange) onFilesChange(files);
  }, [open, files, onFilesChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFiles([]);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    setFiles((prev) => {
      const next = [...prev, ...acceptedFiles];
      queueMicrotask(() => onFilesChange?.(next));
      return next;
    });
  }, [onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    disabled: false,
  });

  const handleFileInputChange = (e) => {
    const list = e.target.files;
    if (list?.length) {
      const added = Array.from(list);
      setFiles((prev) => {
        const next = [...prev, ...added];
        queueMicrotask(() => onFilesChange?.(next));
        return next;
      });
    }
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      queueMicrotask(() => onFilesChange?.(next));
      return next;
    });
  };

  const uploadAll = () => {
    if (files.length === 0) return;
    addFiles(files, folderId ?? undefined);
    onClose();
  };

  const cancel = () => {
    setFiles([]);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) cancel();
        }}
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Upload files</h2>
            <button type="button" onClick={cancel} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            {...getRootProps()}
            className={`
              m-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
              ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <input {...getInputProps()} />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
              tabIndex={-1}
              aria-hidden
            />
            <p className="text-gray-600">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or '}
              {!isDragActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-primary-600 font-medium hover:underline disabled:opacity-50 cursor-pointer"
                >
                  click to select
                </button>
              )}
            </p>
          </div>

          {files.length > 0 && (
            <div className="px-4 pb-4 overflow-y-auto flex-1">
              <ul className="space-y-2">
                {files.map((file, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="truncate flex-1">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="p-1.5 rounded hover:bg-red-100 text-red-600 shrink-0"
                      aria-label="Remove"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadAll}
              disabled={files.length === 0}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Upload {files.length} file(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
