import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

export function Bootstrap() {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      document.getElementById('app-loader')?.remove(),
    )
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
