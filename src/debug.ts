export interface DebugEnvironment {
  DEV: boolean
  VITE_DEBUG?: string
}

export function debugEnabled(environment: DebugEnvironment = import.meta.env) {
  return environment.DEV && environment.VITE_DEBUG === 'true'
}

export function diagnosticFor(
  error: unknown,
  environment: DebugEnvironment = import.meta.env,
) {
  if (!debugEnabled(environment)) return undefined
  if (error instanceof Error) return error.stack || error.message
  return String(error)
}
