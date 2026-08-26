import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Landing } from '../src/components/Landing'

describe('Masterdeck public conversion funnel', () => {
  afterEach(cleanup)
  it('renders the complete product, pricing, integrations and FAQ journey', () => {
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /Know what your portfolio is really doing/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /From broker files to a useful answer/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Full portfolio intelligence, priced lower/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Start with the broker workflows/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Portfolio tool comparison' })).toBeInTheDocument()
    expect(screen.getAllByText('Interactive Brokers').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Superhero').length).toBeGreaterThan(0)
  })

  it('switches billing periods and expands FAQ answers', () => {
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    const annual = screen.getByRole('button', { name: /Annual/i })
    const monthly = screen.getByRole('button', { name: 'Monthly' })
    expect(annual).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('$14')).toBeInTheDocument()
    fireEvent.click(monthly)
    expect(monthly).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('$18')).toBeInTheDocument()

    const brokerQuestion = screen.getByRole('button', { name: 'Is Masterdeck a broker?' })
    expect(brokerQuestion).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Which accounts can I connect?' }))
    expect(brokerQuestion).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(/Interactive Brokers Flex data/)).toBeInTheDocument()
  })

  it('has a working accessible mobile navigation menu', () => {
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    const toggle = screen.getByRole('button', { name: 'Toggle mobile menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(within(mobileNav).getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '#pricing')
    fireEvent.click(toggle)
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })
})
