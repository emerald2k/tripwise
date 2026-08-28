import React from 'react'
import ReactDOM from 'react-dom/client'
import { brand } from './brand'
import { Bootstrap } from './Bootstrap'
import { ProductionErrorBoundary } from './recovery'
import serviceWorkerUrl from './sw.ts?worker&url'

document.title = brand.name

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProductionErrorBoundary>
      <Bootstrap />
    </ProductionErrorBoundary>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator)
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: '/', type: 'module' })
      .catch(() => undefined)
  })
