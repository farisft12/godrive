import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useLanguage } from '../../context/LanguageContext';

const tabIds = [
  { id: 'general', labelKey: 'general' },
  { id: 'security', labelKey: 'security' },
  { id: 'notifications', labelKey: 'notifications' },
  { id: 'sharing', labelKey: 'sharing' },
  { id: 'storage', labelKey: 'storage' },
  { id: 'appearance', labelKey: 'appearance' },
];

export default function SettingsTabs({ children, activeTab, onTabChange }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="flex sm:flex-col overflow-x-auto sm:overflow-visible gap-1 sm:gap-0.5 pb-2 sm:pb-0 border-b sm:border-b-0 border-gray-200 sm:border-0 shrink-0">
        {tabIds.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </div>
    </div>
  );
}

export { tabIds as tabs };
