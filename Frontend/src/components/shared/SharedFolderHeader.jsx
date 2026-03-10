import { FolderOpen, Calendar, Users } from 'lucide-react';
import { formatSize } from '../../utils/fileIcons';

export default function SharedFolderHeader({
  folderName,
  ownerName = 'GoDrive user',
  fileCount,
  totalSize,
  lastUpdated,
  collaborators = [],
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {folderName || 'Shared folder'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Shared by {ownerName}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-600">
                <span>
                  {fileCount} {fileCount === 1 ? 'file' : 'files'}
                </span>
                <span className="text-gray-300">•</span>
                <span>{formatSize(totalSize)}</span>
                {lastUpdated && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {lastUpdated}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" />
            Siapa yang punya akses
          </h3>
          <ul className="space-y-1.5 text-sm">
            <li className="text-gray-700">Siapa pun dengan link: Lihat</li>
            {collaborators.map((c) => (
              <li key={c.id} className="text-gray-700">
                {c.user_name || c.email} — {c.role === 'edit' ? 'Edit' : 'Lihat'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
