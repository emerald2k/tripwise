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
import { startPwaVersionSync } from './pwa-version-sync'
import { appVersion } from './version'

export function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(readInstallPrompt)
  const [updatingVersion, setUpdatingVersion] = useState<string>()
  const [versionChecked, setVersionChecked] = useState(false)

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

  useEffect(() => {
    if (!ready) return
    const clearVersionCheck = () => setVersionChecked(false)
    window.addEventListener('offline', clearVersionCheck)
    const stopVersionSync = startPwaVersionSync({
      installedVersion: appVersion,
      isOnline: () => navigator.onLine,
      fetcher: fetch,
      serviceWorker: navigator.serviceWorker,
      onUpdating: (version) => {
        setVersionChecked(false)
        setUpdatingVersion(version)
      },
      onUpToDate: () => setVersionChecked(true),
      reload: () => window.location.reload(),
    })
    return () => {
      stopVersionSync()
      window.removeEventListener('offline', clearVersionCheck)
    }
  }, [ready])

  if (error) return <RecoveryScreen error={error} />
  if (!ready) return null

  return (
    <>
      {updatingVersion && (
        <p className="version-update-status" role="status">
          Updating to latest version v{updatingVersion}
        </p>
      )}
      <BrowserRouter>
        <App
          initialInstallPrompt={installPrompt}
          versionChecked={versionChecked}
        />
      </BrowserRouter>
    </>
  )
}
