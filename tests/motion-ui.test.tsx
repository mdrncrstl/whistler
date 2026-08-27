import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MotionDialogSurface, MotionPopover } from '../src/components/ui'

describe('motion UI primitives', () => {
  it('keeps popovers accessible and anchored to their trigger edge', () => {
    const { rerender } = render(
      <MotionPopover open className="test-menu" origin="top left" role="menu" ariaLabel="Test actions">
        <button role="menuitem">Open report</button>
      </MotionPopover>,
    )

    const menu = screen.getByRole('menu', { name: 'Test actions' })
    expect(menu).toHaveStyle({ transformOrigin: 'top left' })
    expect(screen.getByRole('menuitem', { name: 'Open report' })).toBeVisible()

    rerender(
      <MotionPopover open={false} className="test-menu" origin="top left" role="menu" ariaLabel="Test actions">
        <button role="menuitem">Open report</button>
      </MotionPopover>,
    )
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
})
