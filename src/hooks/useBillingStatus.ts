import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authClient } from '../lib/supabase'
import type { BillingSubscription } from '../lib/billing'

export function useBillingStatus(session: Session | null, demo: boolean) {
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!session || demo) { setSubscription(null); return null }
    setLoading(true)
    try {
      const { data, error } = await authClient.from('billing_customers')
        .select('plan,billing_interval,status,current_period_end,cancel_at_period_end,stripe_customer_id,stripe_subscription_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (error) throw error
      const next = data as BillingSubscription | null
      setSubscription(next)
      return next
    } finally { setLoading(false) }
  }, [demo, session])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])
  return { subscription, loading, refresh }
}
