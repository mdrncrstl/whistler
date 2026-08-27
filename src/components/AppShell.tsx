import { ArrowLeftRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness, CalendarDays, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, CircleDollarSign, Command, CreditCard, FileText, Gift, History, Inbox, Layers3, LineChart, ListTree, LogOut, Menu, MessageSquare, Moon, PieChart, Plus, RefreshCw, Scale, Search, Settings, Sparkles, Sun, Table2, Target, TrendingUp, UserRound, WalletCards, X, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext'
import { Brand, Button, IconButton, MotionPopover, Toast } from './ui'
import { authClient } from '../lib/supabase'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; subGroup?: string }

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
  { to: '/app/tax/historical-cost', label: 'Historical Cost', icon: History },
]

const toolItems: NavItem[] = [
  { to: '/app/tools/assistant', label: 'Masterdeck AI', icon: Sparkles },
  { to: '/app/tools/inbox', label: 'Email Inbox', icon: Inbox },
  { to: '/app/tools/groups', label: 'Custom Groups', icon: Layers3 },
]

const flatNavigation: NavItem[] = [
  ...portfolioItems, ...reportItems, ...taxItems, ...toolItems,
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/holdings', label: 'Holdings', icon: BarChart3 },
  { to: '/app/connections', label: 'Connections', icon: WalletCards },
]

