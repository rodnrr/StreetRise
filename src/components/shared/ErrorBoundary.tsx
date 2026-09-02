import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLangStore } from '@/lib/store'
import { translate } from '@/lib/i18n'

/**
 * Last line of defence against a blank page.
 *
 * React unmounts the entire tree when a render throws and nothing catches it,
 * which renders as a completely empty document — no header, no footer, no
 * message, and nothing in the console for a non-technical reporter to pass on.
 * "It takes me to an empty page" is genuinely all the information that failure
 * mode produces, which makes it expensive to diagnose remotely.
 *
 * This turns that into something a person can act on and report, and gives
 * them a working way out of it.
 */
type Props = { children: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept as console.error rather than a logging service: there is no error
    // reporting wired up yet, and a silent failure is what caused the problem
    // this boundary exists to solve.
    console.error('[StreetRise] render failed', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    // A class component can't call the useI18n() hook, and this fallback has
    // to render correctly even if the render that crashed was itself
    // language-related — reading the persisted store directly keeps this
    // boundary simple and independent of whatever broke above it.
    const lang = useLangStore.getState().lang
    const t = (key: string) => translate(lang, key)

    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-white">
        <p className="text-5xl mb-4">😞</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('errorBoundary.title')}</h1>
        <p className="text-gray-500 mb-6 max-w-sm">
          {t('errorBoundary.body')}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={() => window.location.reload()} className="btn-primary">
            {t('errorBoundary.reload')}
          </button>
          <a href="/" className="btn-secondary">{t('errorBoundary.backToHome')}</a>
        </div>
        <p className="text-xs text-gray-400 mt-8 max-w-sm break-words">
          {t('errorBoundary.reportNotice')}
          <br />
          <code className="text-gray-500">{error.message || String(error)}</code>
        </p>
      </div>
    )
  }
}
