import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import manifest from '../data/manifest.json'
import packageJson from '../package.json'
import App from './App'
import { appVersion } from './version'

function dispatchInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const prompt = vi.fn(() => Promise.resolve())
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: { value: Promise.resolve({ outcome }) },
  })
  fireEvent(window, event)
  return prompt
}

describe('day item presentation', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(
      'tripwise.activeItineraryId',
      manifest.itineraries[0].id,
    )
  })
  afterEach(() => cleanup())

  function renderDay() {
    return render(
      <MemoryRouter initialEntries={['/day/2026-09-04']}>
        <App />
      </MemoryRouter>,
    )
  }

  it('renders pending location items with actions and Google Maps', () => {
    renderDay()

    const item = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement
    expect(within(item).getByRole('button', { name: 'DONE' })).toBeVisible()
    expect(within(item).getByRole('button', { name: 'SKIP' })).toBeVisible()
    expect(
      within(item).getByRole('link', { name: /Navigate GMaps/ }),
    ).toBeVisible()
    expect(
      within(item).getByRole('link', { name: /Navigate GMaps/ }),
    ).toHaveClass('map-link')
    expect(
      within(item).getByRole('link', { name: /Navigate GMaps/ }).parentElement,
    ).toHaveClass('item-actions')
  })

  it('does not report a copied link when Clipboard is unavailable or rejects', async () => {
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })
    const unavailable = renderDay()
    fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }))
    expect(screen.getByRole('button', { name: 'Copy Link' })).toHaveTextContent(
      '↗',
    )
    unavailable.unmount()

    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    renderDay()
    fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Copy Link' })).toHaveTextContent(
      '↗',
    )
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  })

  it('does not give non-progress location items progress controls', () => {
    renderDay()

    const item = screen
      .getByRole('heading', { name: 'Hotel Le Roberval' })
      .closest('article') as HTMLElement
    expect(within(item).queryByRole('button', { name: 'DONE' })).toBeNull()
    expect(within(item).queryByRole('button', { name: 'SKIP' })).toBeNull()
    expect(
      within(item).getByRole('link', { name: /Navigate GMaps/ }),
    ).toBeVisible()
  })

  it('renders DONE items compactly with UNDO and without secondary content', () => {
    renderDay()
    const item = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement
    const doneButton = within(item).getByRole('button', { name: 'DONE' })

    fireEvent.click(doneButton)

    const heading = screen.getByRole('heading', { name: 'Notre-Dame Basilica' })
    expect(heading.closest('.timeline-item')).toHaveClass('is-compact')
    expect(within(item).getByRole('button', { name: 'UNDO' })).toBeVisible()
    expect(
      within(item).queryByRole('button', { name: 'DONE' }),
    ).not.toBeInTheDocument()
    expect(
      within(item).queryByRole('button', { name: 'SKIP' }),
    ).not.toBeInTheDocument()
  })

  it('renders SKIPPED items compactly with UNDO', () => {
    renderDay()
    const item = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement

    fireEvent.click(within(item).getByRole('button', { name: 'SKIP' }))

    const heading = within(item).getByRole('heading', {
      name: 'Notre-Dame Basilica',
    })
    expect(heading.closest('.timeline-item')).toHaveClass('is-compact')
    expect(within(item).getByRole('button', { name: 'UNDO' })).toBeVisible()
    expect(within(item).getByText('SKIP')).toBeVisible()
  })

  it('persists DONE through a remount and persists UNDO', () => {
    const view = renderDay()
    const item = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement

    fireEvent.click(within(item).getByRole('button', { name: 'DONE' }))
    view.unmount()

    const restored = renderDay()
    const restoredItem = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement
    expect(
      within(restoredItem).getByRole('button', { name: 'UNDO' }),
    ).toBeVisible()

    fireEvent.click(within(restoredItem).getByRole('button', { name: 'UNDO' }))
    restored.unmount()

    renderDay()
    const undoneItem = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement
    expect(
      within(undoneItem).getByRole('button', { name: 'DONE' }),
    ).toBeVisible()
  })

  it('persists SKIP through a remount', () => {
    const view = renderDay()
    const item = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement

    fireEvent.click(within(item).getByRole('button', { name: 'SKIP' }))
    view.unmount()

    renderDay()
    const restoredItem = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement
    expect(
      within(restoredItem).getByRole('button', { name: 'UNDO' }),
    ).toBeVisible()
    expect(within(restoredItem).getByText('SKIP')).toBeVisible()
  })

  it('uses the browser language fallback when no language is persisted', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    expect(document.documentElement.lang).toBe(
      navigator.language.toLowerCase().startsWith('en') ? 'en' : 'ro',
    )
  })

  it('changes the persisted language from Settings', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'RO' }))

    expect(document.documentElement.lang).toBe('ro')
    expect(localStorage.getItem('tripwise.language')).toBe('ro')
  })

  it('persists RO to EN to RO language changes across a remount', () => {
    const view = render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'RO' }))
    expect(screen.getByRole('heading', { name: 'Setări' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'RO' }))
    expect(screen.getByRole('heading', { name: 'Setări' })).toBeVisible()
    expect(localStorage.getItem('tripwise.language')).toBe('ro')

    view.unmount()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Setări' })).toBeVisible()
    expect(document.documentElement.lang).toBe('ro')
  })

  it('shows the localized empty state for a search with no matches', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'no matching itinerary content' },
    })
    expect(screen.getByText('No matches in your itinerary.')).toBeVisible()
  })

  it('renders the package version in Settings', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    expect(appVersion).toBe(packageJson.version)
    expect(screen.getByRole('paragraph')).toHaveTextContent(
      `Version ${packageJson.version}`,
    )
  })

  it('renders the existing not-found state for an invalid day route', () => {
    render(
      <MemoryRouter initialEntries={['/day/2099-01-01']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('No itinerary for this day.')).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'Days' })[0]).toBeVisible()
  })

  it('supports browser-style back navigation through the application routes', () => {
    render(
      <MemoryRouter initialEntries={['/', '/days']} initialIndex={1}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: /05/ }))
    expect(
      screen.getAllByRole('heading', { name: /Olympic Park|Old Port/ })[0],
    ).toBeVisible()

    fireEvent.click(screen.getByRole('link', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: /Back/ }))

    expect(
      screen.getAllByRole('heading', { name: /Olympic Park|Old Port/ })[0],
    ).toBeVisible()
  })

  it('renders transport details inline without progress controls', () => {
    render(
      <MemoryRouter initialEntries={['/day/2026-09-04']}>
        <App />
      </MemoryRouter>,
    )

    const timelineItem = screen
      .getByRole('heading', { name: 'Hotel Le Roberval → Notre-Dame Basilica' })
      .closest('.timeline-item') as HTMLElement
    expect(within(timelineItem).getByText(/walk/)).toBeVisible()
    expect(within(timelineItem).getByText(/20 min/)).toBeVisible()
    expect(within(timelineItem).getByText(/1.6 km/)).toBeVisible()
    expect(timelineItem.querySelector('.item-actions')).toBeNull()
  })

  it('renders visit duration without changing the timeline item', () => {
    renderDay()

    const item = screen
      .getByRole('heading', { name: 'Notre-Dame Basilica' })
      .closest('article') as HTMLElement
    expect(within(item).getByText('50 min')).toBeVisible()
    expect(item.closest('.timeline-item')).toBeInTheDocument()
  })

  it('scrolls Today to CURRENT and does not scroll a manual Day route', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 3, 20, 0))
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => undefined,
    })
    const scrollIntoView = vi
      .spyOn(window.HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined)

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    cleanup()
    scrollIntoView.mockClear()
    renderDay()
    expect(scrollIntoView).not.toHaveBeenCalled()

    scrollIntoView.mockRestore()
    vi.useRealTimers()
  })

  it('shows a first-visit install awareness prompt', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    dispatchInstallPrompt()

    expect(
      screen.getByRole('heading', { name: 'Install Volala' }),
    ).toBeVisible()
    expect(
      screen.getByText('Install the app for quick access and offline use.'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Install' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeVisible()
  })

  it('dismisses and persists the install awareness prompt', () => {
    const view = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    dispatchInstallPrompt()

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(localStorage.getItem('tripwise.installPromptSeen')).toBe('true')
    expect(
      screen.queryByRole('heading', { name: 'Install Volala' }),
    ).not.toBeInTheDocument()

    view.unmount()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('heading', { name: 'Install Volala' }),
    ).not.toBeInTheDocument()
  })

  it('uses the shared install flow without navigating to Settings', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    const prompt = dispatchInstallPrompt()

    fireEvent.click(screen.getByRole('button', { name: 'Install' }))

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('heading', { name: 'Settings' })).toBeNull()
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Install Volala' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('renders the install awareness prompt in Romanian', () => {
    localStorage.setItem('tripwise.language', 'ro')
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    dispatchInstallPrompt()

    expect(
      screen.getByRole('heading', { name: 'Instalează Volala' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Instalează' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Nu acum' })).toBeVisible()
  })

  it('uses the configured brand name in the English prompt', () => {
    localStorage.setItem('tripwise.language', 'en')
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    dispatchInstallPrompt()

    expect(
      screen.getByRole('heading', { name: 'Install Volala' }),
    ).toBeVisible()
    expect(
      screen.getByText('Install the app for quick access and offline use.'),
    ).toBeVisible()
    expect(screen.queryByText(/Tripwise/)).not.toBeInTheDocument()
  })

  it('does not show the prompt in standalone display mode', () => {
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('heading', { name: 'Install Volala' }),
    ).not.toBeInTheDocument()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    })
  })
})
