export function formatDurationMinutes(minutes: number | undefined) {
  if (
    minutes === undefined ||
    !Number.isFinite(minutes) ||
    !Number.isInteger(minutes) ||
    minutes <= 0
  )
    return undefined

  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
