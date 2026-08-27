import { AlertCircle, Check, ChevronDown, LoaderCircle, Search, X, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, type AriaRole, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { money } from '../lib/format'

const easeOut = [0.23, 1, 0.32, 1] as const
const popoverIdentity = 'translateY(0px) scale(1)'
const toastIdentity = 'translateY(0%)'

export function MotionPopover({ open, children, className, origin = 'top right', role, ariaLabel }: { open: boolean; children: ReactNode; className: string; origin?: string; role?: AriaRole; ariaLabel?: string }) {
  const reduceMotion = useReducedMotion()
  const hiddenTransform = reduceMotion ? popoverIdentity : 'translateY(-4px) scale(0.97)'
  return (
    <AnimatePresence initial={false}>
      {open && <motion.div
        className={className}
        role={role}
        aria-label={ariaLabel}
        style={{ transformOrigin: origin }}
        initial={{ opacity: 0, transform: hiddenTransform }}
        animate={{ opacity: 1, transform: popoverIdentity }}
        exit={{ opacity: 0, transform: hiddenTransform, transition: { duration: reduceMotion ? 0.1 : 0.11, ease: easeOut } }}
        transition={{ duration: reduceMotion ? 0.12 : 0.16, ease: easeOut }}
      >{children}</motion.div>}
    </AnimatePresence>
  )
}

export function MotionDialogSurface({ open, className, labelledBy, onClose, children }: { open: boolean; className: string; labelledBy: string; onClose: () => void; children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  const hiddenTransform = reduceMotion ? popoverIdentity : 'translateY(8px) scale(0.97)'
  return (
    <AnimatePresence initial={false}>
      {open && <motion.div
        className="modal-backdrop"
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.12, ease: easeOut } }}
        transition={{ duration: 0.16, ease: easeOut }}
        onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
      >
        <motion.section
          className={className}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          initial={{ opacity: 0, transform: hiddenTransform }}
          animate={{ opacity: 1, transform: popoverIdentity }}
          exit={{ opacity: 0, transform: hiddenTransform, transition: { duration: 0.14, ease: easeOut } }}
          transition={{ duration: reduceMotion ? 0.14 : 0.2, ease: easeOut }}
          onMouseDown={(event) => event.stopPropagation()}
        >{children}</motion.section>
      </motion.div>}
    </AnimatePresence>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="MASTERDECK">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" role="img">
          <path d="M6 24V8h5l5 8 5-8h5v16h-5v-8l-5 8-5-8v8z" />
        </svg>
      </span>
      {!compact && <span className="brand-word">MASTERDECK</span>}
    </div>
  )
}

export function Button({ children, variant = 'secondary', busy = false, icon: Icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; busy?: boolean; icon?: LucideIcon }) {
  return (
    <button className={`button button-${variant}`} {...props} disabled={busy || props.disabled}>
      {busy ? <LoaderCircle className="spin" size={16} /> : Icon ? <Icon size={16} /> : null}
      <span>{children}</span>
    </button>
  )
}

export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button className="icon-button" aria-label={label} title={label} {...props}>{children}</button>
}

export function Card({ children, className = '', as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={`card ${className}`}>{children}</Tag>
}

export function MetricCard({ label, value, change, tone = 'neutral', detail }: { label: string; value: ReactNode; change?: ReactNode; tone?: 'positive' | 'negative' | 'neutral'; detail?: ReactNode }) {
  return (
    <Card className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {(change != null || detail != null) && <div className={`metric-change tone-${tone}`}>{change}<span>{detail}</span></div>}
    </Card>
  )
}

export function PrivateMoney({ value, digits = 0, className = '' }: { value: number; digits?: number; className?: string }) {
  return <span className={`private-value ${className}`}>{money(value, 'AUD', digits)}</span>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'error' | 'gold' | 'purple' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <label className="search-input"><Search size={16} /><input type="search" {...props} /></label>
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <label className="select-wrap"><select {...props}>{children}</select><ChevronDown size={15} /></label>
}

export function EmptyState({ icon: Icon = AlertCircle, title, description, action }: { icon?: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function Modal({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [onClose, open])
  return (
    <MotionDialogSurface open={open} className="modal-dialog" labelledBy="modal-title" onClose={onClose}>
        <div className="modal-head">
          <div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div>
          <IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton>
        </div>
        {children}
    </MotionDialogSurface>
  )
}

export function Toast({ tone, message, onClose }: { tone: 'success' | 'error' | 'info'; message: string; onClose: () => void }) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(timeout)
  }, [message, onClose])
  const Icon = tone === 'success' ? Check : tone === 'error' ? AlertCircle : AlertCircle
  return (
    <motion.div
      className={`toast toast-${tone}`}
      role="status"
      initial={{ opacity: 0, transform: reduceMotion ? toastIdentity : 'translateY(100%)' }}
      animate={{ opacity: 1, transform: toastIdentity }}
      exit={{ opacity: 0, transform: reduceMotion ? toastIdentity : 'translateY(100%)', transition: { duration: 0.14, ease: easeOut } }}
      transition={{ duration: reduceMotion ? 0.14 : 0.2, ease: easeOut }}
    >
      <Icon size={18} /><span>{message}</span><IconButton label="Dismiss notification" onClick={onClose}><X size={16} /></IconButton>
    </motion.div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>
}

export function LoadingScreen() {
  return <div className="loading-screen"><Brand /><LoaderCircle className="spin" size={24} /><p>Preparing your portfolio…</p></div>
}
