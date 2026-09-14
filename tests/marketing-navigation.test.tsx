import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MarketingNavigation } from '../src/components/MarketingNavigation'
import { MarketingContent } from '../src/components/MarketingContent'
import { marketingPages } from '../src/lib/marketingPages'
afterEach(cleanup)
describe('public website navigation', () => {
  it('opens one group, closes outside, and restores focus on Escape', () => {
    render(<MemoryRouter><MarketingNavigation/></MemoryRouter>)
    const features=screen.getByRole('button',{name:'Features'})
    fireEvent.click(features)
    expect(screen.getByRole('link',{name:/Portfolio tracking/})).toHaveAttribute('href','/features/portfolio-tracking')
    fireEvent.click(screen.getByRole('button',{name:'Company'}))
    expect(screen.queryByRole('link',{name:/Portfolio tracking/})).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button',{name:'Company'}),{key:'Escape'})
    expect(screen.getByRole('button',{name:'Company'})).toHaveFocus()
    fireEvent.click(features)
    fireEvent.pointerDown(document.body)
    expect(features).toHaveAttribute('aria-expanded','false')
  })
  it('marks the current pricing page and its category consistently', () => {
    render(<MemoryRouter initialEntries={['/pricing']}><MarketingNavigation/></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Company' })).not.toHaveAttribute('data-active', 'true')
  })
  it.each([
    ['/features/performance', 'Features'],
    ['/for/share-investors', 'Who it’s for'],
    ['/company/about', 'Company'],
  ])('marks %s through its navigation group', (path, group) => {
    render(<MemoryRouter initialEntries={[path]}><MarketingNavigation/></MemoryRouter>)
    expect(screen.getByRole('button', { name: group })).toHaveAttribute('data-active', 'true')
    for (const button of screen.getAllByRole('button')) {
      if (button.textContent?.trim() !== group) expect(button).not.toHaveAttribute('data-active', 'true')
    }
  })
  it.each(marketingPages)('renders unique content for $path',page=>{
    render(<MarketingContent page={page} onStart={vi.fn()} onDemo={vi.fn()}/>)
    expect(screen.getByRole('heading',{level:1,name:page.title})).toBeInTheDocument()
    for(const section of page.sections) expect(screen.getByRole('heading',{name:section.title})).toBeInTheDocument()
  })
  it('uses the actual monthly and annual prices',()=>{
    render(<MarketingContent page="pricing" onStart={vi.fn()} onDemo={vi.fn()}/>)
    fireEvent.click(within(screen.getByRole('group',{name:'Billing period'})).getByRole('button',{name:'Monthly'}))
    expect(screen.getByText('$18.90')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Annual'}))
    expect(screen.getByText('$14')).toBeInTheDocument()
  })
})
