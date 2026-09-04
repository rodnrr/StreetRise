import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

/** Shown on /housing and on every housing listing. */
export default function ScamWarningLink({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 ${className ?? ''}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('housing.scams.linkTitle')}
          </h2>
          <p className="mt-1 text-base text-slate-700 dark:text-slate-300">
            {t('housing.scams.linkBody')}
          </p>
          <Link
            to="/housing/scams"
            className="mt-2 inline-block text-base font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
          >
            {t('housing.scams.linkCta')}
          </Link>
        </div>
      </div>
    </div>
  )
}
