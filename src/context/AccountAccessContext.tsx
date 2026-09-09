/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authClient } from '../lib/supabase'

export type PrimaryGoal = 'performance' | 'tax' | 'both'
export type PortfolioStructure = 'single' | 'multiple'
export type AssetType = 'stocks_etfs' | 'crypto' | 'managed_funds' | 'property' | 'other'
export type ReferralSource = 'google' | 'youtube' | 'friend' | 'social' | 'professional' | 'other'

export interface AccountAccess {
  user_id: string
  primary_goal: PrimaryGoal | null
  portfolio_structure: PortfolioStructure | null
  asset_types: AssetType[]
  referral_source: ReferralSource | null
  onboarding_completed_at: string | null
  trial_started_at: string
  trial_ends_at: string
  access_mode: 'trial' | 'grandfathered'
}

export type OnboardingUpdate = Partial<Pick<AccountAccess, 'primary_goal' | 'portfolio_structure' | 'asset_types' | 'referral_source' | 'onboarding_completed_at'>>

interface AccountAccessValue {
  access: AccountAccess | null
  loading: boolean
  error: string
  onboardingRequired: boolean
  trialActive: boolean
  trialExpired: boolean
  trialDaysRemaining: number
  saveOnboarding: (updates: OnboardingUpdate) => Promise<AccountAccess | null>
  refresh: () => Promise<AccountAccess | null>
}

const AccountAccessContext = createContext<AccountAccessValue | null>(null)

export function daysRemaining(end: string | null | undefined, now = Date.now()) {
  if (!end) return 0
  return Math.max(0, Math.ceil((new Date(end).getTime() - now) / 86_400_000))
}

export function AccountAccessProvider({ session, demo, children }: { session: Session | null; demo: boolean; children: ReactNode }) {
  const [access, setAccess] = useState<AccountAccess | null>(null)
  const [loading, setLoading] = useState(Boolean(session && !demo))
  const [error, setError] = useState('')
  const hasLoadedRef = useRef(!session || demo)
  const providerKey = `${session?.user?.id || 'anonymous'}:${demo ? 'demo' : 'live'}`
  const previousProviderKey = useRef(providerKey)

  useEffect(() => {
    if (previousProviderKey.current === providerKey) return
    previousProviderKey.current = providerKey
    hasLoadedRef.current = !session || demo
    setLoading(Boolean(session && !demo))
  }, [demo, providerKey, session])

  const refresh = useCallback(async () => {
    if (!session || demo) {
      setAccess(null)
      hasLoadedRef.current = true
      setLoading(false)
      return null
    }
    if (!hasLoadedRef.current) setLoading(true)
    try {
      const { data, error: queryError } = await authClient.from('account_access')
        .select('user_id,primary_goal,portfolio_structure,asset_types,referral_source,onboarding_completed_at,trial_started_at,trial_ends_at,access_mode')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (queryError) throw queryError
      const next = data as AccountAccess | null
      setAccess(next)
      setError('')
      return next
    } catch (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'Account access could not be loaded.')
      return null
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
    }
  }, [demo, session])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const saveOnboarding = useCallback(async (updates: OnboardingUpdate) => {
    if (!session || demo) {
      setAccess((current) => current ? { ...current, ...updates } : current)
      return null
    }
    const select = 'user_id,primary_goal,portfolio_structure,asset_types,referral_source,onboarding_completed_at,trial_started_at,trial_ends_at,access_mode'
    const { data, error: updateError } = await authClient.from('account_access')
      .update(updates)
      .eq('user_id', session.user.id)
      .select(select)
      .maybeSingle()
    if (updateError) throw updateError
    if (data) {
      const next = data as AccountAccess
      setAccess(next)
      return next
    }
    const { data: inserted, error: insertError } = await authClient.from('account_access')
      .insert({ user_id: session.user.id, ...updates })
      .select(select)
      .single()
    if (insertError) throw insertError
    const next = inserted as AccountAccess
    setAccess(next)
    return next
  }, [demo, session])

  const trialDaysRemaining = daysRemaining(access?.trial_ends_at)
  const trial = access?.access_mode === 'trial'
  const value = useMemo<AccountAccessValue>(() => ({
    access,
    loading,
    error,
    onboardingRequired: Boolean(session && !demo && access && !access.onboarding_completed_at),
    trialActive: Boolean(trial && trialDaysRemaining > 0),
    trialExpired: Boolean(trial && trialDaysRemaining === 0),
    trialDaysRemaining,
    saveOnboarding,
    refresh,
  }), [access, demo, error, loading, refresh, saveOnboarding, session, trial, trialDaysRemaining])

  return <AccountAccessContext.Provider value={value}>{children}</AccountAccessContext.Provider>
}

export function useAccountAccess() {
  const value = useContext(AccountAccessContext)
  if (!value) throw new Error('useAccountAccess must be used inside AccountAccessProvider.')
  return value
}

export function useOptionalAccountAccess() {
  return useContext(AccountAccessContext)
}
