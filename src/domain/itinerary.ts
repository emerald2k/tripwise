import type { Day, Item } from '../data/schema'
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
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const eligible = sortItems(day.items).filter(
    (item) =>
      'progress' in item &&
      item.progress &&
      !statuses[item.itemId] &&
      item.startTime <= time,
  )
  return eligible[eligible.length - 1] ?? null
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
