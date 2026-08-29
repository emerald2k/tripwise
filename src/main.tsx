import React from 'react'
import ReactDOM from 'react-dom/client'
import { brand } from './brand'
import { Bootstrap } from './Bootstrap'
import { ProductionErrorBoundary } from './recovery'
import { registerServiceWorker } from './service-worker-registration'
import serviceWorkerUrl from './sw.ts?worker&url'

document.title = brand.name

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProductionErrorBoundary>
      <Bootstrap />
    </ProductionErrorBoundary>
  </React.StrictMode>,
)

registerServiceWorker(serviceWorkerUrl)
