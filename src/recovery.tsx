import { Component, type ReactNode } from 'react'
import en from '../i18n/en.json'
import ro from '../i18n/ro.json'
import { diagnosticFor } from './debug'

type RecoveryCopy = typeof en

function recoveryCopy(): RecoveryCopy {
  try {
    if (localStorage.getItem('tripwise.language') === 'ro') return ro
  } catch {
    // Browser privacy settings can prevent local storage access.
  }
  return navigator.language.toLowerCase().startsWith('ro') ? ro : en
}

export function RecoveryScreen({
  error,
  onRetry = () => window.location.reload(),
}: {
  error: unknown
  onRetry?: () => void
}) {
  const copy = recoveryCopy()
  const diagnostic = diagnosticFor(error)
  return (
    <main className="recovery" aria-labelledby="recovery-title">
      <section className="recovery-card">
        <h1 id="recovery-title">{copy.recoveryTitle}</h1>
        <p>{copy.recoveryBody}</p>
        <button className="wide-button" onClick={onRetry}>
          {copy.recoveryRetry}
        </button>
        {diagnostic && <pre className="debug-diagnostic">{diagnostic}</pre>}
      </section>
    </main>
  )
}

export class ProductionErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown }
> {
  state: { error: unknown } = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  render() {
    if (this.state.error) return <RecoveryScreen error={this.state.error} />
    return this.props.children
  }
}
