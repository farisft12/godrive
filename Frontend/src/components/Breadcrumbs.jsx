import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items = [] }) {
  if (items.length === 0) {
    return (
      <span className="text-sm font-medium text-gray-700">My Files</span>
    );
  }

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto min-w-0">
      <Link
        to="/dashboard"
        className="text-primary-600 hover:text-primary-700 font-medium shrink-0"
      >
        My Files
      </Link>
      {items.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="w-4 h-4 text-gray-300" />
          {i === items.length - 1 ? (
            <span className="font-medium text-gray-900 truncate max-w-[180px]">
              {item.name}
            </span>
          ) : (
            <Link
              to={`/dashboard/${item.id}`}
              className="text-gray-600 hover:text-gray-900 truncate max-w-[180px]"
            >
              {item.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
