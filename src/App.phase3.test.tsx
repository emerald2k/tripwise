import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
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
            progress: true,
          },
          {
            itemId: 'alpha-museum',
            startTime: '14:00',
            title: 'Alpha museum',
            locationId: 'alpha-museum',
          },
          {
            itemId: 'alpha-mapped-place',
            startTime: '15:00',
            title: 'Alpha mapped place',
            locationId: 'alpha-mapped-place',
            progress: true,
          },
          {
            itemId: 'alpha-mapped-information',
            startTime: '16:00',
            title: 'Alpha mapped information',
            locationId: 'alpha-mapped-information',
          },
          {
            itemId: 'alpha-transport',
            startTime: '17:00',
            title: 'Alpha transfer',
            transport: { mode: 'walk' },
          },
        ],
      },
      {
        date: '2026-09-11',
        title: 'Middle day',
        items: [
          {
            itemId: 'alpha-middle-transfer',
            startTime: '10:00',
            title: 'Middle transfer',
            transport: { mode: 'train' },
          },
        ],
      },
      {
        date: '2026-09-12',
        title: 'Alpha follow up',
        items: [
          {
            itemId: 'alpha-return',
            startTime: '10:00',
            title: 'Alpha place revisit',
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
            progress: true,
          },
        ],
      },
    ],
  },
}))

vi.mock('./data', () => ({
  getRuntimeData: () => ({
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
          description: 'Waterfront landmark',
        },
      ],
      [
        'alpha-museum',
        {
          locationId: 'alpha-museum',
          name: 'Alpha museum',
          category: 'attraction',
          address: 'Museum secondary detail',
        },
      ],
      [
        'alpha-mapped-place',
        {
          locationId: 'alpha-mapped-place',
          name: 'Alpha mapped place',
          category: 'attraction',
          googleMapsUrl: 'https://www.google.com/maps/place/alpha',
        },
      ],
      [
        'alpha-mapped-information',
        {
          locationId: 'alpha-mapped-information',
          name: 'Alpha mapped information',
          category: 'other',
          googleMapsUrl: 'https://www.google.com/maps/place/information',
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
  }),
  readActiveItineraryId: () =>
    localStorage.getItem('tripwise.activeItineraryId'),
  persistActiveItineraryId: (id: string) =>
    localStorage.setItem('tripwise.activeItineraryId', id),
  resolveActiveItinerary: (
    itineraries: (typeof itineraryAlpha)[],
    storedId: string | null,
  ) =>
    itineraries.length === 1
      ? itineraries[0]
      : itineraries.find((itinerary) => itinerary.id === storedId),
}))

import App from './App'

