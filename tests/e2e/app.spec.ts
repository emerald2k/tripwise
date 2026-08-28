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
      locations: {
        locationId: string
        name: string
        description?: string
        address?: string
        googleMapsUrl?: string
      }[]
    }
    return city.locations.map((location) => [location.locationId, location])
  }),
)

const mobileProgressItem = (() => {
  for (const entry of manifest.itineraries) {
    const itinerary = readDataFile(entry.file) as {
      days: {
        date: string
        items: { locationId?: string; progress?: true; startTime: string }[]
      }[]
    }
    for (const day of itinerary.days)
      for (const item of day.items) {
        if (!item.locationId || item.progress !== true) continue
        const location = locations.get(item.locationId)
        if (location?.googleMapsUrl)
          return {
            itineraryId: entry.id,
            date: day.date,
            name: location.name,
            startTime: item.startTime,
          }
      }
  }
  throw new Error('Expected a progress-enabled mapped Location Item')
})()

const locationHierarchyDay = (() => {
  for (const entry of manifest.itineraries) {
    const itinerary = readDataFile(entry.file) as {
      days: { date: string; items: { locationId?: string }[] }[]
    }
    for (const day of itinerary.days)
      if (
        day.items.some((item) => {
          const location = item.locationId
            ? locations.get(item.locationId)
            : undefined
          return location?.description && location.address
        })
      )
        return { itineraryId: entry.id, date: day.date }
  }
  throw new Error('Expected a Location Item with a description and address')
})()

const durationLocationItem = (() => {
  for (const entry of manifest.itineraries) {
    const itinerary = readDataFile(entry.file) as {
      days: {
        date: string
        items: {
          locationId?: string
          startTime: string
          durationMinutes?: number
        }[]
      }[]
    }
    for (const day of itinerary.days)
      for (const item of day.items) {
        if (!item.locationId || !item.durationMinutes) continue
        const location = locations.get(item.locationId)
        if (location)
          return {
            itineraryId: entry.id,
            date: day.date,
            name: location.name,
            startTime: item.startTime,
          }
      }
  }
  throw new Error('Expected a Location Item with a duration')
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

test('auto-hides the Header on page scroll and restores it at the top', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 })
  await page.goto('/days')
  await waitForApplication(page)
  await page.locator('main').evaluate((element) => {
    element.style.minHeight = '200vh'
  })

  const header = page.getByRole('banner')
  await expect(header).not.toHaveClass(/is-hidden/)
  await expect(page.getByRole('link', { name: 'Volala' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 120))
  await expect(header).toHaveClass(/is-hidden/)

  await page.evaluate(() => window.scrollTo(0, 80))
  await expect(header).not.toHaveClass(/is-hidden/)

  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(header).not.toHaveClass(/is-hidden/)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320)
})

test('disables Header slide animation when reduced motion is requested', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/days')
  await waitForApplication(page)
  await page.locator('main').evaluate((element) => {
    element.style.minHeight = '200vh'
  })

  const header = page.getByRole('banner')
  await expect(header).toHaveCSS('transition-duration', '0s')
  await page.evaluate(() => window.scrollTo(0, 120))
  await expect(header).toHaveClass(/is-hidden/)
})

test('renders the secondary location description smaller than the primary description', async ({
  page,
}) => {
  await page.addInitScript(
    (itineraryId) =>
      localStorage.setItem('tripwise.activeItineraryId', itineraryId),
    locationHierarchyDay.itineraryId,
  )
  await page.goto(`/day/${locationHierarchyDay.date}`)
  await waitForApplication(page)

  const primary = page.locator('.location-primary-description').first()
  const secondary = page.locator('.location-secondary-description').first()
  await expect(primary).toBeVisible()
  await expect(secondary).toBeVisible()
  const primaryFontSize = await primary.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  )
  const secondaryFontSize = await secondary.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  )
  expect(secondaryFontSize).toBeLessThan(primaryFontSize)
})

