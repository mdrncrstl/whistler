import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AccountAccessProvider } from '../src/context/AccountAccessContext'
import { PortfolioProvider } from '../src/context/PortfolioContext'
import { Settings } from '../src/features/Settings'

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/app/settings']}>
      <AccountAccessProvider session={null} demo>
        <PortfolioProvider session={null} demo>
          <Settings onExitDemo={() => undefined}/>
        </PortfolioProvider>
      </AccountAccessProvider>
    </MemoryRouter>,
  )
}

describe('settings workspace', () => {
  afterEach(cleanup)

  it('organises account controls into working settings sections', async () => {
    renderSettings()

    expect(screen.getByRole('region', { name: 'Account' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Portfolio preferences/ }))
    expect(await screen.findByRole('checkbox', { name: 'Privacy mode' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Portfolio preferences' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Default tax-lot method' })).toHaveValue('fifo')

    fireEvent.click(screen.getByRole('button', { name: /Data & connections/ }))
    expect(await screen.findByRole('link', { name: /Manage connections/ })).toHaveAttribute('href', '/app/connections')
    fireEvent.click(screen.getByRole('button', { name: /Plan & billing/ }))
    expect(await screen.findByRole('link', { name: /View referrals/ })).toHaveAttribute('href', '/app/referrals')
  })

  it('tracks and saves changed portfolio preferences', async () => {
    renderSettings()
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Portfolio preferences/ }))
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Privacy mode' }))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(save).toBeEnabled()

    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText('Changes saved')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('keeps session controls separate from data permissions', async () => {
    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: /Security/ }))
    expect(await screen.findByText('Read-only broker access')).toBeInTheDocument()
    expect(screen.getByText('Current session')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exit demo' })).toBeInTheDocument()
  })
})
