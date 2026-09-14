import { ArrowRight, Check, DatabaseZap, Landmark, LockKeyhole, Mail, RefreshCcw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { authClient } from '../lib/supabase'
import { canonicalAppUrl } from '../lib/app-origin'
import { Brand, Button } from './ui'

export function LegacyLanding({ onDemo }: { onDemo: () => void }) {
  const [error, setError] = useState('')
  const [redirecting, setRedirecting] = useState(false)

  const completeGoogleSignIn = async ({ credential }: CredentialResponse) => {
    setRedirecting(true)
    setError('')
    try {
      if (!credential) throw new Error('Google did not return a sign-in credential.')
      const { error: signInError } = await authClient.auth.signInWithIdToken({ provider: 'google', token: credential })
      if (signInError) throw signInError
      window.location.assign(canonicalAppUrl('/deck'))
    } catch {
      setError('Google sign-in could not be completed. Please try again.')
      setRedirecting(false)
    }
  }

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Brand />
        <span><LockKeyhole size={14} /> Private by design</span>
      </header>
      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow">Private portfolio intelligence</p>
            <h1>Your portfolio.<br /><em>Mastered.</em></h1>
            <p className="hero-copy">Track Interactive Brokers and Superhero in one private portfolio workspace with holdings, activity, performance and Australian tax reporting.</p>
            <div className="auth-actions">
              <div className="google-auth-button" aria-busy={redirecting} data-testid="google-signin-control">
                <GoogleLogin
                  onSuccess={(response) => { void completeGoogleSignIn(response) }}
                  onError={() => { setError('Google sign-in could not be completed. Please try again.'); setRedirecting(false) }}
                  text="continue_with"
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  logo_alignment="left"
                  width="230"
                />
              </div>
              <Button onClick={onDemo}>Explore demo <ArrowRight size={16} /></Button>
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <p className="auth-foot"><ShieldCheck size={15} /> Supabase-backed. Read-only broker connections.</p>
          </div>
          <div className="portfolio-preview" aria-label="Illustrative MASTERDECK portfolio preview">
            <div className="preview-top">
              <span>MASTERDECK / OVERVIEW</span>
              <span className="live-dot">Private</span>
            </div>
            <div className="preview-metrics">
              <div><small>Portfolio value</small><strong>$139,855</strong><span>+18.4%</span></div>
              <div><small>Today</small><strong>+$485</strong><span>+0.35%</span></div>
              <div><small>Unrealised</small><strong>+$32,638</strong><span>+30.4%</span></div>
            </div>
            <div className="preview-chart">
              <svg viewBox="0 0 640 260" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient id="preview-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6ee7a8" stopOpacity=".28" /><stop offset="1" stopColor="#6ee7a8" stopOpacity="0" /></linearGradient></defs>
                <path className="preview-area" d="M18 228 C70 216 93 223 142 195 S225 185 273 154 S363 137 413 108 S505 94 622 34 L622 246 L18 246 Z" />
                <path className="preview-path" d="M18 228 C70 216 93 223 142 195 S225 185 273 154 S363 137 413 108 S505 94 622 34" />
              </svg>
            </div>
            <div className="preview-rail"><span><i className="broker-dot ibkr" /> IBKR</span><span><i className="broker-dot superhero" /> Superhero</span><span>All values in AUD</span></div>
          </div>
        </section>
        <section className="trust-strip" aria-label="MASTERDECK capabilities">
          <div><DatabaseZap /><span><strong>One portfolio</strong>IBKR Flex and Superhero reports</span></div>
          <div><RefreshCcw /><span><strong>Current numbers</strong>Quotes, cash and FX in AUD</span></div>
          <div><Landmark /><span><strong>Tax ready</strong>FIFO, LIFO, HIFO and CGT timing</span></div>
          <div><Mail /><span><strong>Optional Gmail</strong>Separate read-only consent</span></div>
        </section>
        <section className="landing-principles">
          <div><Check size={18} /><span>No trade or order placement</span></div>
          <div><Check size={18} /><span>No broker password scraping</span></div>
          <div><Check size={18} /><span>Raw Superhero CSV files are not retained</span></div>
        </section>
      </main>
    </div>
  )
}

export { Landing } from './Landing-Wifi-G'
