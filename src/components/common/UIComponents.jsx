import React from 'react';

export function LoadingSpinner({ text = 'Loading...', size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size] || 'w-8 h-8 border-3';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-400">
      <div className={`${sizeClasses} border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-3`} />
      {text && <p className="text-sm font-medium text-slate-400">{text}</p>}
    </div>
  );
}

export function StatCard({ title, value, subValue, icon: Icon, trend, trendValue, color = 'emerald' }) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-600">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl border ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight font-mono">{value}</div>
      {(subValue || trendValue) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          {trendValue && (
            <span
              className={`font-semibold px-1.5 py-0.5 rounded ${
                trend === 'up'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : trend === 'down'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {trendValue}
            </span>
          )}
          {subValue && <span>{subValue}</span>}
        </div>
      )}
    </div>
  );
}

export function Badge({ children, variant = 'default', size = 'sm' }) {
  const variantClasses = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    applied: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    allotted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    not_allotted: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    listed: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    closed: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
    buy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    sell: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    ipo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    stock: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  };

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${
        variantClasses[variant] || variantClasses.default
      } ${sizeClasses[size] || sizeClasses.sm}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, actionText, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-slate-800/40 border border-slate-800 rounded-3xl">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
          <Icon className="w-8 h-8 text-emerald-400/80" />
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full ${maxWidth} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', isDestructive = true }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-300">{message}</p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition-all active:scale-95 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
