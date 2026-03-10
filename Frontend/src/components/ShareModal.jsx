import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Copy, Link2 } from 'lucide-react';
import { shareApi } from '../services/axios';
import { useToast } from '../context/ToastContext';

export default function ShareModal({ open, onClose, file, sharedFileIds, sharedFolderIds, onShareCreated }) {
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  const [existingToken, setExistingToken] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const toast = useToast();
  const closeButtonRef = useRef(null);

  const isFile = file && (file._type === 'file' || file.original_name != null);
  const isFolder = file && (file._type === 'folder' || (file.name != null && file.original_name == null));
  const displayName = file ? (file.original_name ?? file.name) : '';
  const resourceId = file?.id;
  const alreadyShared = resourceId && (
    (isFile && sharedFileIds?.has(resourceId)) ||
    (isFolder && sharedFolderIds?.has(resourceId))
  );

  useEffect(() => {
    if (!open || !resourceId || !alreadyShared) {
      setExistingToken(null);
      return;
    }
    const fetchToken = async () => {
      try {
        const data = isFile
          ? await shareApi.getByFile(resourceId)
          : await shareApi.getByFolder(resourceId);
        setExistingToken(data?.token || null);
      } catch {
        setExistingToken(null);
      }
    };
    fetchToken();
  }, [open, resourceId, alreadyShared, isFile]);

  const createLink = async () => {
    if (!file) return null;
    setLoading(true);
    setShareResult(null);
    try {
      const payload = isFile ? { file_id: file.id } : { folder_id: file.id };
      const res = await shareApi.create(payload, {
        password: password || undefined,
        expires_at: expiresAt || undefined,
      });
      setShareResult(res);
      toast.success('Link berhasil dibuat');
      onShareCreated?.();
      return res?.token;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (err.response?.status === 501) {
        toast.error('Share folder memerlukan setup database. Jalankan migration shares_add_folder.sql.');
      } else {
        toast.error(msg);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (token) => {
    if (!token) return;
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link disalin');
  };

  const handleCopyForEveryone = async () => {
    const token = shareResult?.token || existingToken;
    if (token) {
      copyLink(token);
      return;
    }
    const newToken = await createLink();
    if (newToken) copyLink(newToken);
  };

  const close = () => {
    setShareResult(null);
    setExistingToken(null);
    setPassword('');
    setExpiresAt('');
    setEmailInput('');
    setShowOptions(false);
    onClose();
  };

  if (!file) return null;

  const shareLink = (shareResult?.token || existingToken)
    ? `${window.location.origin}/share/${shareResult?.token || existingToken}`
    : '';
  const hasLink = !!shareLink;

  return (
    <Dialog open={open} onClose={close} className="relative z-50" initialFocus={closeButtonRef}>
      <div className="fixed inset-0 bg-black/40 sm:bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <Dialog.Panel className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0">
          {/* Header - touch-friendly on mobile */}
          <div className="flex items-center justify-between p-4 sm:p-4 border-b border-gray-100 shrink-0">
            <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">
              Share &quot;{displayName}&quot;
            </Dialog.Title>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              className="p-2.5 -m-2.5 rounded-xl hover:bg-gray-100 text-gray-500 touch-manipulation"
              aria-label="Tutup"
            >
              <X className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-4 space-y-5">
            {/* Utama: link untuk semua (tanpa wajib email) */}
            <section>
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary-600 shrink-0" />
                Link untuk semua
              </p>
              {hasLink ? (
                <div className="space-y-3">
                  <input
                    readOnly
                    value={shareLink}
                    className="w-full px-3 py-3 sm:py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => copyLink(shareResult?.token || existingToken)}
                    className="w-full py-3 sm:py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 active:bg-primary-800 touch-manipulation min-h-[44px]"
                  >
                    <Copy className="w-4 h-4 inline-block mr-2 align-middle" />
                    Copy link
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCopyForEveryone}
                    disabled={loading}
                    className="w-full py-3 sm:py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 touch-manipulation min-h-[44px]"
                  >
                    {loading ? 'Membuat link...' : 'Buat link & copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOptions((o) => !o)}
                    className="w-full mt-2 py-2.5 text-sm text-gray-500 hover:text-gray-700 touch-manipulation"
                  >
                    {showOptions ? 'Sembunyikan opsi' : 'Password / kadaluarsa (opsional)'}
                  </button>
                  {showOptions && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-gray-100">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Password (opsional)</label>
                        <input
                          type="text"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Kosongkan = tanpa password"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Kadaluarsa (opsional)</label>
                        <input
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm min-h-[44px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={createLink}
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 touch-manipulation min-h-[44px]"
                      >
                        {loading ? 'Membuat...' : 'Buat link'}
                      </button>
                    </div>
                  )}
                </>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Siapa pun yang punya link bisa mengakses. Email tidak wajib.
              </p>
            </section>

            {/* Opsional: kirim ke email */}
            <section className="pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Opsional: kirim link ke email</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="alamat@email.com"
                  className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-200 rounded-xl text-sm min-h-[44px] sm:min-h-0 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!emailInput.trim()) {
                      toast.error('Isi email dulu');
                      return;
                    }
                    const token = shareResult?.token || existingToken;
                    if (token) {
                      copyLink(token);
                      toast.success(`Link disalin. Kirim ke ${emailInput.trim()}`);
                    } else {
                      const newToken = await createLink();
                      if (newToken) {
                        copyLink(newToken);
                        toast.success(`Link disalin. Kirim ke ${emailInput.trim()}`);
                      }
                    }
                  }}
                  disabled={loading}
                  className="py-2.5 sm:py-2 px-4 rounded-xl bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 touch-manipulation min-h-[44px] sm:min-h-0 shrink-0"
                >
                  Copy & kirim
                </button>
              </div>
            </section>
          </div>

          <div className="p-4 pt-0 sm:pt-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={close}
              className="w-full py-3 sm:py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 touch-manipulation min-h-[44px]"
            >
              Selesai
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
