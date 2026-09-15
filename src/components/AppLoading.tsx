import { motion, useReducedMotion } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const LoadingContext = createContext<null | (() => () => void)>(null)

function LogoScreen() {
  return <div className="loading-screen" role="status" aria-live="polite"><div className="loading-lockup"><div className="loading-mark" aria-hidden="true"><img src="/brand/masterdeck-favicon.png" alt=""/></div><span className="loading-label">Loading your portfolio…</span></div></div>
}

/** One mounted logo covers authentication, portfolio hydration and lazy routes. */
export function AppLoadingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0)
  const [visible, setVisible] = useState(false)
  const started = useRef(0)
  const reduceMotion = useReducedMotion()
  const register = useCallback(() => {
    if (!started.current) started.current = Date.now()
    setVisible(true)
    setPending(count => count + 1)
    return () => setPending(count => Math.max(0, count - 1))
  }, [])
  useEffect(() => {
    if (pending || !visible) return
    // Let the next boot dependency mount without restarting the logo animation.
    const timer = window.setTimeout(() => {
      started.current = 0
      setVisible(false)
    }, Math.max(180, 900 - (Date.now() - started.current)))
    return () => window.clearTimeout(timer)
  }, [pending, visible])
  return <LoadingContext.Provider value={register}>
    <motion.div className="app-loading-content" inert={visible} style={visible ? { pointerEvents: 'none', visibility: 'hidden' } : undefined} initial={false} animate={{ opacity: visible ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}>{children}</motion.div>
    {visible && <motion.div className="app-unified-loading" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.23, 1, 0.32, 1] }}><LogoScreen /></motion.div>}
  </LoadingContext.Provider>
}

export function LoadingScreen() {
  const register = useContext(LoadingContext)
  useLayoutEffect(() => register?.(), [register])
  return register ? null : <LogoScreen />
}
