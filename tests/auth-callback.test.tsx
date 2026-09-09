import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthCallback } from '../src/components/AuthCallback'
const auth = vi.hoisted(() => ({ getSession: vi.fn(), exchangeCodeForSession: vi.fn() }))
vi.mock('../src/lib/supabase', () => ({ authClient: { auth } }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const renderCallback = () => render(<StrictMode><MemoryRouter initialEntries={['/auth/callback']}><Routes><Route path="/auth/callback" element={<AuthCallback/>}/><Route path="/app" element={<h1>Portfolio ready</h1>}/></Routes></MemoryRouter></StrictMode>)
describe('OAuth callback', () => {
  it('opens the app using the session already exchanged by Supabase', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
    renderCallback()
    expect(await screen.findByText('Portfolio ready')).toBeInTheDocument()
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
  it('offers recovery for expired or cancelled sign-in', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    renderCallback()
    expect(await screen.findByText(/expired or was cancelled/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to Masterdeck' })).toHaveAttribute('href', '/')
  })
  it('recovers from a network failure', async () => {
    auth.getSession.mockRejectedValue(new Error('offline'))
    renderCallback()
    expect(await screen.findByText(/Check your connection/)).toBeInTheDocument()
  })
})
