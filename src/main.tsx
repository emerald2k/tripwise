import React from 'react'
import ReactDOM from 'react-dom/client'
import { brand } from './brand'
import { Bootstrap } from './Bootstrap'
import serviceWorkerUrl from './sw.ts?worker&url'

document.title = brand.name

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator)
  window.addEventListener('load', () =>
    navigator.serviceWorker.register(serviceWorkerUrl, {
      scope: '/',
      type: 'module',
    }),
  )
