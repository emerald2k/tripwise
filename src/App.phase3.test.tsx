import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { itineraryAlpha, itineraryBeta } = vi.hoisted(() => ({
  itineraryAlpha: {
    id: 'alpha',
    name: 'Alpha itinerary',
    days: [
      {
        date: '2026-09-10',
        title: 'Alpha day',
        items: [
          {
            itemId: 'alpha-item',
            startTime: '09:00',
            title: 'Alpha place',
            locationId: 'alpha-place',
          },
        ],
      },
    ],
  },
  itineraryBeta: {
    id: 'beta',
    name: 'Beta itinerary',
    days: [
      {
        date: '2026-09-11',
        title: 'Beta day',
        items: [
          {
            itemId: 'beta-item',
            startTime: '09:00',
            title: 'Beta place',
            locationId: 'beta-place',
          },
        ],
      },
    ],
  },
}))

vi.mock('./data', () => ({
  datasets: {
    itineraries: [itineraryAlpha, itineraryBeta],
    cities: [],
  },
  itineraries: new Map([
    ['alpha', itineraryAlpha],
    ['beta', itineraryBeta],
  ]),
  cities: [],
  locations: new Map([
    [
      'alpha-place',
      {
        locationId: 'alpha-place',
        name: 'Alpha place',
        category: 'attraction',
      },
    ],
    [
      'beta-place',
      {
        locationId: 'beta-place',
        name: 'Beta place',
        category: 'attraction',
      },
    ],
  ]),
  locationCities: new Map(),
  readActiveItineraryId: () =>
    localStorage.getItem('tripwise.activeItineraryId'),
  persistActiveItineraryId: (id: string) =>
    localStorage.setItem('tripwise.activeItineraryId', id),
}))

import App from './App'

describe('Phase 3 itinerary selection', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('shows selection when multiple itineraries have no active selection', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Select an itinerary' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Alpha itinerary' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Beta itinerary' })).toBeVisible()
  })

  it('persists the selected itinerary and uses it across routes', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Beta itinerary' }))

    expect(localStorage.getItem('tripwise.activeItineraryId')).toBe('beta')
    expect(screen.getByRole('heading', { name: 'Beta day' })).toBeVisible()
  })

  it('uses the selected itinerary for Days, Search, and day routes', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Beta itinerary' }))
    fireEvent.click(screen.getByRole('link', { name: 'Days' }))
    expect(screen.getByRole('strong')).toHaveTextContent('Beta day')

    fireEvent.click(screen.getByRole('link', { name: /11/ }))
    expect(screen.getByRole('heading', { name: 'Beta day' })).toBeVisible()

    fireEvent.click(screen.getByRole('link', { name: 'Search' }))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Beta place' },
    })
    fireEvent.click(screen.getByRole('link', { name: /11/ }))
    expect(screen.getByRole('heading', { name: 'Beta day' })).toBeVisible()
  })

  it('does not expose another itinerary in active-itinerary search', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Beta itinerary' }))
    fireEvent.click(screen.getByRole('link', { name: 'Search' }))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Alpha place' },
    })

    expect(screen.getByText('No days found.')).toBeVisible()
    expect(screen.queryByText('Alpha day')).not.toBeInTheDocument()
  })

  it('restores a valid persisted itinerary', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'beta')

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Beta day' })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Select an itinerary' }),
    ).not.toBeInTheDocument()
  })

  it('shows selection instead of silently using the first itinerary for a stale ID', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'stale-id')

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Select an itinerary' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Alpha day' }),
    ).not.toBeInTheDocument()
  })
})
