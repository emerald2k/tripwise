interface ServiceWorkerContainer {
  register(
    scriptURL: string,
    options: RegistrationOptions,
  ): Promise<ServiceWorkerRegistration>
}

export function registerServiceWorker(
  scriptUrl: string,
  serviceWorker: ServiceWorkerContainer | undefined = navigator.serviceWorker,
) {
  if (serviceWorker === undefined) return
  window.addEventListener(
    'load',
    () => {
      void serviceWorker
        .register(scriptUrl, { scope: '/', type: 'module' })
        .catch(() => undefined)
    },
    { once: true },
  )
}
