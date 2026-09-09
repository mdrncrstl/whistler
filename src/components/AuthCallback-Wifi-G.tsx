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
    const finish = async () => {
      const code = new URL(window.location.href).searchParams.get('code')
      const current = await authClient.auth.getSession()
      if (current.data.session) return navigate('/welcome', { replace: true })
      if (!code) return setError('The sign-in link is invalid or has expired.')
      const { error: exchangeError } = await authClient.auth.exchangeCodeForSession(code)
      if (!alive) return
      if (exchangeError) setError(exchangeError.message)
      else navigate('/welcome', { replace: true })
    }
    finish()
    return () => { alive = false }
  }, [navigate])
  return <div className="auth-callback"><Brand />{error ? <><h1>Sign-in could not be completed</h1><p>{error}</p><a href="/">Return to MASTERDECK</a></> : <><LoaderCircle className="spin" /><h1>Finishing secure sign-in</h1><p>This should only take a moment.</p></>}</div>
}
