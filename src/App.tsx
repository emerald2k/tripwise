import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import Fuse from 'fuse.js'
import {
  datasets,
  itineraries,
  locationCities,
  locations,
  persistActiveItineraryId,
  readActiveItineraryId,
} from './data'
import { localDate } from './domain/date'
import {
  currentItem,
  dayProgress,
  nextItem,
  sortItems,
} from './domain/itinerary'
import { isCompactStatus } from './domain/presentation'
import type { Day, Itinerary, Item } from './data/schema'
import {
  readProgress,
  resetItineraryProgress,
  setItemStatus,
  writeProgress,
  type ProgressStore,
  type Status,
} from './domain/progress'
import { brand } from './brand'
import { appVersion } from './version'
import ro from '../i18n/ro.json'
import en from '../i18n/en.json'
import './styles.css'

type Language = 'ro' | 'en'
type Copy = typeof ro
const translations: Record<Language, Copy> = { ro, en }

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const installPromptSeenKey = 'tripwise.installPromptSeen'

function isInstalledPwa() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    standaloneNavigator.standalone === true
  )
}

function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('tripwise.language')
    if (saved === 'ro' || saved === 'en') return saved
    return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'ro'
  })
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  const change = (value: Language) => {
    setLanguage(value)
    localStorage.setItem('tripwise.language', value)
    document.documentElement.lang = value
  }
  return { language, change, t: translations[language] }
}

