import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PortfolioProvider } from '../src/context/PortfolioContext'
import { Holdings } from '../src/features/Holdings'

describe('Holdings screen', () => {
  it('renders demo data and filters by symbol', async () => {
    render(<MemoryRouter><PortfolioProvider session={null} demo><Holdings /></PortfolioProvider></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Holdings' })).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search holdings' }), { target: { value: 'VGS' } })
    expect(screen.getByText('VGS')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
    expect(screen.getByText(/1 of 8 holdings/)).toBeInTheDocument()
  })
})
