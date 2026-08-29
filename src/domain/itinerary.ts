import type { Day, Item, LocationItem } from '../data/schema'
import type { Status } from './progress'
import { localDate } from './date'

export function sortItems(items: Item[]) {
  return [...items].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function currentItem(
  day: Day,
  statuses: Record<string, Status>,
  now = new Date(),
) {
  if (localDate(now) !== day.date) return null
  const time = localTime(now)
  const eligible = sortItems(day.items).filter(
    (item) =>
      'progress' in item &&
      item.progress &&
      !statuses[item.itemId] &&
      item.startTime <= time,
  )
  return eligible[eligible.length - 1] ?? null
}

export function nextItem(
  day: Day,
  statuses: Record<string, Status>,
  now = new Date(),
) {
  const time = localTime(now)
  return (
    sortItems(day.items).find(
      (item) =>
        'progress' in item &&
        item.progress &&
        !statuses[item.itemId] &&
        item.startTime > time,
    ) ?? null
  )
}

export function activeLocationItems(day: Day, now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const locations = day.items.filter(
    (item): item is LocationItem => 'locationId' in item,
  )

  return locations.filter((item, index) => {
    const start = timeToMinutes(item.startTime)
    const nextStart = locations[index + 1]
      ? timeToMinutes(locations[index + 1].startTime)
      : undefined
    const end =
      nextStart ??
      (isValidDuration(item.durationMinutes) && start !== undefined
        ? start + item.durationMinutes
        : undefined)
    return (
      start !== undefined &&
      end !== undefined &&
      start <= currentMinutes &&
      currentMinutes < end
    )
  })
}

function timeToMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined
}

function isValidDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function localTime(now: Date) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function dayProgress(
  day: Day,
  statuses: Record<string, Status>,
  today = localDate(),
) {
  const trackable = day.items.filter(
    (item) => 'progress' in item && item.progress,
  )
  if (!trackable.length) return 'none' as const
  if (day.date < today) return 'complete' as const
  const completed = trackable.filter((item) => statuses[item.itemId]).length
  return completed === trackable.length
    ? ('complete' as const)
    : completed
      ? ('partial' as const)
      : ('none' as const)
}
