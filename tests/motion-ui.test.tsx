import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoadingScreen, MotionDialogSurface, MotionPopover } from '../src/components/ui'

describe('motion UI primitives', () => {
  it('keeps popovers accessible and anchored to their trigger edge', () => {
    const { container, rerender } = render(
      <MotionPopover open className="test-menu" origin="top left" role="menu" ariaLabel="Test actions">
        <button role="menuitem">Open report</button>
      </MotionPopover>,
    )

    const menu = screen.getByRole('menu', { name: 'Test actions' })
    expect(menu).toHaveStyle({ transformOrigin: 'top left' })
    expect(menu).toHaveClass('t-dropdown', 'is-open')
    expect(menu).toHaveAttribute('data-origin', 'top-left')
    expect(screen.getByRole('menuitem', { name: 'Open report' })).toBeVisible()

    vi.useFakeTimers()
    try {
      rerender(
        <MotionPopover open={false} className="test-menu" origin="top left" role="menu" ariaLabel="Test actions">
          <button role="menuitem">Open report</button>
        </MotionPopover>,
      )
      expect(container.querySelector('.t-dropdown.is-closing')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(150) })
      expect(container.querySelector('.t-dropdown')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('preserves outside-click dismissal for animated dialogs', () => {
    const onClose = vi.fn()
    const { container } = render(
      <MotionDialogSurface open className="test-dialog" labelledBy="motion-dialog-title" onClose={onClose}>
        <h2 id="motion-dialog-title">Choose columns</h2>
      </MotionDialogSurface>,
    )

    expect(screen.getByRole('dialog', { name: 'Choose columns' })).toBeVisible()
    fireEvent.mouseDown(container.querySelector('.modal-backdrop') as HTMLElement)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps the loading state quiet and immediately understandable', () => {
    const { container } = render(<LoadingScreen />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading your portfolio…')
    expect(container.querySelector('.loading-mark img')).toBeInTheDocument()
    expect(container.querySelector('.loading-signal-stage')).not.toBeInTheDocument()
  })
})
