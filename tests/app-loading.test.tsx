import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppLoadingProvider, LoadingScreen } from '../src/components/AppLoading'

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('unified app entry', () => {
  it('keeps one logo mounted through successive loading stages and reveals together', () => {
    vi.useFakeTimers()
    const view = (stage: number) => <AppLoadingProvider><main>Portfolio</main>{stage === 1 && <LoadingScreen key="auth"/>}{stage === 2 && <LoadingScreen key="records"/>}{stage === 3 && <LoadingScreen key="route"/>}</AppLoadingProvider>
    const { rerender } = render(view(1))
    const logo = screen.getByRole('status')
    act(() => vi.advanceTimersByTime(300))
    rerender(view(2))
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toBe(logo)
    act(() => vi.advanceTimersByTime(300))
    rerender(view(3))
    expect(screen.getByRole('status')).toBe(logo)
    expect(screen.getByText('Portfolio')).not.toBeVisible()
    rerender(view(0))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Portfolio')).toBeVisible()
  })

  it('does not dismiss the screen while a slower dependency remains pending', () => {
    vi.useFakeTimers()
    const { rerender } = render(<AppLoadingProvider><LoadingScreen/><LoadingScreen/></AppLoadingProvider>)
    act(() => vi.advanceTimersByTime(2000))
    rerender(<AppLoadingProvider><LoadingScreen/></AppLoadingProvider>)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })
})
