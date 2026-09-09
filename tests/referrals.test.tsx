import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PortfolioProvider } from '../src/context/PortfolioContext'
import { Referrals } from '../src/features/Referrals'
import { captureReferralFromLocation, normalizeReferralCode, referralLink, REFERRAL_STORAGE_KEY } from '../src/lib/referrals'

describe('MASTERDECK referrals', () => {
  beforeEach(() => {
    window.localStorage.clear()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('captures only valid referral codes and creates canonical links', () => {
    expect(normalizeReferralCode(' md-ab12cd34 ')).toBe('MD-AB12CD34')
    expect(normalizeReferralCode('wrong')).toBeNull()
    expect(captureReferralFromLocation({ href: 'https://masterdeck.app/?ref=md-ab12cd34' })).toBe('MD-AB12CD34')
    expect(window.localStorage.getItem(REFERRAL_STORAGE_KEY)).toBe('MD-AB12CD34')
    expect(referralLink('MD-AB12CD34', 'https://masterdeck.app')).toBe('https://masterdeck.app/?ref=MD-AB12CD34')
  })

  it('renders the full reward dashboard and copies the personal link', async () => {
    render(<MemoryRouter><PortfolioProvider session={null} demo><Referrals /></PortfolioProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Refer & earn' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Give A\$20/ })).toBeInTheDocument()
    expect(screen.getByText('MD-DEMO2026')).toBeInTheDocument()
    expect(screen.getByText('Amelia')).toBeInTheDocument()
    expect(screen.getByText('Rewarded')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How rewards work' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/?ref=MD-DEMO2026')))
  })
})
