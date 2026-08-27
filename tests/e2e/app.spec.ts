import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('loads Today and navigates through core pages', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Volala')).toBeVisible()
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
  await expect(page.getByText('Version 0.1.0')).toBeVisible()
  await page.getByRole('button', { name: 'RO', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Setări' })).toBeVisible()
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
