import clsx from 'clsx'
import { Languages } from 'lucide-react'
import { useI18n, LANGUAGES } from '@/lib/i18n'

/**
 * Compact EN / ES language switch for the public UI chrome.
 * Persists the choice via useLangStore (see @/lib/i18n + @/lib/store).
 */
export default function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      className={clsx('inline-flex items-center gap-1 rounded-full bg-gray-100 p-0.5 dark:bg-slate-800', className)}
      role="group"
      aria-label={t('lang.switch')}
    >
      <Languages size={14} className="ml-1.5 mr-0.5 shrink-0 text-gray-400" aria-hidden="true" />
      {LANGUAGES.map(({ code, label, short }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          aria-label={label}
          title={label}
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-semibold transition-colors',
            lang === code
              ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {short}
        </button>
      ))}
    </div>
  )
}
