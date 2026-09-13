import { ArrowLeftRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronsLeft, ChevronsRight, ChevronDown, ChevronRight, CircleDollarSign, Command, CreditCard, FileText, Gift, History, Layers3, LineChart, ListTree, LogOut, Menu, MessageSquare, Moon, Network, PieChart, Plus, RefreshCw, Scale, Search, Settings, Sparkles, Sun, Table2, Target, TrendingUp, UserRound, WalletCards, X, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext'
import { useOptionalAccountAccess } from '../context/AccountAccessContext'
import { useBillingStatus } from '../hooks/useBillingStatus'
import { Brand, Button, IconButton, MotionPopover, Toast } from './ui'
import { HoldingLogo } from './HoldingLogo'
import { authClient } from '../lib/supabase'
import type { Position } from '../types'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; subGroup?: string }
type SearchCommand = { id: string; label: string; group: string; to: string; icon?: LucideIcon; holding?: Position }

const portfolioItems: NavItem[] = [
  { to: '/app', label: 'Portfolio', icon: BriefcaseBusiness, end: true },
  { to: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
]

const reportItems: NavItem[] = [
  { to: '/app/reports/benchmark', label: 'Benchmark Analysis', icon: Scale },
  { to: '/app/reports/performance', label: 'Performance Breakdown', icon: ListTree },
  { to: '/app/reports/diversification', label: 'Diversification', icon: PieChart },
  { to: '/app/reports/growth', label: 'Growth & Goals', icon: Target },
  { to: '/app/reports/income', label: 'Income Breakdown', icon: CircleDollarSign, subGroup: 'Income' },
  { to: '/app/reports/income-calendar', label: 'Income Calendar', icon: CalendarDays },
]

const taxItems: NavItem[] = [
  { to: '/app/tax', label: 'Overview', icon: Table2, end: true },
  { to: '/app/tax/mytax', label: 'ATO MyTax', icon: FileText, subGroup: 'Tax Reports' },
  { to: '/app/tax/capital-gains', label: 'Capital Gains Tax', icon: ListTree },
  { to: '/app/tax/taxable-income', label: 'Taxable Income', icon: CircleDollarSign },
  { to: '/app/tax/valuation', label: 'Portfolio Valuation', icon: WalletCards, subGroup: 'Tax Planning' },
  { to: '/app/tax/unrealised', label: 'Unrealized Gains', icon: TrendingUp },
  { to: '/app/tax/historical-cost', label: 'Recorded Cost', icon: History },
]

const toolItems: NavItem[] = [
  { to: '/app/tools/assistant', label: 'Masterdeck AI', icon: Sparkles },
  { to: '/app/tools/groups', label: 'Custom Groups', icon: Layers3 },
  { to: '/app/tools/supply-chain', label: 'Supply chain', icon: Network },
]

const flatNavigation: NavItem[] = [
  ...portfolioItems, ...reportItems, ...taxItems, ...toolItems,
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/holdings', label: 'Holdings', icon: BarChart3 },
  { to: '/app/connections', label: 'Connections', icon: WalletCards },
  { to: '/app/referrals', label: 'Refer & earn', icon: Gift },
]

const mobileNavLabels: Record<string, string> = {
  Portfolio: 'Portfolio',
  Transactions: 'Activity',
  'Benchmark Analysis': 'Benchmark',
  'Performance Breakdown': 'Returns',
  Diversification: 'Mix',
}

export function AppShell({ children, onExitDemo }: { children: ReactNode; onExitDemo: () => void }) {
  const { bundle, demo, session, action, notice, setNotice, refreshQuotes } = usePortfolio()
  const accountAccess = useOptionalAccountAccess()
  const trialActive = accountAccess?.trialActive || false
  const trialDaysRemaining = accountAccess?.trialDaysRemaining || 0
  const { subscription } = useBillingStatus(session, demo)
  const hasPaidPlan = Boolean(subscription && ['active', 'trialing', 'past_due', 'unpaid'].includes(subscription.status))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [performanceOpen, setPerformanceOpen] = useState(() => window.localStorage.getItem('masterdeck-performance-open') !== 'false')
  const [taxOpen, setTaxOpen] = useState(() => window.localStorage.getItem('masterdeck-tax-open') !== 'false')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.localStorage.getItem('masterdeck-sidebar-collapsed') === 'true')
  const [portfolioMenuOpen, setPortfolioMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const commandPaletteRef = useRef<HTMLDivElement | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('masterdeck-theme') === 'dark' ? 'dark' : 'light')
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const pageKey = `${location.pathname}${location.search}${location.hash}`
  const current = [...flatNavigation].sort((a, b) => b.to.length - a.to.length).find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) || flatNavigation[0]
  const profile = bundle.profile
  const privacy = Boolean(profile?.settings?.privacyMode)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('masterdeck-theme', theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem('masterdeck-performance-open', String(performanceOpen))
    window.localStorage.setItem('masterdeck-tax-open', String(taxOpen))
    window.localStorage.setItem('masterdeck-sidebar-collapsed', String(sidebarCollapsed))
  }, [performanceOpen, taxOpen, sidebarCollapsed])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        setSearchQuery('')
        setActiveCommandIndex(0)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setPortfolioMenuOpen(false)
        setAccountMenuOpen(false)
        setNotificationsOpen(false)
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [mobileOpen])

  useEffect(() => {
    if (!searchOpen) return
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !commandPaletteRef.current) return
      const focusable = Array.from(commandPaletteRef.current.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      if (previousActiveElement?.isConnected) previousActiveElement.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    if (!portfolioMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.portfolio-switcher-wrap')) return
      setPortfolioMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [portfolioMenuOpen])

  const searchTerm = searchQuery.trim().toLowerCase()
  const searchCommands: SearchCommand[] = [
    { id: 'page:portfolio', label: 'Portfolio', group: 'Navigation', to: '/app', icon: BriefcaseBusiness },
    { id: 'page:add-holdings', label: 'Add holdings', group: 'Navigation', to: '/app/connections', icon: Plus },
    { id: 'page:manage-portfolios', label: 'Manage portfolios', group: 'Navigation', to: '/app/settings', icon: Layers3 },
    { id: 'page:masterdeck-ai', label: 'Masterdeck AI', group: 'Navigation', to: '/app/tools/assistant', icon: Sparkles },
    { id: 'page:supply-chain', label: 'Supply chain', group: 'Navigation', to: '/app/tools/supply-chain', icon: Network },
    { id: 'page:tax-reports', label: 'Tax reports', group: 'Tax Reporting', to: '/app/tax', icon: FileText },
    { id: 'page:settings', label: 'Settings', group: 'Settings', to: '/app/settings', icon: Settings },
    ...bundle.holdings.map<SearchCommand>((holding) => ({
      id: `holding:${holding.provider}:${holding.account_name}:${holding.symbol}`,
      label: `${holding.symbol} · ${holding.name || holding.account_name}`,
      group: 'Holdings',
      to: `/app/holdings/${encodeURIComponent(holding.symbol)}`,
      holding,
    })),
  ]
    .filter((item) => {
      if (!searchTerm) return true
      const holdingText = item.holding ? [item.holding.symbol, item.holding.name, item.holding.market, item.holding.account_name].filter(Boolean).join(' ') : ''
      const searchable = `${item.label} ${holdingText}`.toLowerCase()
      return searchTerm.split(/\s+/).every((token) => searchable.includes(token))
    })
    .sort((first, second) => {
      if (!searchTerm || (!first.holding && !second.holding)) return 0
      const score = (item: SearchCommand) => {
        if (!item.holding) return 0
        const ticker = item.holding.symbol.toLowerCase()
        const name = String(item.holding.name || '').toLowerCase()
        if (ticker === searchTerm) return 100
        if (ticker.startsWith(searchTerm)) return 80
        if (name.startsWith(searchTerm)) return 60
        if (ticker.includes(searchTerm)) return 50
        return 20
      }
      return score(second) - score(first)
    })

  const openCommand = (to: string) => {
    navigate(to)
    setSearchOpen(false)
    setPortfolioMenuOpen(false)
    setAccountMenuOpen(false)
    setSearchQuery('')
    setMobileOpen(false)
  }

  const signOut = async () => {
    setAccountMenuOpen(false)
    if (demo) onExitDemo()
    else await authClient.auth.signOut()
    navigate('/')
  }

  const nav = (
    <>
      <div className={`portfolio-switcher-wrap ${portfolioMenuOpen ? 'is-open' : ''}`}>
        <button type="button" className="portfolio-switcher" aria-haspopup="menu" aria-expanded={portfolioMenuOpen} onClick={() => setPortfolioMenuOpen((open) => !open)}><Brand compact /><span><strong>All Portfolios</strong><small>{bundle.holdings.length} holdings · AUD</small></span><ChevronDown size={14} /></button>
        <MotionPopover open={portfolioMenuOpen} className="portfolio-menu" role="menu" ariaLabel="Portfolio switcher" origin="top center">
          <div className="portfolio-menu-content">
          <span className="portfolio-menu-label">My portfolios</span>
          <button type="button" role="menuitem" aria-current="true" onClick={() => setPortfolioMenuOpen(false)}><Brand compact /><span><strong>All Portfolios</strong><small>{bundle.holdings.length} holdings · AUD</small></span><Check size={14} /></button>
          <button type="button" role="menuitem" onClick={() => openCommand('/app/settings')}><Settings size={14}/><span>Manage portfolios</span><ChevronRight size={14}/></button>
          </div>
        </MotionPopover>
      </div>
      {trialActive && !hasPaidPlan && <NavLink className="sidebar-trial" to="/app/billing" onClick={() => setMobileOpen(false)}><span>Trial · {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} left</span><strong>Upgrade</strong></NavLink>}
      <nav className="side-nav" aria-label="Portfolio navigation">
        <div className="nav-section">
          <span className="nav-group-label">Portfolio</span>
          {portfolioItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}>
              <Icon size={15} /><span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav-section nav-expanded-section">
          <span className="nav-group-label">Reports</span>
          <button className="nav-parent" type="button" aria-expanded={performanceOpen} onClick={() => setPerformanceOpen(!performanceOpen)}><LineChart size={15}/><span>Performance</span><ChevronDown className="section-chevron" size={13}/></button>
          <div className={`nav-branch ${performanceOpen ? 'open' : ''}`} aria-hidden={!performanceOpen} inert={!performanceOpen}><div className="nav-branch-content">{reportItems.map(({ to, label, icon: Icon, subGroup, end }) => <div className="nav-child-wrap" key={to}>
            {subGroup && <span className="nav-subgroup-label">{subGroup}</span>}
            <NavLink className="nav-child" to={to} end={end} onClick={() => setMobileOpen(false)}><Icon size={15}/><span>{label}</span></NavLink>
          </div>)}</div></div>

          <button className="nav-parent nav-tax-parent" type="button" aria-expanded={taxOpen} onClick={() => setTaxOpen(!taxOpen)}><FileText size={15}/><span>Tax Reporting</span><ChevronDown className="section-chevron" size={13}/></button>
          <div className={`nav-branch ${taxOpen ? 'open' : ''}`} aria-hidden={!taxOpen} inert={!taxOpen}><div className="nav-branch-content">{taxItems.map(({ to, label, icon: Icon, subGroup, end }) => <div className="nav-child-wrap" key={to}>
            {subGroup && <span className="nav-subgroup-label">{subGroup}</span>}
            <NavLink className="nav-child" to={to} end={end} onClick={() => setMobileOpen(false)}><Icon size={15}/><span>{label}</span></NavLink>
          </div>)}</div></div>
        </div>

        <div className="nav-section">
          <span className="nav-group-label">Tools</span>
          {toolItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}><Icon size={15}/><span>{label}</span></NavLink>)}
        </div>

        <div className="nav-section nav-settings-section">
          <NavLink to="/app/settings" onClick={() => setMobileOpen(false)}><Settings size={15}/><span>Settings</span></NavLink>
        </div>
      </nav>
      <div className="sidebar-foot">

        <NavLink className="sidebar-feedback" to="/app/settings"><MessageSquare size={15}/><span>Feedback</span></NavLink>
        <button className="sidebar-collapse-toggle" type="button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>{sidebarCollapsed ? <ChevronsRight size={15}/> : <ChevronsLeft size={15}/>}<span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span></button>
      </div>
    </>
  )

  const compact = Boolean(profile?.settings?.compactTables)
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${privacy ? 'privacy-on' : ''} ${compact ? 'compact-tables' : ''}`}>
      <aside className="sidebar">{nav}</aside>
      <AnimatePresence initial={false}>
        {mobileOpen && <motion.div className="mobile-drawer" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }} onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileOpen(false) }}>
          <motion.div className="drawer-panel" role="dialog" aria-modal="true" aria-label="Mobile navigation" initial={{ transform: reduceMotion ? 'translateX(0%)' : 'translateX(-100%)' }} animate={{ transform: 'translateX(0%)' }} exit={{ transform: reduceMotion ? 'translateX(0%)' : 'translateX(-100%)', transition: { duration: reduceMotion ? 0.12 : 0.17, ease: [0.32, 0.72, 0, 1] } }} transition={{ duration: reduceMotion ? 0.14 : 0.22, ease: [0.32, 0.72, 0, 1] }} onMouseDown={(event) => event.stopPropagation()}>{nav}</motion.div>
          <button type="button" className="drawer-dismiss" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X /></button>
        </motion.div>}
      </AnimatePresence>
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <IconButton label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></IconButton>
            <div><strong>{current.label}</strong><span>{demo ? 'Illustrative demo data' : 'Live private workspace'}</span></div>
          </div>
          <div className="topbar-actions">
            <button className="global-search" type="button" onClick={() => { setSearchQuery(''); setActiveCommandIndex(0); setSearchOpen(true) }}><Search size={15}/><span>Search ticker, company, or page…</span><kbd><Command size={10}/>K</kbd></button>
            <div className="topbar-tools">
              <Button variant="ghost" icon={RefreshCw} busy={action === 'refresh-quotes'} onClick={() => refreshQuotes()}>Refresh prices</Button>
              <div className="notifications-wrap"><IconButton label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={17}/></IconButton><MotionPopover open={notificationsOpen} className="notifications-menu" role="status"><header><strong>Notifications</strong><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={14}/></button></header><div><span><Bell size={17}/></span><strong>You’re all caught up</strong><p>Sync alerts and portfolio updates will appear here.</p></div></MotionPopover></div>
              <IconButton label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</IconButton>
              <div className="account-menu-wrap"><button className="topbar-avatar" type="button" title={profile?.email || undefined} aria-label="Open account menu" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(!accountMenuOpen)}>{(profile?.full_name || profile?.email || 'M').slice(0, 1).toUpperCase()}</button><MotionPopover open={accountMenuOpen} className="account-menu" role="menu">
                <header><span className="account-avatar"><UserRound size={18}/></span><span><strong>{profile?.full_name || 'Masterdeck investor'}</strong><small>{profile?.email || (demo ? 'Demo workspace' : 'Private workspace')}</small></span></header>
                <button role="menuitem" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><Moon size={15}/><span>Dark mode</span><span className={`menu-switch ${theme === 'dark' ? 'on' : ''}`} aria-hidden="true"/></button>
                <button role="menuitem" onClick={() => openCommand('/app/settings')}><Settings size={15}/><span>Settings</span></button>
                <button role="menuitem" onClick={() => openCommand('/app/billing')}><ArrowUpRight size={15}/><span>Change Plan</span></button>
                <button role="menuitem" onClick={() => openCommand('/app/billing')}><CreditCard size={15}/><span>Billing &amp; Subscription</span></button>
                <button role="menuitem" onClick={() => openCommand('/app/referrals')}><Gift size={15}/><span>Refer a Friend</span></button>
                <button role="menuitem" onClick={signOut}><LogOut size={15}/><span>Log out</span></button>
              </MotionPopover></div>
            </div>
          </div>
        </header>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={pageKey}
            className="app-content app-page-transition"
            initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(7px) scale(.998)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
            exit={reduceMotion ? undefined : { opacity: 0, transform: 'translateY(-4px) scale(1.001)' }}
            transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: [0.23, 1, 0.32, 1] }}
          >{children}</motion.div>
        </AnimatePresence>
      </main>
      <nav className="mobile-nav" aria-label="Mobile portfolio navigation">
        {flatNavigation.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            {({ isActive }) => <>
              {isActive && <motion.span
                className="mobile-nav-indicator"
                data-testid="mobile-nav-active-indicator"
                layoutId="mobile-nav-active"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 38, mass: 0.72 }}
              />}
              <motion.span
                className="mobile-nav-item-content"
                animate={isActive && !reduceMotion ? { transform: 'translateY(-1px)' } : { transform: 'translateY(0px)' }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
              >
                <Icon size={19} />
                <span>{mobileNavLabels[label] || label.replace(' centre', '')}</span>
              </motion.span>
            </>}
          </NavLink>
        ))}
      </nav>
      <AnimatePresence initial={false}>{notice && <Toast key={notice.message} tone={notice.tone} message={notice.message} onClose={() => setNotice(null)} />}</AnimatePresence>
      {searchOpen && <div className="command-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}>
        <div ref={commandPaletteRef} className="command-palette" role="dialog" aria-modal="true" aria-label="Search workspace" onMouseDown={(event) => event.stopPropagation()}>
          <label><Search size={17}/><input autoFocus value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setActiveCommandIndex(0) }} onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setActiveCommandIndex((index) => searchCommands.length ? (index + 1) % searchCommands.length : 0) }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActiveCommandIndex((index) => searchCommands.length ? (index - 1 + searchCommands.length) % searchCommands.length : 0) }
            if (event.key === 'Home') { event.preventDefault(); setActiveCommandIndex(0) }
            if (event.key === 'End') { event.preventDefault(); setActiveCommandIndex(Math.max(0, searchCommands.length - 1)) }
            if (event.key === 'Enter' && searchCommands[activeCommandIndex]) { event.preventDefault(); openCommand(searchCommands[activeCommandIndex].to) }
            if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false) }
          }} placeholder="Search ticker, company, or page…" aria-label="Search or jump to" aria-activedescendant={searchCommands[activeCommandIndex] ? `command-result-${activeCommandIndex}` : undefined}/><kbd>ESC</kbd></label>
          <div className="command-results">{searchCommands.length ? ['Holdings', 'Navigation', 'Tax Reporting', 'Settings'].map((group) => {
            const items = searchCommands.filter((item) => item.group === group)
            if (!items.length) return null
            return <section key={group}><span>{group}</span>{items.map((item) => {
              const index = searchCommands.indexOf(item)
              const ItemIcon = item.icon
              const holdingLabel = item.holding ? `${item.holding.symbol} · ${item.holding.name || item.holding.account_name}` : item.label
              return <button key={item.id} id={`command-result-${index}`} type="button" className={`command-result ${item.holding ? 'command-result-holding' : ''} ${index === activeCommandIndex ? 'active' : ''}`} aria-label={holdingLabel} aria-selected={index === activeCommandIndex} onMouseEnter={() => setActiveCommandIndex(index)} onClick={() => openCommand(item.to)}>
                {item.holding ? <HoldingLogo symbol={item.holding.symbol} assetClass={item.holding.asset_class} size={32}/> : ItemIcon ? <ItemIcon size={16}/> : null}
                {item.holding ? <span className="command-result-copy"><strong>{item.holding.symbol}</strong><span>{item.holding.name || 'Unnamed holding'}</span><small>{[item.holding.market, item.holding.account_name].filter(Boolean).join(' · ')}</small></span> : <strong>{item.label}</strong>}
                <small className="command-result-hint">↵</small>
              </button>
            })}</section>
          }) : <p>No matching holdings or pages</p>}</div>
          <footer><span>↑↓ Navigate</span><span>↵ Open</span><span>ESC Close</span></footer>
        </div>
      </div>}
    </div>
  )
}
