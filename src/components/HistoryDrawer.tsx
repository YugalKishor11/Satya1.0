import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, onSelect }) => {
  const { history, user, clearHistory } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const filteredHistory = history.filter(
    (item) =>
      item.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.verdict.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to delete all verification dossiers? This cannot be undone.')) {
      setIsClearing(true);
      await clearHistory();
      setIsClearing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm z-[90] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl z-[100] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verification History</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email || 'Guest Analyst'}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search claims or verdicts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-400"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {history.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-xl">
                  📁
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">No historic dossiers yet</p>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  Run claim verifications in the Stream to build your truth archive.
                </p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm">No matches found for "{searchQuery}"</p>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const isTrue = item.verdict === 'TRUE';
                const isFalse = item.verdict === 'FALSE';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.report) {
                        onSelect(item);
                      }
                    }}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-400/50 transition-all group shadow-sm cursor-pointer hover:-translate-y-0.5"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isTrue
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                            : isFalse
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                        }`}
                      >
                        {item.verdict}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-500 transition-colors">
                      "{item.claim}"
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{item.snippet}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Clear */}
          {history.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950">
              <button
                onClick={handleClear}
                disabled={isClearing}
                className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isClearing ? 'Clearing...' : 'Clear All History'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryDrawer;
