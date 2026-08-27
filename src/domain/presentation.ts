import type { Status } from './progress'

export function isCompactStatus(status: Status | undefined) {
  return status === 'done' || status === 'skipped'
}
