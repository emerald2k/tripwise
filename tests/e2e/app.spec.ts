import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const manifest = JSON.parse(
  readFileSync(new URL('../../data/manifest.json', import.meta.url), 'utf8'),
) as {
  itineraries: { id: string; file: string }[]
  cities: string[]
}

function readDataFile(path: string) {
  return JSON.parse(
    readFileSync(
      new URL(`../../data/${path.replace(/^\.\//, '')}`, import.meta.url),
      'utf8',
    ),
  ) as Record<string, unknown>
}

const locations = new Map(
  manifest.cities.flatMap((path) => {
    const city = readDataFile(path) as {
      locations: { locationId: string; name: string; googleMapsUrl?: string }[]
    }
    return city.locations.map((location) => [location.locationId, location])
  }),
)

const mobileProgressItem = (() => {
  for (const entry of manifest.itineraries) {
    const itinerary = readDataFile(entry.file) as {
      days: {
        date: string
        items: { locationId?: string; progress?: true }[]
      }[]
    }
    for (const day of itinerary.days)
      for (const item of day.items) {
        if (!item.locationId || item.progress !== true) continue
        const location = locations.get(item.locationId)
        if (location?.googleMapsUrl)
          return { itineraryId: entry.id, date: day.date, name: location.name }
      }
  }
  throw new Error('Expected a progress-enabled mapped Location Item')
})()

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (itineraryId) =>
      localStorage.setItem('tripwise.activeItineraryId', itineraryId),
    manifest.itineraries[0].id,
  )
})

async function waitForApplication(page: Page) {
  await expect(page.getByRole('link', { name: 'Volala' })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator('#app-loader')).toHaveCount(0)
}

test('shows the bootstrap loader until the application initializes', async ({
  page,
}) => {
  await page.route('**/assets/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.continue()
  })

  const navigation = page.goto('/')
  await expect(page.getByRole('status')).toHaveText('Loading application')
  await expect(page.locator('.app-loader__icon')).toHaveAttribute(
    'src',
    '/icon.svg',
  )
  await expect(page.locator('.app-loader__spinner')).toHaveCount(0)
  await expect(page.locator('.app-loader__ring')).toHaveCSS(
    'animation-name',
    'app-loader-rotate',
  )
  await navigation
  await expect(page.getByRole('link', { name: 'Volala' })).toBeVisible()
  await expect(page.locator('#app-loader')).toHaveCount(0)
})

test('disables bootstrap ring animation for reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/assets/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.continue()
  })

  const navigation = page.goto('/')
  await expect(page.locator('.app-loader__ring')).toHaveCSS(
    'animation-name',
    'none',
  )
  await navigation
  await expect(page.locator('#app-loader')).toHaveCount(0)
})

test('localizes the bootstrap loader from persisted language', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('tripwise.language', 'ro'),
  )
  await page.route('**/assets/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.continue()
  })

  const navigation = page.goto('/')
  await expect(page.getByRole('status')).toHaveText('Se încarcă aplicația')
  await navigation
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro')
})

test('renders accessible production recovery when runtime DATA fails', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 667 })
  await page.route('**/data/manifest.json', (route) =>
    route.fulfill({ status: 503 }),
  )

  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Unable to open the app' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.getByText(/manifest\.json|Zod|stack/i)).toHaveCount(0)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('loads Today and navigates through core pages', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Volala' })).toBeVisible()
  await page.getByRole('link', { name: 'Days' }).click()
  await expect(page.getByRole('heading', { name: 'Days' })).toBeVisible()
  await page.getByRole('link', { name: /05/ }).click()
  await expect(
    page.getByRole('heading', { name: /Olympic Park|Old Port/ }).first(),
  ).toBeVisible()
})

test('keeps day metadata and indicators inline with uniform row heights', async ({
  page,
}) => {
  await page.goto('/days')
  await waitForApplication(page)

  const rows = page.locator('.day-row')
  const rowCount = await rows.count()
  expect(rowCount).toBeGreaterThan(0)

  const layout = await rows.evaluateAll((elements) =>
    elements.map((row) => {
      const rowBox = row.getBoundingClientRect()
      const status = row.querySelector('.day-row-status')
      const statusBox = status?.getBoundingClientRect()
      const indicatorBox = status
        ?.querySelector('.indicator')
        ?.getBoundingClientRect()
      const journeyBox = status
        ?.querySelector('.itinerary-day-icon')
        ?.getBoundingClientRect()
      return {
        top: rowBox.top,
        bottom: rowBox.bottom,
        height: rowBox.height,
        statusTop: statusBox?.top,
        statusBottom: statusBox?.bottom,
        indicatorTop: indicatorBox?.top,
        indicatorBottom: indicatorBox?.bottom,
        journeyTop: journeyBox?.top,
        journeyBottom: journeyBox?.bottom,
      }
    }),
  )

  expect(layout.every((row) => row.height === layout[0].height)).toBe(true)
  for (const row of layout) {
    expect(row.statusTop).toBeGreaterThanOrEqual(row.top)
    expect(row.statusBottom).toBeLessThanOrEqual(row.bottom)
    expect(row.indicatorTop).toBeGreaterThanOrEqual(row.statusTop!)
    expect(row.indicatorBottom).toBeLessThanOrEqual(row.statusBottom!)
    if (row.journeyTop !== undefined) {
      expect(row.journeyTop).toBeGreaterThanOrEqual(row.statusTop!)
      expect(row.journeyBottom).toBeLessThanOrEqual(row.statusBottom!)
      expect(row.journeyTop).toBeLessThan(row.indicatorBottom!)
      expect(row.journeyBottom).toBeGreaterThan(row.indicatorTop!)
    }
  }
})

