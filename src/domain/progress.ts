export type Status = 'done' | 'skipped'
export type ProgressStore = Record<
  string,
  Record<string, Record<string, Status>>
>
const KEY = 'tripwise.progress'

export function readProgress(): ProgressStore {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const result: ProgressStore = {}
    for (const [itineraryId, days] of Object.entries(value)) {
      if (!days || typeof days !== 'object' || Array.isArray(days)) continue
      for (const [date, items] of Object.entries(days)) {
        if (!items || typeof items !== 'object' || Array.isArray(items))
          continue
        for (const [itemId, status] of Object.entries(items)) {
          if (status === 'done' || status === 'skipped') {
            result[itineraryId] ||= {}
            result[itineraryId][date] ||= {}
            result[itineraryId][date][itemId] = status
          }
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function writeProgress(value: ProgressStore) {
  localStorage.setItem(KEY, JSON.stringify(value))
}

export function setItemStatus(
  store: ProgressStore,
  itineraryId: string,
  date: string,
  itemId: string,
  status?: Status,
) {
  const next = structuredClone(store)
  next[itineraryId] ||= {}
  next[itineraryId][date] ||= {}
  if (status) next[itineraryId][date][itemId] = status
  else delete next[itineraryId][date][itemId]
  return next
}

export function resetItineraryProgress(
  store: ProgressStore,
  itineraryId: string,
) {
  const next = structuredClone(store)
  delete next[itineraryId]
  return next
}