test('keeps Location Item duration metadata on the title row', async ({
  page,
}) => {
  await page.addInitScript(
    (itineraryId) =>
      localStorage.setItem('tripwise.activeItineraryId', itineraryId),
    durationLocationItem.itineraryId,
  )

  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 700 })
    await page.goto(`/day/${durationLocationItem.date}`)
    await waitForApplication(page)

    const item = page
      .locator('.timeline-item')
      .filter({
        has: page.getByText(durationLocationItem.startTime, { exact: true }),
      })
      .filter({
        has: page.getByRole('heading', { name: durationLocationItem.name }),
      })
      .locator('article')
    const titleRow = item.locator('.location-title-row')
    const title = item.getByRole('heading', {
      name: durationLocationItem.name,
    })
    const duration = item.locator('.location-duration')
    const clock = item.locator('.duration-icon')

    await expect(title).toBeVisible()
    await expect(duration).toBeVisible()
    await expect(clock).toBeVisible()
    const [titleRowBox, titleBox, durationBox, clockBox] = await Promise.all([
      titleRow.boundingBox(),
      title.boundingBox(),
      duration.boundingBox(),
      clock.boundingBox(),
    ])
    expect(titleRowBox).not.toBeNull()
    expect(titleBox).not.toBeNull()
    expect(durationBox).not.toBeNull()
    expect(clockBox).not.toBeNull()
    expect(titleBox!.y).toBeLessThan(durationBox!.y + durationBox!.height)
    expect(titleBox!.y + titleBox!.height).toBeGreaterThan(durationBox!.y)
    expect(clockBox!.y).toBeGreaterThanOrEqual(titleRowBox!.y)
    expect(clockBox!.y + clockBox!.height).toBeLessThanOrEqual(
      titleRowBox!.y + titleRowBox!.height,
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width)
  }
})

test('keeps Days metadata and indicators inline with compact uniform row heights', async ({
  page,
}) => {
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 700 })
    await page.goto('/days')
    await waitForApplication(page)

    const rows = page.locator('.day-row')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
    await rows
      .first()
      .locator('.day-title')
      .evaluate((element) => {
        element.textContent = 'Long day title '.repeat(20)
      })

    const layout = await rows.evaluateAll((elements) =>
      elements.map((row) => {
        const rowBox = row.getBoundingClientRect()
        const titleBox = row
          .querySelector('.day-title')
          ?.getBoundingClientRect()
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
          titleTop: titleBox?.top,
          titleBottom: titleBox?.bottom,
          titleRight: titleBox?.right,
          titleWhiteSpace: titleBox
            ? getComputedStyle(row.querySelector('.day-title')!).whiteSpace
            : undefined,
          statusLeft: statusBox?.left,
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
      expect(row.titleWhiteSpace).toBe('nowrap')
      expect(row.titleTop).toBeLessThan(row.statusBottom!)
      expect(row.titleBottom).toBeGreaterThan(row.statusTop!)
      expect(row.titleRight).toBeLessThanOrEqual(row.statusLeft!)
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
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width)
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

test('location actions remain inline and tappable without overflow on mobile widths', async ({
  page,
}) => {
  await page.addInitScript((itineraryId) => {
    localStorage.setItem('tripwise.activeItineraryId', itineraryId)
  }, mobileProgressItem.itineraryId)

  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 700 })
    await page.goto(`/day/${mobileProgressItem.date}`)
    const item = page
      .locator('.timeline-item')
      .filter({
        has: page.getByText(mobileProgressItem.startTime, { exact: true }),
      })
      .filter({
        has: page.getByRole('heading', { name: mobileProgressItem.name }),
      })
      .locator('article')
    const done = item.getByRole('button', { name: 'DONE' })
    const skip = item.getByRole('button', { name: 'SKIP' })
    const maps = item.getByRole('link', { name: /Navigate GMaps/ })
    const share = item.getByRole('button', {
      name: 'Share Google Maps location',
    })
    const actionRow = item.locator('.item-actions')

    await expect(done).toBeVisible()
    await expect(skip).toBeVisible()
    await expect(maps).toBeVisible()
    await expect(share).toBeVisible()
    const actionRowBox = await actionRow.boundingBox()
    const itemBox = await item.boundingBox()
    const controls = [done, skip, maps, share]
    const controlBoxes = await Promise.all(
      controls.map((control) => control.boundingBox()),
    )
    expect(actionRowBox).not.toBeNull()
    expect(itemBox).not.toBeNull()
    expect(controlBoxes.every((box) => box !== null)).toBe(true)
    for (const box of controlBoxes) {
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(Math.abs(box!.y - controlBoxes[0]!.y)).toBeLessThanOrEqual(1)
      expect(box!.x).toBeGreaterThanOrEqual(actionRowBox!.x)
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        actionRowBox!.x + actionRowBox!.width,
      )
      expect(box!.y).toBeGreaterThanOrEqual(itemBox!.y)
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        itemBox!.y + itemBox!.height,
      )
    }
    expect(
      await share.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ).toBe('rgba(0, 0, 0, 0)')
    expect(
      await share.evaluate(
        (element) => getComputedStyle(element).borderTopStyle,
      ),
    ).toBe('none')
    expect(
      Math.abs(
        controlBoxes[3]!.x +
          controlBoxes[3]!.width -
          (actionRowBox!.x + actionRowBox!.width),
      ),
    ).toBeLessThanOrEqual(1)
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
