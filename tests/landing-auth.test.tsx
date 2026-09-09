import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Landing } from '../src/components/Landing-Wifi-G'

vi.mock('@react-oauth/google', () => ({ GoogleLogin: ({ onSuccess }: { onSuccess: (value: { credential: string }) => void }) => <button onClick={() => onSuccess({ credential: 'test-google-id-token' })}>Continue with Google</button> }))

const authMocks = vi.hoisted(() => ({
  signInWithIdToken: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: 'https://accounts.google.com/' }, error: null }),
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}))

vi.mock('../src/lib/supabase', () => ({
  authClient: { auth: {
    signInWithIdToken: authMocks.signInWithIdToken,
    signInWithOAuth: authMocks.signInWithOAuth,
    signInWithPassword: authMocks.signInWithPassword,
    signUp: authMocks.signUp,
  } },
}))

describe('Masterdeck authentication', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('opens the demo without requiring account creation', () => {
    const onDemo = vi.fn(), onOpenApp = vi.fn()
    render(<Landing onDemo={onDemo} onOpenApp={onOpenApp} />)
    fireEvent.click(screen.getByRole('button', { name: 'Explore the demo' }))
    expect(onDemo).toHaveBeenCalledOnce()
    expect(onOpenApp).toHaveBeenCalledOnce()
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { apple: false } }) }))
    authMocks.signInWithOAuth.mockResolvedValue({ data: { provider: 'google', url: 'https://accounts.google.com/' }, error: null })
    authMocks.signInWithPassword.mockResolvedValue({ error: null })
    authMocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
  })

  it('exchanges the Google identity token and opens the app', async () => {
    const onOpenApp = vi.fn()
    render(<Landing onDemo={vi.fn()} onOpenApp={onOpenApp} />)

    fireEvent.click(screen.getAllByRole('button', { name: /try masterdeck free/i })[0])
    expect(await screen.findByRole('dialog', { name: 'Continue to Masterdeck' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() => expect(authMocks.signInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'test-google-id-token' }))
    expect(onOpenApp).toHaveBeenCalledOnce()
  })

  it('signs an existing user in with email and password', async () => {
    const onOpenApp = vi.fn()
    render(<Landing onDemo={vi.fn()} onOpenApp={onOpenApp} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0])
    expect(await screen.findByRole('tab', { name: 'Sign in', selected: true })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'Investor@Example.com ' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    await waitFor(() => expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'investor@example.com',
      password: 'correct-horse',
    }))
    expect(onOpenApp).toHaveBeenCalledOnce()
  })

  it('creates an email account and explains that confirmation is required', async () => {
    render(<Landing onDemo={vi.fn()} onOpenApp={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: /try masterdeck free/i })[0])
    expect(await screen.findByRole('tab', { name: 'Create account', selected: true })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-enough-password' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    await waitFor(() => expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'long-enough-password',
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('Check new@example.com for your confirmation link.')
  })

  it('does not expose Supabase credential errors verbatim', async () => {
    authMocks.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
    render(<Landing onDemo={vi.fn()} onOpenApp={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0])
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } })
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
  })
  it('omits Apple while the provider is disabled', async () => {
    render(<Landing onDemo={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0])
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Continue with Apple' })).not.toBeInTheDocument()
    expect(authMocks.signInWithOAuth).not.toHaveBeenCalled()
  })

  it('starts enabled Apple sign-in with the app callback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { apple: true } }) }))
    render(<Landing onDemo={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Apple' }))
    await waitFor(() => expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({ provider: 'apple', options: { redirectTo: `${window.location.origin}/auth/callback` } }))
  })

})
