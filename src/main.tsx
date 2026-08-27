import React from 'react'
import ReactDOM from 'react-dom/client'
import { brand } from './brand'
import { Bootstrap } from './Bootstrap'

document.title = brand.name

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator)
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('/sw.js'),
  )
