import React, { useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  details = null,
  confirmText = 'Delete',
  confirmVariant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-[#0B1120] border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl transition-all max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div
            className={`p-3 sm:p-3.5 rounded-2xl shrink-0 ${
              confirmVariant === 'danger'
                ? 'bg-rose-950/50 text-rose-400 border border-rose-800/60 shadow-lg shadow-rose-950/30'
                : 'bg-amber-950/50 text-amber-400 border border-amber-800/60'
            }`}
          >
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </h3>

            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {message}
            </p>

            {/* List of related items to be deleted */}
            {details && details.length > 0 && (
              <div className="mt-3.5 p-3.5 rounded-2xl bg-[#0F172A] border border-slate-800/90 text-xs">
                <p className="font-semibold text-rose-400 mb-2">
                  The following content will be permanently deleted:
                </p>
                <ul className="space-y-1 text-slate-300">
                  {details.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 rounded-xl transition-all min-h-[44px]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 min-h-[44px] ${
              confirmVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25 disabled:bg-rose-800'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25 disabled:bg-amber-800'
            }`}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
