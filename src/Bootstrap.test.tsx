import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { loadRuntimeData } = vi.hoisted(() => ({
  loadRuntimeData: vi.fn(),
}))

vi.mock('./data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data')>()),
  loadRuntimeData,
}))

import { Bootstrap } from './Bootstrap'

describe('Bootstrap runtime DATA recovery', () => {
  afterEach(cleanup)

  beforeEach(() => {
    loadRuntimeData.mockReset()
  })

  it.each([
    'manifest request failure',
    'referenced resource failure',
    'malformed JSON',
    'invalid package',
    'invalid cross-reference',
  ])('shows safe recovery UI after %s', async (failure) => {
    loadRuntimeData.mockRejectedValueOnce(new Error(`${failure}: internal`))

    render(<Bootstrap />)

    expect(
      await screen.findByRole('heading', { name: 'Unable to open the app' }),
    ).toBeVisible()
    expect(screen.queryByText(/internal/i)).not.toBeInTheDocument()
  })
})
