import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, FileText, Lock } from 'lucide-react';
import { shareApi } from '../services/axios';
import { isImage, isVideo, isPdf, isText } from '../utils/fileIcons';
import { formatSize } from '../utils/fileIcons';
import SharedFolderPage from './SharedFolderPage';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SharePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    shareApi
      .getByToken(token)
      .then((data) => {
        setShareInfo(data);
        setPasswordRequired(false);
        setLoading(false);
      })
      .catch((err) => {
        if (err.requiresPassword) {
          setPasswordRequired(true);
        } else {
          setError(err.message || 'Share not found or expired');
        }
        setLoading(false);
      });
  }, [token]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    shareApi
      .getByToken(token, password)
      .then((data) => {
        setShareInfo(data);
        setPasswordRequired(false);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Invalid password');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!shareInfo || !token) return;
    if (shareInfo.type === 'folder') {
      setPreviewUrl(null);
      return;
    }
    const url = `${API_BASE}/api/share/${token}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.blob();
      })
      .then((blob) => {
        setPreviewUrl(URL.createObjectURL(blob));
      })
      .catch(() => setPreviewUrl(null));
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [shareInfo, token, password]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-gray-500" />
            <h1 className="text-lg font-semibold text-gray-900">Password required</h1>
          </div>
          <p className="text-sm text-gray-600 mb-4">This link is protected. Enter the password to view.</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
            >
              Continue
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (error && !shareInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/" className="text-primary-600 hover:underline">
            Go to GoDrive
          </a>
        </div>
      </div>
    );
  }

  if (!shareInfo) return null;

  if (shareInfo.type === 'folder') {
    return (
      <SharedFolderPage
        shareInfo={shareInfo}
        token={token}
        password={password}
        allowUpload={false}
        onNavigateFolder={(folderId) =>
          shareApi.getByToken(token, password, folderId).then(setShareInfo)
        }
        onRefreshShareInfo={(folderId) =>
          shareApi.getByToken(token, password, folderId ?? shareInfo.current_folder_id).then(setShareInfo)
        }
      />
    );
  }

  const downloadUrl = `${API_BASE}/api/share/${token}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`;
  const isImg = isImage(shareInfo.mime_type);
  const isVid = isVideo(shareInfo.mime_type);
  const isPdfFile = isPdf(shareInfo.mime_type);
  const isTextFile = isText(shareInfo.mime_type);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-5 h-5 text-gray-500 shrink-0" />
          <h1 className="font-semibold text-gray-900 truncate">{shareInfo.original_name}</h1>
        </div>
        <a
          href={downloadUrl}
          download={shareInfo.original_name}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shrink-0"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      </header>

      <div className="flex-1 flex flex-col sm:flex-row min-h-0">
        <div className="flex-1 p-4 flex items-center justify-center bg-gray-100 overflow-auto">
          {previewUrl && isImg && (
            <img
              src={previewUrl}
              alt={shareInfo.original_name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
          {previewUrl && isVid && (
            <video controls className="max-w-full max-h-full rounded-lg" src={previewUrl}>
              Your browser does not support the video tag.
            </video>
          )}
          {previewUrl && isPdfFile && (
            <iframe
              title={shareInfo.original_name}
              src={previewUrl}
              className="w-full h-full min-h-[60vh] rounded-lg bg-white"
            />
          )}
          {!previewUrl && !isImg && !isVid && !isPdfFile && (
            <div className="text-center text-gray-500">
              <p className="mb-2">Preview not available for this file type.</p>
              <a
                href={downloadUrl}
                download={shareInfo.original_name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          )}
        </div>
        <aside className="w-full sm:w-72 bg-white border-t sm:border-t-0 sm:border-l border-gray-100 p-4 shrink-0">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Share info</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">File name</dt>
              <dd className="font-medium text-gray-900 break-words">{shareInfo.original_name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Size</dt>
              <dd className="font-medium">{formatSize(shareInfo.size_bytes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Type</dt>
              <dd className="font-medium">{shareInfo.mime_type || 'Unknown'}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
