import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';

export default function RenameModal({ open, onClose, item, onRename, type = 'file' }) {
  const [name, setName] = useState('');
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (item) {
      setName(type === 'file' ? item.original_name : item.name);
    }
  }, [item, type, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onRename?.(name.trim());
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50" initialFocus={closeButtonRef}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-4">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Rename {type}</Dialog.Title>
            <button ref={closeButtonRef} type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-4"
              placeholder={type === 'file' ? 'File name' : 'Folder name'}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
                Save
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
