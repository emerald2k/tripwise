import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('shows the bootstrap loader until the application initializes', async ({
  page,
}) => {
  await page.route('**/src/main.tsx', async (route) => {
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
  await page.route('**/src/main.tsx', async (route) => {
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
  await page.route('**/src/main.tsx', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.continue()
  })

  const navigation = page.goto('/')
  await expect(page.getByRole('status')).toHaveText('Se încarcă aplicația')
  await navigation
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro')
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

test('search returns days only', async ({ page }) => {
  await page.goto('/search')
  await page.getByRole('textbox').fill('Olympic')
  const result = page.getByRole('link', { name: /Montréal/ })
  await expect(result).toBeVisible()
  await result.click()
  await expect(
    page.getByRole('heading', { name: /Olympic Park|Old Port/ }).first(),
  ).toBeVisible()
})

test('settings persists the selected language', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByText(/^Version \d+\.\d+\.\d+$/)).toBeVisible()
  await page.getByRole('button', { name: 'RO', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Setări' })).toBeVisible()
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
    await page.reload()
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
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, `Accessibility violations on ${route}`).toEqual(
      [],
    )
  }
})