test('search groups planned item matches and opens the selected activity', async ({
  page,
}) => {
  await page.goto('/search')
  await page.getByRole('textbox').fill('Hotel Le Roberval')
  const day = page.locator('.search-day').filter({ hasText: 'SEP 04' })
  await expect(day).toContainText('Old Montréal + Old Port')
  await expect(day).toContainText('23:15')
  await expect(day).toContainText('Hotel Le Roberval')
  await expect(day).toContainText('Revenire la Hotel Le Roberval')
  const result = day.locator(
    'a[href="/day/2026-09-04?item=0904-20-revenire-la-hotel-le-roberval"]',
  )
  await expect(result).toBeVisible()
  await result.click()
  await expect(
    page.getByRole('heading', { name: 'Old Montréal + Old Port' }),
  ).toBeVisible()
  const match = page.locator(
    '.timeline-item.is-search-match:has(h2:text("Hotel Le Roberval"))',
  )
  await expect(match).toContainText('23:15')
  await expect(match).toContainText('Revenire la Hotel Le Roberval')
  await expect(match).toBeFocused()
  await expect(page.getByText('Match')).toBeVisible()
})

test('settings persists the selected language', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByText(/^Version \d+\.\d+\.\d+$/)).toBeVisible()
  await page.getByRole('button', { name: 'RO', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Setări' })).toBeVisible()
})

test('reloads the application shell and cached manifest DATA while offline', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const itinerary = await page.evaluate(async () => {
    const manifest = await fetch('/data/manifest.json').then((response) =>
      response.json(),
    )
    const entry = manifest.itineraries[0]
    return fetch(`/data/${entry.file.replace(/^\.\//, '')}`).then((response) =>
      response.json(),
    )
  })
  await page.goto(`/day/${itinerary.days[0].date}`)
  await expect(page.locator('.day-page')).toBeVisible()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await page.reload()
  await expect(page.locator('.day-page')).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.day-page')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.locator('.offline')).toBeVisible()
  await context.setOffline(false)
})

test('install awareness prompt directly uses the native install flow', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.defineProperties(event, {
      prompt: {
        value: () => {
          document.documentElement.dataset.installPrompt = 'called'
          return Promise.resolve()
        },
      },
      userChoice: { value: Promise.resolve({ outcome: 'accepted' }) },
    })
    window.dispatchEvent(event)
  })
  await expect(
    page.getByRole('heading', { name: 'Install Volala' }),
  ).toBeVisible()
  await expect(
    page.getByText('Install the app for quick access and offline use.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Install' }).click()
  await expect(page.locator('html')).toHaveAttribute(
    'data-install-prompt',
    'called',
  )
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { name: 'Install Volala' }),
  ).not.toBeVisible()
})

test('dismissed native installation consumes the awareness prompt', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.defineProperties(event, {
      prompt: { value: () => Promise.resolve() },
      userChoice: { value: Promise.resolve({ outcome: 'dismissed' }) },
    })
    window.dispatchEvent(event)
  })
  await page.getByRole('button', { name: 'Install' }).click()
  await expect(
    page.getByRole('heading', { name: 'Install Volala' }),
  ).not.toBeVisible()
})

test('installed and unsupported browsers do not show the awareness prompt', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Install Volala' }),
  ).not.toBeVisible()

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.defineProperties(event, {
      prompt: { value: () => Promise.resolve() },
      userChoice: { value: Promise.resolve({ outcome: 'accepted' }) },
    })
    window.dispatchEvent(event)
  })
  await expect(
    page.getByRole('heading', { name: 'Install Volala' }),
  ).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await expect(
    page.getByRole('heading', { name: 'Install Volala' }),
  ).not.toBeVisible()
})

