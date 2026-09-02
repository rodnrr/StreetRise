import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import clsx from 'clsx'
import { useToastStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import type { ToastMessage } from '@/types'

const ICONS = {
  success: <CheckCircle size={18} className="text-success-600" />,
  error:   <XCircle     size={18} className="text-danger-600" />,
  warning: <AlertTriangle size={18} className="text-warning-600" />,
  info:    <Info        size={18} className="text-primary-600" />,
}

const BG = {
  success: 'bg-success-50  border-success-500/30',
  error:   'bg-danger-50   border-danger-500/30',
  warning: 'bg-warning-50  border-warning-500/30',
  info:    'bg-primary-50  border-primary-500/30',
}

function Toast({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
  const { t } = useI18n()
  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-card-hover w-80 animate-slide-up',
        BG[toast.type]
      )}
      role="alert"
    >
      <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
        {toast.message && <p className="text-xs text-gray-600 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={t('common.dismiss')}
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onRemove={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  )
}
