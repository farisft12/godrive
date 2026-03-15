import { Dialog } from '@headlessui/react';
import { X, Download, Share2, ExternalLink } from 'lucide-react';
import { isImage, isVideo, isPdf, isText } from '../utils/fileIcons';
import { formatSize, formatDate } from '../utils/fileIcons';
import { useState, useEffect, useCallback, useRef } from 'react';
import { filesApi } from '../services/axios';
import Hls from 'hls.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('godrive_token') || '';
}

export default function FilePreview({ file, open, onClose, onShare }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [useHls, setUseHls] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const closeButtonRef = useRef(null);
  const videoRef = useRef(null);
  const blobUrlRef = useRef(null);

  const handleDownload = useCallback(async () => {
    if (!file) return;
    try {
      await filesApi.download(file.id, file.original_name);
    } catch (e) {
      console.error(e);
    }
  }, [file]);

  const openInNewTab = useCallback(() => {
    if (!file) return;
    const token = getToken();
    const url = `${API_BASE}/api/files/${file.id}/download`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.blob();
      })
      .then((blob) => {
        const u = URL.createObjectURL(blob);
        window.open(u, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(u), 60000);
      })
      .catch(console.error);
  }, [file]);

  useEffect(() => {
    if (!file || !open) return;
    setError(null);
    setLoading(true);
    setImageScale(1);
    setStreamUrl(null);
    setUseHls(false);

    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    if (isVideo(file.mime_type)) {
      const playlistUrl = `${API_BASE}/api/stream/${file.id}/playlist.m3u8`;
      fetch(playlistUrl, { method: 'GET', headers })
        .then((res) => {
          if (res.ok && Hls.isSupported()) {
            setStreamUrl(playlistUrl);
            setContent('video');
            setUseHls(true);
            setLoading(false);
            return;
          }
          return fetch(`${API_BASE}/api/files/${file.id}/download`, { headers })
            .then((r) => {
              if (!r.ok) throw new Error('Failed to load');
              return r.blob();
            })
            .then((blob) => {
              const u = URL.createObjectURL(blob);
              blobUrlRef.current = u;
              setBlobUrl(u);
              setContent('video');
              setUseHls(false);
            })
            .finally(() => setLoading(false));
        })
        .catch(() => {
          return fetch(`${API_BASE}/api/files/${file.id}/download`, { headers })
            .then((r) => {
              if (!r.ok) throw new Error('Failed to load');
              return r.blob();
            })
            .then((blob) => {
              const u = URL.createObjectURL(blob);
              blobUrlRef.current = u;
              setBlobUrl(u);
              setContent('video');
              setUseHls(false);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
        });
      return () => {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
    }

    const url = `${API_BASE}/api/files/${file.id}/download`;
    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.blob();
      })
      .then((blob) => {
        const u = URL.createObjectURL(blob);
        blobUrlRef.current = u;
        setBlobUrl(u);
        if (isImage(file.mime_type)) {
          setContent('image');
        } else if (isPdf(file.mime_type)) {
          setContent('pdf');
        } else if (isText(file.mime_type)) {
          blob.text().then(setContent);
        } else {
          setContent('download');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [file?.id, open]);

  useEffect(() => {
    if (!useHls || !streamUrl || !videoRef.current) return;
    const token = getToken();
    const hls = new Hls({
      xhrSetup(xhr) {
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      },
    });
    hls.loadSource(streamUrl);
    hls.attachMedia(videoRef.current);
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        hls.destroy();
        setUseHls(false);
        setStreamUrl(null);
        setError('Video playback failed');
      }
    });
    return () => {
      hls.destroy();
    };
  }, [useHls, streamUrl]);

  if (!file) return null;

  const renderPreview = () => {
    if (loading) return <div className="flex items-center justify-center p-12 text-gray-500">Loading...</div>;
    if (error) return <div className="flex items-center justify-center p-12 text-red-600">{error}</div>;
    if (content === 'image' && blobUrl) {
      return (
        <div className="overflow-auto flex items-center justify-center p-4 min-h-[60vh]" style={{ minHeight: '60vh' }}>
          <img
            src={blobUrl}
            alt={file.original_name}
            className="max-w-full object-contain rounded-lg transition-transform duration-200 select-none"
            style={{ transform: `scale(${imageScale})` }}
            draggable={false}
          />
        </div>
      );
    }
    if (content === 'video') {
      if (useHls && streamUrl) {
        return (
          <video
            ref={videoRef}
            controls
            autoPlay
            className="max-w-full max-h-[70vh] rounded-lg"
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        );
      }
      if (blobUrl) {
        return (
          <video controls autoPlay className="max-w-full max-h-[70vh] rounded-lg" src={blobUrl} playsInline>
            Your browser does not support the video tag.
          </video>
        );
      }
    }
    if (content === 'pdf' && blobUrl) {
      return (
        <iframe
          title={file.original_name}
          src={blobUrl}
          className="w-full h-[70vh] rounded-lg border-0 overflow-auto"
        />
      );
    }
    if (typeof content === 'string' && content !== 'download') {
      return (
        <pre className="text-left p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto max-h-[70vh] text-sm whitespace-pre-wrap">
          {content}
        </pre>
      );
    }
    return (
      <p className="text-gray-500">
        Preview not available. Use Download to get the file.
      </p>
    );
  };

  const isImg = content === 'image' && blobUrl;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50" initialFocus={closeButtonRef}>
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col sm:flex-row">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 shrink-0">
              <h3 className="font-semibold truncate text-gray-900 flex-1 min-w-0">{file.original_name}</h3>
              <div className="flex items-center gap-1 shrink-0">
                {isImg && (
                  <>
                    <button
                      type="button"
                      onClick={() => setImageScale((s) => Math.max(0.5, s - 0.25))}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-medium text-sm"
                      title="Zoom out"
                    >
                      −
                    </button>
                    <span className="text-sm text-gray-500 min-w-[3rem] text-center">{Math.round(imageScale * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setImageScale((s) => Math.min(3, s + 0.25))}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-medium text-sm"
                      title="Zoom in"
                    >
                      +
                    </button>
                    <span className="w-px h-5 bg-gray-200 mx-1" />
                  </>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                {onShare && (
                  <button
                    type="button"
                    onClick={() => onShare(file)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={openInNewTab}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-50">
              {renderPreview()}
            </div>
          </div>
          <div className="w-64 border-t sm:border-t-0 sm:border-l border-gray-100 p-4 shrink-0 bg-white">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Details</p>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Size</dt>
                <dd className="font-medium text-gray-900">{formatSize(file.size_bytes)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Modified</dt>
                <dd className="font-medium text-gray-900">{formatDate(file.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium text-gray-900 truncate">{file.mime_type || 'Unknown'}</dd>
              </div>
            </dl>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
