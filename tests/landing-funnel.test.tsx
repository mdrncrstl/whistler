import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Landing } from '../src/components/Landing-Wifi-G'

describe('Masterdeck public conversion funnel', () => {
  afterEach(cleanup)
  it('renders the complete product, pricing, connections and FAQ journey', () => {
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /Every investment. One clear view/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /More perspective. Less piecing things together/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Clear pricing. Try it before you pay/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Bring every portfolio into one history/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'See pricing' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Multiple portfolios').length).toBeGreaterThan(0)
    expect(screen.queryByText('200+ global brokers')).not.toBeInTheDocument()
  })

  it('switches billing periods and expands FAQ answers', async () => {
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    const annual = screen.getByRole('button', { name: /Annual/i })
    const monthly = screen.getByRole('button', { name: 'Monthly' })
    expect(annual).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('$14')).toBeInTheDocument()
    fireEvent.click(monthly)
    expect(monthly).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('$18.90')).toBeInTheDocument()

    const brokerQuestion = screen.getByRole('button', { name: 'Is Masterdeck a broker?' })
    expect(brokerQuestion).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Which accounts can I connect?' }))
    expect(brokerQuestion).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(/named broker formats/)).toBeInTheDocument()
  })

  it('links each visual feature card to an existing product page', () => {
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    const features = within(screen.getByRole('region', { name: 'Explore Masterdeck features' }))
    expect(features.getAllByRole('link')).toHaveLength(4)
    expect(features.getByRole('link', { name: /Your portfolio, together/ })).toHaveAttribute('href', '/features/portfolio-tracking')
    expect(features.getByRole('link', { name: /See what drove the return/ })).toHaveAttribute('href', '/features/performance')
    expect(features.getByRole('link', { name: /Keep the tax detail close/ })).toHaveAttribute('href', '/features/australian-tax')
    expect(features.getByRole('link', { name: /A benchmark for your progress/ })).toHaveAttribute('href', '/features/performance')
  })

  it('shows a real app screenshot with clear demo attribution', () => {
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    expect(screen.getByRole('img', { name: /Actual Masterdeck portfolio with demo holdings/ })).toHaveAttribute('src', '/marketing/masterdeck-portfolio-hero.png')
    expect(screen.getByText('Actual Masterdeck app · Demo portfolio')).toBeInTheDocument()
    expect(screen.getByText('named broker guides', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('IBKR')).not.toBeInTheDocument()
  })

  it('has a working accessible mobile navigation menu', async () => {
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    const toggle = screen.getByRole('button', { name: 'Toggle mobile menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(within(mobileNav).getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
    fireEvent.click(toggle)
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument())
  })

  it('keeps the header present and switches to its scrolled surface', async () => {
    let pageScrollY = 0
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => pageScrollY })
    Object.defineProperty(document, 'scrollingElement', { configurable: true, value: document.documentElement })
    Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, get: () => pageScrollY })
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => window.setTimeout(() => callback(0), 0))
    const cancelRaf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle) => window.clearTimeout(handle))
    render(<Landing onDemo={vi.fn()} signedIn onOpenApp={vi.fn()} />)
    const header = screen.getByRole('banner')

    pageScrollY = 240
    fireEvent.scroll(window)
    await waitFor(() => expect(header).toHaveAttribute('data-scroll-state', 'scrolled'))
    expect(header).toHaveClass('is-scrolled')

    pageScrollY = 180
    fireEvent.scroll(window)
    await waitFor(() => expect(header).toHaveAttribute('data-scroll-state', 'scrolled'))
    expect(header).toHaveClass('is-scrolled')

    raf.mockRestore()
    cancelRaf.mockRestore()
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true })
    Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, value: 0, writable: true })
  })
})
