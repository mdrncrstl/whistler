import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/supabase'
import { Brand } from './ui'
import { LoaderCircle } from 'lucide-react'

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    const providerError = url.searchParams.get('error_description') || hash.get('error_description')
    const timeout = window.setTimeout(() => { if (alive) setError('Sign-in took too long. Return to Masterdeck and try again.') }, 15000)
    // Supabase owns URL detection and the one-time PKCE exchange. Exchanging
    // again here races client initialization and React StrictMode.
    void authClient.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return
      window.clearTimeout(timeout)
      if (data.session) navigate('/app', { replace: true })
      else setError(providerError || sessionError?.message || 'This sign-in link has expired or was cancelled. Please try again.')
    }).catch(() => {
      if (alive) { window.clearTimeout(timeout); setError('Unable to finish sign-in. Check your connection and try again.') }
    })
    return () => { alive = false; window.clearTimeout(timeout) }
  }, [navigate])
  return <div className="auth-callback"><Brand />{error ? <><h1>Sign-in could not be completed</h1><p>{error}</p><a href="/">Return to Masterdeck</a></> : <><LoaderCircle className="spin" /><h1>Finishing secure sign-in</h1><p>This should only take a moment.</p></>}</div>
}