test('Settings keeps the browser installation control when available', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.defineProperty(event, 'prompt', {
      value: () => {
        document.documentElement.dataset.installPrompt = 'called'
        return Promise.resolve()
      },
    })
    window.dispatchEvent(event)
  })
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Install App' }).click()
  await expect(page.locator('html')).toHaveAttribute(
    'data-install-prompt',
    'called',
  )
})

test('timeline supports DONE, UNDO, and Google Maps actions', async ({
  page,
}) => {
  await page.goto('/day/2026-09-04')
  const item = page
    .locator('article')
    .filter({ hasText: 'Notre-Dame Basilica' })
  await expect(
    item.getByRole('link', { name: /Navigate GMaps/ }),
  ).toHaveAttribute('href', /google\.com\/maps/)
  await item.getByRole('button', { name: 'DONE' }).click()
  await expect(item.getByRole('button', { name: 'UNDO' })).toBeVisible()
  await item.getByRole('button', { name: 'UNDO' }).click()
  await expect(item.getByRole('button', { name: 'DONE' })).toBeVisible()
})

test('progress actions remain tappable without overflow on mobile widths', async ({
  page,
}) => {
  await page.addInitScript((itineraryId) => {
    localStorage.setItem('tripwise.activeItineraryId', itineraryId)
  }, mobileProgressItem.itineraryId)

  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 700 })
    await page.goto(`/day/${mobileProgressItem.date}`)
    const item = page.locator('article').filter({
      has: page.getByRole('heading', { name: mobileProgressItem.name }),
    })
    const done = item.getByRole('button', { name: 'DONE' })
    const skip = item.getByRole('button', { name: 'SKIP' })
    const maps = item.getByRole('link', { name: /Navigate GMaps/ })

    await expect(done).toBeVisible()
    await expect(skip).toBeVisible()
    await expect(maps).toBeVisible()
    expect((await done.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    expect((await skip.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    expect((await maps.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width)
  }
})

test('timeline renders transport details and visit duration', async ({
  page,
}) => {
  await page.goto('/day/2026-09-04')
  const transport = page
    .locator('.timeline-item')
    .filter({ hasText: 'Hotel Le Roberval → Notre-Dame Basilica' })
  await expect(transport.locator('.transport')).toContainText('walk')
  await expect(transport.locator('.transport')).toContainText('20 min')
  await expect(transport.locator('.transport')).toContainText('1.6 km')
  await expect(
    page
      .locator('article')
      .filter({ hasText: 'Notre-Dame Basilica' })
      .getByText('50 min'),
  ).toBeVisible()
  await expect(transport.getByRole('button')).toHaveCount(0)
})

test('invalid day routes show the not-found state', async ({ page }) => {
  await page.goto('/day/2099-01-01')
  await expect(page.getByText('No itinerary for this day.')).toBeVisible()
})

test('application routes survive direct refresh', async ({ page }) => {
  for (const [route, heading] of [
    ['/days', 'Days'],
    ['/search', 'Search'],
    ['/settings', 'Settings'],
    ['/day/2026-09-04', /Olympic Park|Old Port/],
  ] as const) {
    await page.goto(route)
    await waitForApplication(page)
    await expect(
      page.getByRole('heading', { name: heading }).first(),
    ).toBeVisible()
    await page.reload()
    await waitForApplication(page)
    await expect(
      page.getByRole('heading', { name: heading }).first(),
    ).toBeVisible()
  }
})

test('browser back and forward preserve route navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Days' }).click()
  await page.getByRole('link', { name: /05/ }).click()
  await expect(page).toHaveURL(/\/day\//)
  await page.goBack()
  await expect(page).toHaveURL(/\/days$/)
  await page.goForward()
  await expect(page).toHaveURL(/\/day\//)
})

test('mobile shell has usable navigation without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Days' })).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375)
})

test('bottom navigation has usable controls and updates its active state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  const navigation = page.getByRole('navigation').last()
  const links = navigation.getByRole('link')
  await expect(links).toHaveCount(3)
  for (const label of ['Today', 'Days', 'Search']) {
    const link = navigation.getByRole('link', { name: label })
    await expect(link).toBeVisible()
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  }
  await expect(navigation.getByRole('link', { name: 'Today' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await navigation.getByRole('link', { name: 'Search' }).click()
  await expect(page).toHaveURL(/\/search$/)
  await expect(
    navigation.getByRole('link', { name: 'Search' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('Today has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('core routes have no detectable accessibility violations', async ({
  page,
}) => {
  for (const route of [
    '/',
    '/day/2026-09-04',
    '/days',
    '/search',
    '/settings',
  ]) {
    await page.goto(route)
    await waitForApplication(page)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, `Accessibility violations on ${route}`).toEqual(
      [],
    )
  }
})
