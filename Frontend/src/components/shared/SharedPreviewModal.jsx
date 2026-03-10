import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Download } from 'lucide-react';
import { isImage, isVideo, isPdf, isText } from '../../utils/fileIcons';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SharedPreviewModal({
  open,
  onClose,
  file,
  token,
  password = '',
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const closeButtonRef = useRef(null);

  const downloadUrl = file && token
    ? `${API_BASE}/api/share/${token}/download?file_id=${file.file_id}${password ? `&password=${encodeURIComponent(password)}` : ''}`
    : '';

  const loadPreview = useCallback(() => {
    if (!file || !token || !open) return;
    setError(null);
    setLoading(true);
    setContentType(null);
    setTextContent(null);
    const url = `${API_BASE}/api/share/${token}/download?file_id=${file.file_id}${password ? `&password=${encodeURIComponent(password)}` : ''}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        const mime = file.mime_type || '';
        if (isImage(mime)) setContentType('image');
        else if (isVideo(mime)) setContentType('video');
        else if (isPdf(mime)) setContentType('pdf');
        else if (isText(mime)) {
          blob.text().then((t) => {
            setTextContent(t);
            setContentType('text');
          });
        } else setContentType('download');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [file?.file_id, token, password, open]);

  useEffect(() => {
    if (open && file) loadPreview();
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, file?.file_id]);

  const handleDownload = useCallback(() => {
    if (!downloadUrl || !file) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.original_name || 'download';
    a.click();
  }, [downloadUrl, file]);

  if (!file) return null;

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-24 text-gray-500">
          Loading...
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            Download instead
          </button>
        </div>
      );
    }
    if (contentType === 'image' && blobUrl) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] p-4 bg-gray-100">
          <img
            src={blobUrl}
            alt={file.original_name}
            className="max-w-full max-h-[75vh] object-contain rounded-lg"
          />
        </div>
      );
    }
    if (contentType === 'video' && blobUrl) {
      return (
        <div className="flex items-center justify-center p-4 bg-gray-900">
          <video controls autoPlay className="max-w-full max-h-[75vh] rounded-lg" src={blobUrl}>
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    if (contentType === 'pdf' && blobUrl) {
      return (
        <iframe
          title={file.original_name}
          src={blobUrl}
          className="w-full h-[75vh] rounded-lg border-0 bg-white"
        />
      );
    }
    if (contentType === 'text' && textContent !== null) {
      return (
        <pre className="text-left p-6 bg-gray-900 text-gray-100 rounded-lg overflow-auto max-h-[75vh] text-sm whitespace-pre-wrap font-mono">
          {textContent}
        </pre>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
        <button
          type="button"
          onClick={handleDownload}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
        >
          <Download className="w-4 h-4 inline-block mr-2 align-middle" />
          Download
        </button>
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50" initialFocus={closeButtonRef}>
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <Dialog.Panel className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
            <Dialog.Title className="font-semibold text-gray-900 truncate flex-1 min-w-0">
              {file.original_name}
            </Dialog.Title>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gray-50">
            {renderBody()}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