export function AppShell({ children, onExitDemo }: { children: ReactNode; onExitDemo: () => void }) {
  const { bundle, demo, action, notice, setNotice, refreshQuotes } = usePortfolio()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mcpPromoOpen, setMcpPromoOpen] = useState(true)
  const [performanceOpen, setPerformanceOpen] = useState(() => window.localStorage.getItem('masterdeck-performance-open') !== 'false')
  const [taxOpen, setTaxOpen] = useState(() => window.localStorage.getItem('masterdeck-tax-open') !== 'false')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.localStorage.getItem('masterdeck-sidebar-collapsed') === 'true')
  const [portfolioMenuOpen, setPortfolioMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('masterdeck-theme') === 'dark' ? 'dark' : 'light')
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
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
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setPortfolioMenuOpen(false)
        setAccountMenuOpen(false)
        setNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const searchCommands = [
    { label: 'Portfolio', group: 'Navigation', to: '/app', icon: BriefcaseBusiness },
    { label: 'Add holdings', group: 'Navigation', to: '/app/connections', icon: Plus },
    { label: 'Manage portfolios', group: 'Navigation', to: '/app/settings', icon: Layers3 },
    { label: 'Masterdeck AI', group: 'Navigation', to: '/app/tools/assistant', icon: Sparkles },
    { label: 'Tax reports', group: 'Tax Reporting', to: '/app/tax', icon: FileText },
    { label: 'Settings', group: 'Settings', to: '/app/settings', icon: Settings },
  ].filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()))

  const openCommand = (to: string) => {
    navigate(to)
    setSearchOpen(false)
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
      <div className="sidebar-brand"><Brand /></div>
      <div className="portfolio-switcher-wrap">
        <button className="portfolio-switcher" aria-haspopup="menu" aria-expanded={portfolioMenuOpen} onClick={() => setPortfolioMenuOpen(!portfolioMenuOpen)}><span className="portfolio-monogram">MD</span><span><strong>All portfolios</strong><small>{bundle.holdings.length} holdings · AUD</small></span><ChevronDown size={14} /></button>
        <MotionPopover open={portfolioMenuOpen} className="portfolio-menu" role="menu" origin="top left">
          <span>My portfolios</span>
          <button role="menuitem" onClick={() => setPortfolioMenuOpen(false)}><span className="portfolio-monogram">MD</span><span><strong>All portfolios</strong><small>{bundle.holdings.length} holdings · AUD</small></span></button>
          <button role="menuitem" onClick={() => openCommand('/app/settings')}><Settings size={14}/><span>Manage portfolios</span></button>
        </MotionPopover>
      </div>
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
          <button className="nav-parent" type="button" aria-expanded={performanceOpen} onClick={() => setPerformanceOpen(!performanceOpen)}><LineChart size={15}/><span>Performance</span>{performanceOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button>
          <div className={`nav-branch ${performanceOpen ? 'open' : ''}`} aria-hidden={!performanceOpen}>{reportItems.map(({ to, label, icon: Icon, subGroup, end }) => <div className="nav-child-wrap" key={to}>
            {subGroup && <span className="nav-subgroup-label">{subGroup}</span>}
            <NavLink className="nav-child" to={to} end={end} onClick={() => setMobileOpen(false)}><Icon size={15}/><span>{label}</span></NavLink>
          </div>)}</div>

          <button className="nav-parent nav-tax-parent" type="button" aria-expanded={taxOpen} onClick={() => setTaxOpen(!taxOpen)}><FileText size={15}/><span>Tax Reporting</span>{taxOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button>
          <div className={`nav-branch ${taxOpen ? 'open' : ''}`} aria-hidden={!taxOpen}>{taxItems.map(({ to, label, icon: Icon, subGroup, end }) => <div className="nav-child-wrap" key={to}>
            {subGroup && <span className="nav-subgroup-label">{subGroup}</span>}
            <NavLink className="nav-child" to={to} end={end} onClick={() => setMobileOpen(false)}><Icon size={15}/><span>{label}</span></NavLink>
          </div>)}</div>
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
        {mcpPromoOpen && <aside className="mcp-promo" aria-label="Masterdeck MCP server beta">
          <button type="button" aria-label="Dismiss Masterdeck MCP server card" onClick={() => setMcpPromoOpen(false)}><X size={13}/></button>
          <span>New</span>
          <strong>Masterdeck MCP server (beta)</strong>
          <p>Connect your AI agent (Claude, ChatGPT, etc.) to your portfolio.</p>
          <NavLink to="/app/settings">Connect <ArrowUpRight size={12}/></NavLink>
        </aside>}
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
        {mobileOpen && <motion.div className="mobile-drawer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
          <motion.div className="drawer-panel" initial={{ transform: reduceMotion ? 'translateX(0%)' : 'translateX(-100%)' }} animate={{ transform: 'translateX(0%)' }} exit={{ transform: reduceMotion ? 'translateX(0%)' : 'translateX(-100%)', transition: { duration: reduceMotion ? 0.12 : 0.17, ease: [0.32, 0.72, 0, 1] } }} transition={{ duration: reduceMotion ? 0.14 : 0.22, ease: [0.32, 0.72, 0, 1] }}>{nav}</motion.div>
          <button className="drawer-dismiss" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X /></button>
        </motion.div>}
      </AnimatePresence>
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <IconButton label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></IconButton>
            <div><strong>{current.label}</strong><span>{demo ? 'Illustrative demo data' : 'Live private workspace'}</span></div>
          </div>
          <div className="topbar-actions">
            <button className="global-search" type="button" onClick={() => setSearchOpen(true)}><Search size={15}/><span>Search holdings, reports…</span><kbd><Command size={10}/>K</kbd></button>
            <Button variant="ghost" icon={RefreshCw} busy={action === 'refresh-quotes'} onClick={() => refreshQuotes()}>Refresh prices</Button>
            <div className="notifications-wrap"><IconButton label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={17}/></IconButton><MotionPopover open={notificationsOpen} className="notifications-menu" role="status"><header><strong>Notifications</strong><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={14}/></button></header><div><span><Bell size={17}/></span><strong>You’re all caught up</strong><p>Sync alerts and portfolio updates will appear here.</p></div></MotionPopover></div>
            <IconButton label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</IconButton>
            <div className="account-menu-wrap"><button className="topbar-avatar" type="button" title={profile?.email || undefined} aria-label="Open account menu" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(!accountMenuOpen)}>{(profile?.full_name || profile?.email || 'M').slice(0, 1).toUpperCase()}</button><MotionPopover open={accountMenuOpen} className="account-menu" role="menu">
              <header><span className="account-avatar"><UserRound size={18}/></span><span><strong>{profile?.full_name || 'Masterdeck investor'}</strong><small>{profile?.email || (demo ? 'Demo workspace' : 'Private workspace')}</small></span></header>
              <button role="menuitem" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><Moon size={15}/><span>Dark mode</span><span className={`menu-switch ${theme === 'dark' ? 'on' : ''}`} aria-hidden="true"/></button>
              <button role="menuitem" onClick={() => openCommand('/app/settings')}><Settings size={15}/><span>Settings</span></button>
              <button role="menuitem" onClick={() => openCommand('/app/billing')}><ArrowUpRight size={15}/><span>Change Plan</span></button>
              <button role="menuitem" onClick={() => openCommand('/app/billing')}><CreditCard size={15}/><span>Billing &amp; Subscription</span></button>
              <button role="menuitem" onClick={() => { navigator.clipboard?.writeText(window.location.origin); setNotice({ tone: 'success', message: 'Referral link copied.' }); setAccountMenuOpen(false) }}><Gift size={15}/><span>Refer a Friend</span></button>
              <button role="menuitem" onClick={signOut}><LogOut size={15}/><span>Log out</span></button>
            </MotionPopover></div>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
      <nav className="mobile-nav" aria-label="Mobile portfolio navigation">
        {flatNavigation.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}><Icon size={19} /><span>{label === 'Transactions' ? 'Activity' : label.replace(' centre', '')}</span></NavLink>
        ))}
      </nav>
      <AnimatePresence initial={false}>{notice && <Toast key={notice.message} tone={notice.tone} message={notice.message} onClose={() => setNotice(null)} />}</AnimatePresence>
      {searchOpen && <div className="command-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}>
        <div className="command-palette" role="dialog" aria-modal="true" aria-label="Search workspace" onMouseDown={(event) => event.stopPropagation()}>
          <label><Search size={17}/><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && searchCommands[0]) openCommand(searchCommands[0].to) }} placeholder="Search or jump to…" aria-label="Search or jump to"/><kbd>ESC</kbd></label>
          <div className="command-results">{searchCommands.length ? ['Navigation', 'Tax Reporting', 'Settings'].map((group) => {
            const items = searchCommands.filter((item) => item.group === group)
            if (!items.length) return null
            return <section key={group}><span>{group}</span>{items.map(({ label, to, icon: Icon }) => <button key={label} onClick={() => openCommand(to)}><Icon size={16}/><strong>{label}</strong><small>↵</small></button>)}</section>
          }) : <p>No matching pages</p>}</div>
          <footer><span>↑↓ Navigate</span><span>↵ Open</span><span>ESC Close</span></footer>
        </div>
      </div>}
    </div>
  )
}
