export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<(event: BeforeInstallPromptEvent) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event as BeforeInstallPromptEvent
    listeners.forEach((listener) => listener(deferredInstallPrompt!))
  })
}

export function readInstallPrompt() {
  return deferredInstallPrompt
}

export function subscribeToInstallPrompt(
  listener: (event: BeforeInstallPromptEvent) => void,
) {
  listeners.add(listener)
  if (deferredInstallPrompt) listener(deferredInstallPrompt)
  return () => listeners.delete(listener)
}
