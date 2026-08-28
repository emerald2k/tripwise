import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { initializeRuntimeData, loadRuntimeData } from './data'
import {
  readInstallPrompt,
  subscribeToInstallPrompt,
  type BeforeInstallPromptEvent,
} from './install-prompt'

export function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(readInstallPrompt)

  useEffect(() => {
    let cancelled = false
    let frame = 0
    const unsubscribe = subscribeToInstallPrompt(setInstallPrompt)
    void loadRuntimeData().then((data) => {
      if (cancelled) return
      initializeRuntimeData(data)
      frame = window.requestAnimationFrame(() => {
        document.getElementById('app-loader')?.remove()
        setReady(true)
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      unsubscribe()
    }
  }, [])

  if (!ready) return null

  return (
    <BrowserRouter>
      <App initialInstallPrompt={installPrompt} />
    </BrowserRouter>
  )
}
