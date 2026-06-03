import { createPortal } from 'react-dom';
import { useToast } from '../context/ToastContext';
import type { Toast, ToastType } from '../context/ToastContext';

const ICONS: Record<ToastType, string> = {
  error:   '✕',
  success: '✓',
  warning: '⚠',
  info:    'ℹ',
};

const STYLES: Record<ToastType, { bar: string; icon: string; bg: string; border: string; text: string }> = {
  error: {
    bar:    'bg-red-500',
    icon:   'bg-red-500/20 text-red-300',
    bg:     'bg-slate-900/95',
    border: 'border-red-500/40',
    text:   'text-red-100',
  },
  success: {
    bar:    'bg-emerald-500',
    icon:   'bg-emerald-500/20 text-emerald-300',
    bg:     'bg-slate-900/95',
    border: 'border-emerald-500/40',
    text:   'text-emerald-100',
  },
  warning: {
    bar:    'bg-amber-500',
    icon:   'bg-amber-500/20 text-amber-300',
    bg:     'bg-slate-900/95',
    border: 'border-amber-500/40',
    text:   'text-amber-100',
  },
  info: {
    bar:    'bg-violet-500',
    icon:   'bg-violet-500/20 text-violet-300',
    bg:     'bg-slate-900/95',
    border: 'border-violet-500/40',
    text:   'text-violet-100',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const s = STYLES[toast.type];
  return (
    <div
      className={`
        relative flex items-start gap-3 w-full max-w-sm rounded-xl border shadow-2xl
        backdrop-blur-md overflow-hidden px-4 py-3
        ${s.bg} ${s.border}
        animate-[slideIn_0.25s_ease-out]
      `}
      role="alert"
    >
      {/* Colored left bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />

      {/* Icon */}
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${s.icon}`}>
        {ICONS[toast.type]}
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium leading-snug pt-0.5 ${s.text}`}>
        {toast.message}
      </p>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none mt-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function Toaster() {
  const { toasts, dismiss } = useToast();

  return createPortal(
    <div
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full">
          <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>,
    document.body
  );
}
