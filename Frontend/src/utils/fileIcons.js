import {
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

const mimeToIcon = {
  'image/': PhotoIcon,
  'video/': FilmIcon,
  'audio/': MusicalNoteIcon,
  'application/pdf': DocumentTextIcon,
  'text/': DocumentTextIcon,
  'application/zip': ArchiveBoxIcon,
  'application/x-zip': ArchiveBoxIcon,
};

const extToIcon = {
  pdf: DocumentTextIcon,
  doc: DocumentTextIcon,
  docx: DocumentTextIcon,
  txt: DocumentTextIcon,
  md: DocumentTextIcon,
  js: CodeBracketIcon,
  ts: CodeBracketIcon,
  jsx: CodeBracketIcon,
  tsx: CodeBracketIcon,
  json: CodeBracketIcon,
  zip: ArchiveBoxIcon,
  rar: ArchiveBoxIcon,
};

export function getFileIcon(mimeType, filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && extToIcon[ext]) return extToIcon[ext];
  if (mimeType) {
    for (const [prefix, Icon] of Object.entries(mimeToIcon)) {
      if (mimeType.startsWith(prefix)) return Icon;
    }
  }
  return DocumentIcon;
}

export function getFileIconComponent(mimeType, filename) {
  return getFileIcon(mimeType, filename);
}

export function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond) {
  if (bytesPerSecond == null || bytesPerSecond <= 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.min(Math.floor(Math.log(bytesPerSecond) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isImage(mimeType) {
  return mimeType?.startsWith('image/');
}

export function isVideo(mimeType) {
  return mimeType?.startsWith('video/');
}

export function isPdf(mimeType) {
  return mimeType === 'application/pdf';
}

export function isText(mimeType) {
  return mimeType?.startsWith('text/');
}
