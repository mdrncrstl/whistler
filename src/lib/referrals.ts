import type { Session } from '@supabase/supabase-js'
import { authClient } from './supabase'

export const REFERRAL_STORAGE_KEY = 'masterdeck-referral-code'
export const REFERRAL_CREDIT_AUD = 20

export type ReferralAttribution = {
  id: string
  invitee_label: string
  status: 'signed_up' | 'qualified' | 'rewarded' | 'reversed'
  signed_up_at: string
  qualified_at: string | null
  rewarded_at: string | null
}

export type ReferralReward = {
  id: string
  attribution_id: string
  amount_aud_cents: number
  status: 'pending' | 'applied' | 'reversed'
  applied_at: string | null
  created_at: string
}

export type ReferralDashboard = {
  code: string
  referrals: ReferralAttribution[]
  rewards: ReferralReward[]
}

export function normalizeReferralCode(value: string | null | undefined) {
  const normalized = String(value || '').trim().toUpperCase()
  return /^MD-[A-Z0-9]{8}$/.test(normalized) ? normalized : null
}

export function captureReferralFromLocation(location: Pick<Location, 'href'> = window.location) {
  const code = normalizeReferralCode(new URL(location.href).searchParams.get('ref'))
  if (code) window.localStorage.setItem(REFERRAL_STORAGE_KEY, code)
  return code
}

export function storedReferralCode() {
  return normalizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY))
}

export async function claimStoredReferral() {
  const code = storedReferralCode()
  if (!code) return null
  const { data, error } = await authClient.rpc('claim_referral_code', { p_code: code })
  if (error) throw error
  const result = data as { accepted?: boolean; reason?: string } | null
  if (result?.accepted || ['invalid', 'not_found', 'self_referral', 'already_attributed'].includes(result?.reason || '')) {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
  }
  return result
}

export async function loadReferralDashboard(session: Session): Promise<ReferralDashboard> {
  const [{ data: code, error: codeError }, { data: referrals, error: referralsError }, { data: rewards, error: rewardsError }] = await Promise.all([
    authClient.rpc('get_my_referral_code'),
    authClient.from('referral_attributions')
      .select('id,invitee_label,status,signed_up_at,qualified_at,rewarded_at')
      .eq('referrer_user_id', session.user.id)
      .order('signed_up_at', { ascending: false }),
    authClient.from('referral_rewards')
      .select('id,attribution_id,amount_aud_cents,status,applied_at,created_at')
      .eq('beneficiary_user_id', session.user.id)
      .order('created_at', { ascending: false }),
  ])
  if (codeError) throw codeError
  if (referralsError) throw referralsError
  if (rewardsError) throw rewardsError
  return {
    code: String(code),
    referrals: (referrals || []) as ReferralAttribution[],
    rewards: (rewards || []) as ReferralReward[],
  }
}

export function referralLink(code: string, origin = window.location.origin) {
  return `${origin}/?ref=${encodeURIComponent(code)}`
}
