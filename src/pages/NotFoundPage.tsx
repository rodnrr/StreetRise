import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
export default function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <p className="text-6xl mb-4">🗺️</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('notFound.title')}</h1>
      <p className="text-gray-500 mb-6">{t('notFound.body')}</p>
      <Link to="/map" className="btn-primary">{t('notFound.backToMap')}</Link>
    </div>
  )
}
