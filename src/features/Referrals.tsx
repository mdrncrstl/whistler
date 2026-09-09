import { BadgeCheck, Check, ChevronRight, CircleDollarSign, Clock3, Copy, Gift, Mail, RefreshCw, Share2, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { usePortfolio } from '../context/PortfolioContext'
import { loadReferralDashboard, referralLink, REFERRAL_CREDIT_AUD, type ReferralAttribution, type ReferralDashboard } from '../lib/referrals'

const demoDashboard: ReferralDashboard = {
  code: 'MD-DEMO2026',
  referrals: [
    { id: 'demo-1', invitee_label: 'Amelia', status: 'rewarded', signed_up_at: '2026-08-04T08:00:00.000Z', qualified_at: '2026-08-18T08:00:00.000Z', rewarded_at: '2026-08-18T08:00:00.000Z' },
    { id: 'demo-2', invitee_label: 'Liam', status: 'qualified', signed_up_at: '2026-08-16T08:00:00.000Z', qualified_at: '2026-08-28T08:00:00.000Z', rewarded_at: null },
    { id: 'demo-3', invitee_label: 'Noah', status: 'signed_up', signed_up_at: '2026-08-25T08:00:00.000Z', qualified_at: null, rewarded_at: null },
  ],
  rewards: [
    { id: 'reward-1', attribution_id: 'demo-1', amount_aud_cents: 2000, status: 'applied', applied_at: '2026-08-18T08:00:00.000Z', created_at: '2026-08-18T08:00:00.000Z' },
    { id: 'reward-2', attribution_id: 'demo-2', amount_aud_cents: 2000, status: 'pending', applied_at: null, created_at: '2026-08-28T08:00:00.000Z' },
  ],
}

const statusCopy: Record<ReferralAttribution['status'], { label: string; detail: string; tone: 'neutral' | 'success' | 'warning' }> = {
  signed_up: { label: 'Signed up', detail: 'Waiting for first payment', tone: 'neutral' },
  qualified: { label: 'Qualified', detail: 'Credit is being applied', tone: 'warning' },
  rewarded: { label: 'Rewarded', detail: 'A$20 credit issued', tone: 'success' },
  reversed: { label: 'Reversed', detail: 'Payment was refunded', tone: 'neutral' },
}

const dateFormat = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const money = (cents: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(cents / 100)

export function Referrals() {
  const { session, demo, setNotice } = usePortfolio()
  const reduceMotion = useReducedMotion()
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(demo ? demoDashboard : null)
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (demo || !session) { setDashboard(demoDashboard); setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      setDashboard(await loadReferralDashboard(session))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Your referral dashboard could not load.')
    } finally {
      setLoading(false)
    }
  }, [demo, session])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const code = dashboard?.code || 'MD-••••••••'
  const link = dashboard ? referralLink(code) : ''
  const stats = useMemo(() => {
    const referrals = dashboard?.referrals || []
    const rewards = dashboard?.rewards || []
    return {
      signedUp: referrals.length,
      paid: referrals.filter((item) => ['qualified', 'rewarded'].includes(item.status)).length,
      earned: rewards.filter((item) => item.status === 'applied').reduce((sum, item) => sum + item.amount_aud_cents, 0),
      pending: rewards.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount_aud_cents, 0),
    }
  }, [dashboard])

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setNotice({ tone: 'success', message: 'Your personal referral link is copied.' })
    } catch {
      const input = document.querySelector<HTMLInputElement>('.referral-link-field input')
      input?.select()
      document.execCommand('copy')
      setNotice({ tone: 'success', message: 'Your personal referral link is copied.' })
    }
  }

  const shareLink = async () => {
    if (!link) return
    if (navigator.share) {
      await navigator.share({ title: 'Try Masterdeck', text: `Use my Masterdeck link and we’ll each receive A$${REFERRAL_CREDIT_AUD} account credit after your first paid invoice.`, url: link }).catch(() => undefined)
      return
    }
    await copyLink()
  }

  const emailLink = () => {
    if (!link) return
    const subject = encodeURIComponent(`A$${REFERRAL_CREDIT_AUD} Masterdeck credit`)
    const body = encodeURIComponent(`I use Masterdeck to track my portfolio and Australian CGT records. Join with my link and we’ll each receive A$${REFERRAL_CREDIT_AUD} account credit after your first paid invoice:\n\n${link}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return <div className="referral-page">
    <PageHeader title="Refer & earn" description="Invite people you know. When they become a paying customer, you both receive A$20 account credit." actions={<Badge tone="success"><Gift size={12}/> A$20 each</Badge>} />

    <motion.section className="referral-hero" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .34, ease: [0.23, 1, 0.32, 1] }}>
      <div className="referral-hero-copy">
        <span className="referral-kicker"><span><Gift size={15}/></span> Masterdeck referrals</span>
        <h2>Give A$20.<br/>Get A$20.</h2>
        <p>Your friend gets account credit after their first paid invoice. The same amount is added to your next Masterdeck invoice.</p>
        <div className="referral-link-field">
          <label htmlFor="referral-link">Your personal link</label>
          <div><input id="referral-link" readOnly value={link || 'Loading your referral link…'} onFocus={(event) => event.currentTarget.select()}/><Button variant="primary" icon={Copy} onClick={copyLink} disabled={!link}>Copy link</Button></div>
        </div>
        <div className="referral-share-actions"><Button icon={Share2} onClick={shareLink} disabled={!link}>Share</Button><Button variant="ghost" icon={Mail} onClick={emailLink} disabled={!link}>Email invite</Button><span>Code <strong>{code}</strong></span></div>
      </div>
      <div className="referral-credit-visual" aria-label={`${money(stats.earned)} referral credit earned`}>
        <div className="referral-orbit referral-orbit-one"/><div className="referral-orbit referral-orbit-two"/>
        <motion.div className="referral-credit-disc" animate={reduceMotion ? undefined : { y: [0, -6, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}>
          <span>Credit earned</span><strong>{money(stats.earned)}</strong><small>{stats.pending ? `${money(stats.pending)} pending` : 'Applied to future invoices'}</small>
        </motion.div>
        <span className="referral-person referral-person-one"><UserPlus size={16}/></span>
        <span className="referral-person referral-person-two"><Check size={16}/></span>
      </div>
    </motion.section>

    {error && <Card className="referral-error"><div><strong>Referral data is temporarily unavailable</strong><p>{error}</p></div><Button icon={RefreshCw} onClick={load}>Try again</Button></Card>}

    <section className="referral-stats" aria-label="Referral summary">
      {[
        { label: 'Friends joined', value: loading ? '—' : stats.signedUp, detail: 'Used your link', icon: Users },
        { label: 'Paid referrals', value: loading ? '—' : stats.paid, detail: 'First invoice paid', icon: BadgeCheck },
        { label: 'Credit earned', value: loading ? '—' : money(stats.earned), detail: 'Ready or already used', icon: CircleDollarSign },
        { label: 'Credit pending', value: loading ? '—' : money(stats.pending), detail: 'Waiting to be applied', icon: Clock3 },
      ].map(({ label, value, detail, icon: Icon }, index) => <motion.article key={label} className="referral-stat" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05, duration: .28 }}><span><Icon size={16}/></span><small>{label}</small><strong>{value}</strong><p>{detail}</p></motion.article>)}
    </section>

    <div className="referral-content-grid">
      <Card className="referral-activity">
        <header><div><h2>Referral activity</h2><p>Rewards unlock only after a real subscription payment.</p></div>{!demo && <Button variant="ghost" icon={RefreshCw} busy={loading} onClick={load}>Refresh</Button>}</header>
        {dashboard?.referrals.length ? <div className="referral-table-wrap"><table><thead><tr><th>Friend</th><th>Joined</th><th>Status</th><th>Your reward</th></tr></thead><tbody>{dashboard.referrals.map((referral) => {
          const status = statusCopy[referral.status]
          const reward = dashboard.rewards.find((item) => item.attribution_id === referral.id)
          return <tr key={referral.id}><td><span className="referral-avatar">{referral.invitee_label.slice(0, 1).toUpperCase()}</span><strong>{referral.invitee_label}</strong></td><td>{dateFormat.format(new Date(referral.signed_up_at))}</td><td><Badge tone={status.tone}>{status.label}</Badge><small>{status.detail}</small></td><td><strong>{reward ? money(reward.amount_aud_cents) : 'A$20'}</strong><span className={`reward-state ${reward?.status || 'waiting'}`}>{reward?.status === 'applied' ? 'Applied' : reward?.status === 'pending' ? 'Pending' : 'Waiting'}</span></td></tr>
        })}</tbody></table></div> : <div className="referral-empty"><span><Users size={22}/></span><h3>Your first referral starts here</h3><p>Send your personal link to someone who wants clearer portfolio and tax records. Their progress appears here after they create an account.</p><Button variant="primary" icon={Copy} onClick={copyLink}>Copy your link</Button></div>}
      </Card>

      <Card className="referral-rules">
        <header><span><ShieldCheck size={18}/></span><div><h2>How rewards work</h2><p>Simple, automatic and auditable.</p></div></header>
        <ol>
          <li><span>1</span><div><strong>Share your link</strong><p>Your code stays attached through sign-in and onboarding.</p></div><ChevronRight/></li>
          <li><span>2</span><div><strong>They choose a plan</strong><p>A signup alone does not trigger a reward.</p></div><ChevronRight/></li>
          <li><span>3</span><div><strong>Stripe confirms payment</strong><p>Both A$20 credits are recorded automatically.</p></div><Check/></li>
        </ol>
        <div className="referral-terms"><strong>Fair-use terms</strong><p>One reward per new customer. Self-referrals and duplicate accounts are excluded. Credits apply to future invoices, have no cash value and may be reversed after a refund or chargeback.</p></div>
      </Card>
    </div>
  </div>
}
