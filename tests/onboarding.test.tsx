import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../src/context/AccountAccessContext', async () => {
  const actual = await vi.importActual<typeof import('../src/context/AccountAccessContext')>('../src/context/AccountAccessContext')
  return {
    ...actual,
    useAccountAccess: () => ({
      access: null,
      saveOnboarding: vi.fn(),
    }),
  }
})

import { Onboarding } from '../src/components/Onboarding'

describe('new account onboarding', () => {
  afterEach(cleanup)

  it('lets users skip setup and go directly to importing holdings', async () => {
    render(<MemoryRouter initialEntries={['/welcome?preview=1']}><Routes><Route path="/welcome" element={<Onboarding/>}/><Route path="/app/connections" element={<p>Add your holdings</p>}/></Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Skip setup and add holdings' }))
    expect(await screen.findByText('Add your holdings')).toBeInTheDocument()
  })

  it('completes three setup choices and clearly presents the no-card trial', async () => {
    render(<MemoryRouter initialEntries={['/welcome?preview=1']}><Routes><Route path="/welcome" element={<Onboarding/>}/><Route path="/app/connections" element={<p>Portfolio workspace</p>}/></Routes></MemoryRouter>)

    expect(screen.getByRole('heading', { name: /What do you want to see first/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /BothPerformance/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: /How many portfolios/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /One portfolio/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    fireEvent.click(await screen.findByRole('button', { name: /Stocks and ETFs/i }))
    expect(screen.queryByRole('heading', { name: /How did you find Masterdeck/i })).not.toBeInTheDocument()
    expect(screen.getByText(/14 days free.*No card.*No auto-renew/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add my holdings' }))
    expect(await screen.findByText('Portfolio workspace')).toBeInTheDocument()
  })
})