export default function App() {
  const language = useLanguage()
  const [activeItinerary, setActiveItinerary] = useState<Itinerary | undefined>(
    () => {
      if (datasets.itineraries.length === 1) return datasets.itineraries[0]
      const savedId = readActiveItineraryId()
      const savedItinerary = savedId ? itineraries.get(savedId) : undefined
      if (savedId && !savedItinerary)
        localStorage.removeItem('tripwise.activeItineraryId')
      return savedItinerary
    },
  )
  const [progress, setProgress] = useState<ProgressStore>(() => readProgress())
  const [offline, setOffline] = useState(!navigator.onLine)
  const [deferredInstall, setDeferredInstall] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isInstalledPwa)
  const [showInstallAwareness, setShowInstallAwareness] = useState(
    () => !localStorage.getItem(installPromptSeenKey) && !isInstalledPwa(),
  )
  useEffect(() => {
    if (activeItinerary) persistActiveItineraryId(activeItinerary.id)
  }, [activeItinerary])

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const install = (event: Event) => {
      event.preventDefault()
      setDeferredInstall(event as BeforeInstallPromptEvent)
    }
    const installed = () => {
      setInstalled(true)
      setDeferredInstall(null)
      setShowInstallAwareness(false)
    }
    window.addEventListener('beforeinstallprompt', install)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('beforeinstallprompt', install)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  const updateStatus = (date: string, itemId: string, status?: Status) => {
    if (!activeItinerary) return
    const next = setItemStatus(
      progress,
      activeItinerary.id,
      date,
      itemId,
      status,
    )
    setProgress(next)
    writeProgress(next)
  }
  const reset = () => {
    if (!activeItinerary) return
    const next = resetItineraryProgress(progress, activeItinerary.id)
    setProgress(next)
    writeProgress(next)
  }
  const install = async () => {
    if (!deferredInstall) return
    await deferredInstall.prompt()
    await deferredInstall.userChoice
    setDeferredInstall(null)
    setShowInstallAwareness(false)
  }
  const dismissInstallAwareness = () => {
    localStorage.setItem(installPromptSeenKey, 'true')
    setShowInstallAwareness(false)
  }

  if (!activeItinerary && datasets.itineraries.length > 1)
    return (
      <div className="app">
        <header className="header">
          <Link className="brand" to="/">
            {brand.name}
          </Link>
        </header>
        <main>
          <section className="page itinerary-selection">
            <h1>{language.t.selectItinerary}</h1>
            <p>{language.t.chooseItinerary}</p>
            <div className="itinerary-list">
              {datasets.itineraries.map((itinerary) => (
                <button
                  className="wide-button"
                  key={itinerary.id}
                  onClick={() => setActiveItinerary(itinerary)}
                >
                  {itinerary.name}
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    )

  if (!activeItinerary)
    return (
      <div className="app">
        <header className="header">
          <Link className="brand" to="/">
            {brand.name}
          </Link>
        </header>
        <main>
          <section className="empty">
            <h1>{language.t.noDays}</h1>
          </section>
        </main>
      </div>
    )

  return (
    <div className="app">
      <header className="header">
        <Link className="brand" to="/">
          {brand.name}
        </Link>
        <div className="header-actions">
          {offline && (
            <span className="offline" title="Offline">
              ●
            </span>
          )}
          <Link
            className="settings-link"
            aria-label={language.t.settings}
            to="/settings"
          >
            ⚙
          </Link>
        </div>
      </header>
      <main>
        {showInstallAwareness && !installed && deferredInstall && (
          <InstallAwareness
            t={language.t}
            dismiss={dismissInstallAwareness}
            install={install}
          />
        )}
        <Routes>
          <Route
            path="/"
            element={
              <Today
                {...language}
                itinerary={activeItinerary}
                progress={progress}
                updateStatus={updateStatus}
              />
            }
          />
          <Route
            path="/days"
            element={
              <Days
                {...language}
                itinerary={activeItinerary}
                progress={progress}
              />
            }
          />
          <Route
            path="/search"
            element={<Search {...language} itinerary={activeItinerary} />}
          />
          <Route
            path="/settings"
            element={
              <Settings
                {...language}
                reset={reset}
                canInstall={!!deferredInstall}
                install={install}
              />
            }
          />
          <Route
            path="/day/:date"
            element={
              <DayRoute
                {...language}
                itinerary={activeItinerary}
                progress={progress}
                updateStatus={updateStatus}
              />
            }
          />
        </Routes>
      </main>
      <nav className="bottom-nav">
        <NavLink to="/">
          <NavIcon type="today" />
          <span>{language.t.today}</span>
        </NavLink>
        <NavLink to="/days">
          <NavIcon type="days" />
          <span>{language.t.days}</span>
        </NavLink>
        <NavLink to="/search">
          <NavIcon type="search" />
          <span>{language.t.search}</span>
        </NavLink>
      </nav>
    </div>
  )
}

type SharedProps = { t: Copy; language: Language }

function withBrandName(copy: string) {
  return copy.replace('{brandName}', brand.name)
}

function InstallAwareness({
  t,
  dismiss,
  install,
}: {
  t: Copy
  dismiss: () => void
  install: () => void
}) {
  return (
    <aside
      className="install-awareness"
      aria-labelledby="install-awareness-title"
    >
      <InstallIcon />
      <div>
        <h2 id="install-awareness-title">
          {withBrandName(t.installPromptTitle)}
        </h2>
        <div>{withBrandName(t.installPromptBody)}</div>
      </div>
      <div className="install-awareness-actions">
        <button
          className="button install-prompt-primary"
          type="button"
          onClick={install}
        >
          {t.installPromptInstall}
        </button>
        <button type="button" onClick={dismiss}>
          {t.installPromptDismiss}
        </button>
      </div>
    </aside>
  )
}

function InstallIcon() {
  return (
    <svg
      className="install-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="14" fill="#3f72d8" />
      <path
        d="M24 10v19m0 0-7-7m7 7 7-7M14 36h20"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  )
}

function NavIcon({ type }: { type: 'today' | 'days' | 'search' }) {
  if (type === 'search')
    return (
      <svg
        className="nav-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </svg>
    )
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4m8-4v4M4 9h16" />
      {type === 'today' && <path d="M8 13h3m2 0h3m-8 4h3m2 0h3" />}
    </svg>
  )
}

type DayProps = SharedProps & {
  itinerary: Itinerary
  progress: ProgressStore
  updateStatus: (date: string, itemId: string, status?: Status) => void
}

function Today(props: DayProps) {
  const now = new Date()
  const today = localDate(now)
  const day =
    props.itinerary.days.find((item) => item.date === today) ??
    props.itinerary.days[0]
  return <DayView {...props} day={day} today={day.date === today} now={now} />
}

function DayRoute(props: DayProps) {
  const { date } = useParams()
  const [searchParams] = useSearchParams()
  const day = props.itinerary.days.find((item) => item.date === date)
  if (!day)
    return (
      <section className="empty">
        <h1>{props.t.noItinerary}</h1>
        <Link className="button" to="/days">
          {props.t.days}
        </Link>
      </section>
    )
  return (
    <DayView
      {...props}
      day={day}
      highlightedItemId={searchParams.get('item') ?? undefined}
    />
  )
}

function DayView({
  day,
  itinerary,
  t,
  language,
  progress,
  updateStatus,
  today,
  now,
  highlightedItemId,
}: DayProps & {
  day: Day
  today?: boolean
  now?: Date
  highlightedItemId?: string
}) {
  const statuses = progress[itinerary.id]?.[day.date] || {}
  const ordered = sortItems(day.items)
  const [, refresh] = useState(0)
  const currentRef = useRef<HTMLDivElement>(null)
  const highlightedRef = useRef<HTMLDivElement>(null)
  const evaluationTime = now ?? new Date()
  const current = today ? currentItem(day, statuses, evaluationTime) : null
  useEffect(() => {
    if (!today) return
    const timer = window.setInterval(() => refresh((value) => value + 1), 30000)
    return () => window.clearInterval(timer)
  }, [today])
  useEffect(() => {
    if (!currentRef.current) return
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    currentRef.current.scrollIntoView?.({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    })
  }, [current?.itemId])
  useEffect(() => {
    if (!highlightedRef.current) return
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    highlightedRef.current.scrollIntoView?.({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    })
    highlightedRef.current.focus({ preventScroll: true })
  }, [highlightedItemId])
  const trackable = day.items.filter(
    (item) => 'progress' in item && item.progress,
  )
  const allDone =
    trackable.length > 0 && trackable.every((item) => statuses[item.itemId])
  const next =
    today && !current ? nextItem(day, statuses, evaluationTime) : null
  return (
    <section className="page day-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {today ? t.today : formatDate(day.date, language)}
          </span>
          <h1>{day.title || cityNames(day)}</h1>
        </div>
        {today && current && <span className="current-label">{t.current}</span>}
      </div>
      {today && next && (
        <p className="up-next">
          {t.upNext}: {next.startTime} · {next.title}
        </p>
      )}
      {allDone && <p className="all-done">{t.allDone}</p>}
      <div className="timeline">
        {ordered.map((item) => {
          const location =
            'locationId' in item ? locations.get(item.locationId) : undefined
          const status = 'progress' in item ? statuses[item.itemId] : undefined
          const compact = isCompactStatus(status)
          const highlighted = highlightedItemId === item.itemId
          return (
            <div
              ref={
                highlighted
                  ? highlightedRef
                  : current?.itemId === item.itemId
                    ? currentRef
                    : undefined
              }
              className={`timeline-item ${current?.itemId === item.itemId ? 'is-current' : ''} ${highlighted ? 'is-search-match' : ''} ${compact ? 'is-compact' : ''}`}
              key={item.itemId}
              tabIndex={highlighted ? -1 : undefined}
            >
              {'transport' in item && (
                <TransportInfo transport={item.transport} />
              )}
              <article className="item-card">
                <div className="item-time">{item.startTime}</div>
                <div className="item-content">
                  <div className="item-main">
                    {compact && (
                      <span
                        className={`status-icon ${status === 'skipped' ? 'is-skipped' : ''}`}
                        aria-hidden="true"
                      >
                        {status === 'skipped' ? '−' : '✓'}
                      </span>
                    )}
                    <h2>{location?.name || item.title}</h2>
                    {highlighted && (
                      <span className="search-match-label">
                        {t.searchMatch}
                      </span>
                    )}
                    {compact && (
                      <span className="item-status">
                        {status === 'skipped' ? t.skip : t.done}
                      </span>
                    )}
                    {!compact &&
                      location?.name &&
                      item.title !== location.name && <p>{item.title}</p>}
                    {!compact && location?.description && (
                      <p>{location.description}</p>
                    )}
                    {'durationMinutes' in item && item.durationMinutes && (
                      <span className="muted">{item.durationMinutes} min</span>
                    )}
                    {'progress' in item && item.progress && (
                      <div className="item-actions">
                        {status ? (
                          <button
                            onClick={() => updateStatus(day.date, item.itemId)}
                          >
                            {t.undo}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                updateStatus(day.date, item.itemId, 'done')
                              }
                            >
                              {t.done}
                            </button>
                            <button
                              onClick={() =>
                                updateStatus(day.date, item.itemId, 'skipped')
                              }
                            >
                              {t.skip}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {location?.googleMapsUrl && (
                      <a
                        className="map-link"
                        href={location.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <GoogleMapsIcon />
                        {t.navigate}
                      </a>
                    )}
                  </div>
                </div>
              </article>
            </div>
          )
        })}
      </div>
      <ShareButton t={t} />
    </section>
  )
}

function GoogleMapsIcon() {
  return (
    <svg
      className="maps-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Z"
      />
      <path
        fill="#EA4335"
        d="M12 2a7 7 0 0 0-7 7c0 .7.1 1.4.3 2h13.4c.2-.6.3-1.3.3-2a7 7 0 0 0-7-7Z"
      />
      <path
        fill="#FBBC04"
        d="M5.3 11h13.4c-.8 3.2-3.8 7.2-6.7 11 0 0-5.8-6.4-6.7-11Z"
      />
      <circle cx="12" cy="9" r="2.4" fill="#fff" />
    </svg>
  )
}

function TransportInfo({
  transport,
}: {
  transport: Extract<Item, { transport: unknown }>['transport']
}) {
  const parts = [
    transport.mode,
    transport.durationMinutes ? `${transport.durationMinutes} min` : '',
    transport.distanceMeters !== undefined
      ? formatDistance(transport.distanceMeters)
      : '',
  ].filter(Boolean)
  return parts.length ? (
    <div className="transport">↓ {parts.join(' · ')}</div>
  ) : null
}

function Days({
  t,
  language,
  itinerary,
  progress,
}: SharedProps & { itinerary: Itinerary; progress: ProgressStore }) {
  const today = localDate()
  return (
    <section className="page">
      <h1>{t.days}</h1>
      <div className="day-list">
        {itinerary.days.map((day) => {
          const state = dayProgress(
            day,
            progress[itinerary.id]?.[day.date] || {},
            today,
          )
          return (
            <Link to={`/day/${day.date}`} className="day-row" key={day.date}>
              <span>{formatDate(day.date, language)}</span>
              <strong>{cityNames(day)}</strong>
              <span className="indicator">
                {state === 'complete' ? '✓' : state === 'partial' ? '◐' : '○'}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function Search({
  t,
  language,
  itinerary,
}: SharedProps & { itinerary: Itinerary }) {
  const [query, setQuery] = useState('')
  const entries = useMemo(
    () =>
      itinerary.days.flatMap((day) =>
        day.items.map((item) => {
          const location =
            'locationId' in item ? locations.get(item.locationId) : undefined
          return {
            day,
            item,
            location,
            text: [
              item.title,
              location?.name,
              location?.description,
              location?.address,
              location?.category,
              'locationId' in item
                ? locationCities.get(item.locationId)
                : item.transport.mode,
            ]
              .filter(Boolean)
              .join(' '),
          }
        }),
      ),
    [itinerary],
  )
  const fuse = useMemo(
    () => new Fuse(entries, { keys: ['text'], threshold: 0.35 }),
    [entries],
  )
  const matches = query.trim()
    ? fuse.search(query).map((result) => result.item)
    : []
  const resultDays = itinerary.days
    .map((day) => ({
      day,
      matches: matches.filter((match) => match.day.date === day.date),
    }))
    .filter((result) => result.matches.length)
  return (
    <section className="page">
      <h1>{t.search}</h1>
      <input
        className="search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.search}
        aria-label={t.search}
      />
      {query.trim() && (
        <div className="search-results">
          {resultDays.length ? (
            resultDays.map(({ day, matches }) => (
              <section className="search-day" key={day.date}>
                <h2>
                  {formatDate(day.date, language)}
                  {day.title && <span>{day.title}</span>}
                </h2>
                {matches.map(({ item, location }) => {
                  const name = location?.name || item.title
                  const detail =
                    location?.name && item.title !== location.name
                      ? item.title
                      : location?.description || location?.address
                  return (
                    <Link
                      to={`/day/${day.date}?item=${encodeURIComponent(item.itemId)}`}
                      className="result-row"
                      key={item.itemId}
                      aria-label={`${item.startTime} ${name}${detail ? `. ${detail}` : ''}`}
                    >
                      <span>{item.startTime}</span>
                      <strong>{name}</strong>
                      {detail && (
                        <span className="search-result-detail">{detail}</span>
                      )}
                    </Link>
                  )
                })}
              </section>
            ))
          ) : (
            <p className="muted">{t.noResults}</p>
          )}
        </div>
      )}
    </section>
  )
}

function Settings({
  t,
  language,
  change,
  reset,
  canInstall,
  install,
}: SharedProps & {
  change: (language: Language) => void
  reset: () => void
  canInstall: boolean
  install: () => void
}) {
  const navigate = useNavigate()
  return (
    <section className="page settings">
      <button className="back" onClick={() => navigate(-1)}>
        ← {t.back}
      </button>
      <h1>{t.settings}</h1>
      <h2>{t.language}</h2>
      <div className="language-buttons">
        <button
          className={language === 'ro' ? 'selected' : ''}
          onClick={() => change('ro')}
        >
          RO
        </button>
        <button
          className={language === 'en' ? 'selected' : ''}
          onClick={() => change('en')}
        >
          EN
        </button>
      </div>
      {canInstall && (
        <button className="wide-button" onClick={install}>
          {t.install}
        </button>
      )}
      <p className="app-version">
        {t.version} {appVersion}
      </p>
      <button
        className="danger wide-button"
        onClick={() => window.confirm(t.confirmReset) && reset()}
      >
        {t.reset}
      </button>
    </section>
  )
}

function ShareButton({ t }: { t: Copy }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    if (navigator.share)
      await navigator.share({ title: brand.name, url: window.location.href })
    else {
      await navigator.clipboard?.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }
  return (
    <button className="share" onClick={share}>
      {copied ? t.copyLink : '↗'}
    </button>
  )
}

function cityNames(day: Day) {
  const names = [
    ...new Set(
      day.items.flatMap((item) =>
        'locationId' in item ? [locationCities.get(item.locationId)] : [],
      ),
    ),
  ]
  return names.filter(Boolean).join(' · ') || day.title || ''
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-CA', {
    day: '2-digit',
    month: 'short',
  })
    .format(new Date(`${value}T12:00:00`))
    .toUpperCase()
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`
}