describe('Phase 3 itinerary selection', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('keeps progress controls for visitable locations without Google Maps', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'alpha')
    render(
      <MemoryRouter initialEntries={['/day/2026-09-10']}>
        <App />
      </MemoryRouter>,
    )

    const item = screen
      .getByRole('heading', { name: 'Alpha place' })
      .closest('article') as HTMLElement
    expect(within(item).getByRole('button', { name: 'DONE' })).toBeVisible()
    expect(within(item).getByRole('button', { name: 'SKIP' })).toBeVisible()
    expect(
      within(item).queryByRole('link', { name: /Navigate GMaps/ }),
    ).toBeNull()
  })

  it('renders actions from item progress and Maps availability independently', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'alpha')
    render(
      <MemoryRouter initialEntries={['/day/2026-09-10']}>
        <App />
      </MemoryRouter>,
    )

    const progressWithMaps = screen
      .getByRole('heading', { name: 'Alpha mapped place' })
      .closest('article') as HTMLElement
    expect(
      within(progressWithMaps).getByRole('button', { name: 'DONE' }),
    ).toBeVisible()
    expect(
      within(progressWithMaps).getByRole('button', { name: 'SKIP' }),
    ).toBeVisible()
    expect(
      within(progressWithMaps).getByRole('link', { name: /Navigate GMaps/ }),
    ).toBeVisible()

    fireEvent.click(
      within(progressWithMaps).getByRole('button', { name: 'DONE' }),
    )
    expect(
      within(progressWithMaps).getByRole('button', { name: 'UNDO' }),
    ).toBeVisible()
    expect(
      within(progressWithMaps).getByRole('link', { name: /Navigate GMaps/ }),
    ).toBeVisible()
    fireEvent.click(
      within(progressWithMaps).getByRole('button', { name: 'UNDO' }),
    )
    fireEvent.click(
      within(progressWithMaps).getByRole('button', { name: 'SKIP' }),
    )
    expect(
      within(progressWithMaps).getByRole('button', { name: 'UNDO' }),
    ).toBeVisible()

    const informationWithMaps = screen
      .getByRole('heading', { name: 'Alpha mapped information' })
      .closest('article') as HTMLElement
    expect(
      within(informationWithMaps).queryByRole('button', { name: 'DONE' }),
    ).toBeNull()
    expect(
      within(informationWithMaps).queryByRole('button', { name: 'SKIP' }),
    ).toBeNull()
    expect(
      within(informationWithMaps).getByRole('link', {
        name: /Navigate GMaps/,
      }),
    ).toBeVisible()

    const informationWithoutMaps = screen
      .getByRole('heading', { name: 'Alpha museum' })
      .closest('article') as HTMLElement
    expect(
      within(informationWithoutMaps).queryByRole('button', { name: 'DONE' }),
    ).toBeNull()
    expect(
      within(informationWithoutMaps).queryByRole('link', {
        name: /Navigate GMaps/,
      }),
    ).toBeNull()

    const transport = screen
      .getByRole('heading', { name: 'Alpha transfer' })
      .closest('.timeline-item') as HTMLElement
    expect(within(transport).queryByRole('button')).toBeNull()
  })

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

  it('changes the active itinerary from Settings and persists it', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'alpha')
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Itinerary' }), {
      target: { value: 'beta' },
    })

    expect(localStorage.getItem('tripwise.activeItineraryId')).toBe('beta')
    expect(screen.getByRole('combobox', { name: 'Itinerary' })).toHaveValue(
      'beta',
    )
  })

  it('marks first and last itinerary days without marking middle semantics', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'alpha')
    render(
      <MemoryRouter initialEntries={['/days']}>
        <App />
      </MemoryRouter>,
    )
    const days = document.querySelectorAll('.day-row')
    expect(
      within(days[0] as HTMLElement).getByRole('img', {
        name: 'Departure day',
      }),
    ).toBeVisible()
    expect(within(days[1] as HTMLElement).queryByRole('img')).toBeNull()
    expect(
      within(days[2] as HTMLElement).getByRole('img', { name: 'Arrival day' }),
    ).toBeVisible()
  })

  it('uses one combined indicator for a single-day itinerary', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'beta')
    render(
      <MemoryRouter initialEntries={['/days']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('img', { name: 'Departure and arrival day' }),
    ).toBeVisible()
    expect(screen.queryByRole('img', { name: 'Departure day' })).toBeNull()
    expect(screen.queryByRole('img', { name: 'Arrival day' })).toBeNull()
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
    fireEvent.click(screen.getByRole('link', { name: /09:00 Beta place/ }))
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

    expect(screen.getByText('No matches in your itinerary.')).toBeVisible()
    expect(screen.queryByText('Alpha day')).not.toBeInTheDocument()
  })

  it('groups item matches by day and opens the matching planned item', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alpha itinerary' }))
    fireEvent.click(screen.getByRole('link', { name: 'Search' }))
    const search = screen.getByRole('textbox')
    fireEvent.change(search, { target: { value: 'ALPHA' } })

    expect(document.querySelectorAll('.search-day')).toHaveLength(2)
    expect(
      screen.getByRole('link', { name: /09:00 Alpha place/ }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: /14:00 Alpha museum/ }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: /10:00 Alpha place/ }),
    ).toBeVisible()

    fireEvent.change(search, { target: { value: 'waterfront' } })
    expect(
      screen.getByRole('link', { name: /09:00 Alpha place/ }),
    ).toBeVisible()

    fireEvent.click(screen.getByRole('link', { name: /09:00 Alpha place/ }))
    expect(screen.getByText('Match')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Alpha place' })).toBeVisible()

    fireEvent.click(screen.getByRole('link', { name: 'Search' }))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'alpha' },
    })

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    expect(document.querySelectorAll('.search-day')).toHaveLength(0)
  })

  it('searches location title, primary and secondary descriptions in stable day order', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'alpha')
    render(
      <MemoryRouter initialEntries={['/search']}>
        <App />
      </MemoryRouter>,
    )
    const search = screen.getByRole('textbox')
    fireEvent.change(search, { target: { value: 'ALPHA PLACE' } })
    expect(screen.getAllByRole('link', { name: /Alpha place/ })).toHaveLength(2)
    fireEvent.change(search, { target: { value: 'waterfront' } })
    expect(screen.getAllByRole('link', { name: /Alpha place/ })).toHaveLength(2)
    fireEvent.change(search, { target: { value: 'SECONDARY DETAIL' } })
    expect(screen.getByRole('link', { name: /Alpha museum/ })).toBeVisible()
  })

  it('returns a day-only result only when the day has no matching locations', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'alpha')
    render(
      <MemoryRouter initialEntries={['/search']}>
        <App />
      </MemoryRouter>,
    )
    const search = screen.getByRole('textbox')
    fireEvent.change(search, { target: { value: 'follow up' } })
    expect(
      screen.getByRole('link', { name: /Alpha follow up/ }),
    ).toHaveAttribute('href', '/day/2026-09-12')
    fireEvent.change(search, { target: { value: 'alpha' } })
    expect(screen.queryByRole('link', { name: /Alpha day$/ })).toBeNull()
  })

  it('isolates persisted progress between itineraries and restores it', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alpha itinerary' }))
    const alphaPlace = screen
      .getByRole('heading', { name: 'Alpha place' })
      .closest('article') as HTMLElement
    fireEvent.click(within(alphaPlace).getByRole('button', { name: 'DONE' }))
    cleanup()

    localStorage.setItem('tripwise.activeItineraryId', 'beta')
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Beta day' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'DONE' })).toBeVisible()
    cleanup()

    localStorage.setItem('tripwise.activeItineraryId', 'alpha')
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Alpha day' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'UNDO' })).toBeVisible()
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
    expect(localStorage.getItem('tripwise.activeItineraryId')).toBeNull()
  })

  it('uses an itinerary selected in Settings after an application restart', () => {
    localStorage.setItem('tripwise.activeItineraryId', 'alpha')
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Itinerary' }), {
      target: { value: 'beta' },
    })
    cleanup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Beta day' })).toBeVisible()
  })
})
