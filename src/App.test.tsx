import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

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
})
