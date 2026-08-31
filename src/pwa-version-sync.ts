const versionPattern = /^\d+\.\d+\.\d+$/

interface VersionResponse {
  version?: unknown
}

export interface VersionServiceWorker {
  ready: Promise<{ update(): Promise<unknown> }>
  addEventListener(
    type: 'controllerchange',
    listener: () => void,
    options: AddEventListenerOptions,
  ): void
  removeEventListener(type: 'controllerchange', listener: () => void): void
}

export interface PwaVersionSyncOptions {
  installedVersion: string
  isOnline: () => boolean
  fetcher: typeof fetch
  serviceWorker?: VersionServiceWorker
  onUpdating: (version: string) => void
  onUpToDate: () => void
  reload: () => void
  timeoutMs?: number
}

export function isValidVersion(value: unknown): value is string {
  return typeof value === 'string' && versionPattern.test(value)
}

export async function checkPwaVersion({
  installedVersion,
  isOnline,
  fetcher,
  serviceWorker,
  onUpdating,
  onUpToDate,
  reload,
  timeoutMs = 5000,
}: PwaVersionSyncOptions) {
  if (!isOnline() || serviceWorker === undefined) return false

  let response: Response
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    response = await fetcher('/version.json', {
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
  if (!response.ok) return false

  let payload: VersionResponse
  try {
    payload = (await response.json()) as VersionResponse
  } catch {
    return false
  }
  if (!isValidVersion(payload.version)) return false
  if (payload.version === installedVersion) {
    onUpToDate()
    return false
  }

  try {
    const registration = await serviceWorker.ready
    const reloadOnce = () => reload()
    serviceWorker.addEventListener('controllerchange', reloadOnce, {
      once: true,
    })
    onUpdating(payload.version)
    try {
      await registration.update()
    } catch {
      serviceWorker.removeEventListener('controllerchange', reloadOnce)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function startPwaVersionSync(options: PwaVersionSyncOptions) {
  const check = () => void checkPwaVersion(options)
  check()
  window.addEventListener('online', check)
  return () => window.removeEventListener('online', check)
}
