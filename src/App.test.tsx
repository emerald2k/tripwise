import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import packageJson from '../package.json'
import App from './App'
import { appVersion } from './version'

describe('day item presentation', () => {
  beforeEach(() => localStorage.clear())
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
})
