import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { initializeRuntimeData, loadRuntimeData } from './data'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    let cancelled = false
    let frame = 0
    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
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
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
    }
  }, [])

  if (!ready) return null

  return (
    <BrowserRouter>
      <App initialInstallPrompt={installPrompt} />
    </BrowserRouter>
  )
}
