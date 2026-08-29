import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProductionErrorBoundary, RecoveryScreen } from './recovery'

function BrokenApp(): never {
  throw new Error('Internal DATA URL: /data/manifest.json')
}

describe('production recovery UI', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders a safe recovery screen and invokes its retry action', () => {
    const retry = vi.fn()
    render(
      <RecoveryScreen
        error={new Error('Zod validation failed at /data/manifest.json')}
        onRetry={retry}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Unable to open the app' }),
    ).toBeVisible()
    expect(
      screen.queryByText(/Zod validation|manifest\.json|stack/i),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('catches render errors without exposing technical details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ProductionErrorBoundary>
        <BrokenApp />
      </ProductionErrorBoundary>,
    )

    expect(
      screen.getByRole('heading', { name: 'Unable to open the app' }),
    ).toBeVisible()
    expect(screen.queryByText(/Internal DATA URL/i)).not.toBeInTheDocument()
  })
})
