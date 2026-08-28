import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { initializeRuntimeData, loadRuntimeData } from './data'
import {
  readInstallPrompt,
  subscribeToInstallPrompt,
  type BeforeInstallPromptEvent,
} from './install-prompt'
import { RecoveryScreen } from './recovery'

export function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(readInstallPrompt)

  useEffect(() => {
    let cancelled = false
    let frame = 0
    const unsubscribe = subscribeToInstallPrompt(setInstallPrompt)
    void loadRuntimeData()
      .then((data) => {
        if (cancelled) return
        initializeRuntimeData(data)
        frame = window.requestAnimationFrame(() => {
          document.getElementById('app-loader')?.remove()
          setReady(true)
        })
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        document.getElementById('app-loader')?.remove()
        setError(loadError)
      })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      unsubscribe()
    }
  }, [])

  if (error) return <RecoveryScreen error={error} />
  if (!ready) return null

  return (
    <BrowserRouter>
      <App initialInstallPrompt={installPrompt} />
    </BrowserRouter>
  )
}
