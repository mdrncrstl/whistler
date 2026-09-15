import { authClient } from './supabase'

const pendingDemoStorageKey = 'masterdeck-pending-demo'

export type DemoLeadCaptureResult = {
  ok: boolean
  emailStatus: 'sent' | 'failed' | 'not_configured' | 'skipped'
}

export function savePendingDemoIntent(marketingOptIn: boolean) {
  try {
    window.sessionStorage.setItem(pendingDemoStorageKey, JSON.stringify({ marketingOptIn }))
  } catch { /* best effort; the in-memory intent still handles same-page auth */ }
}

export function readPendingDemoIntent() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(pendingDemoStorageKey) || 'null') as { marketingOptIn?: unknown } | null
    return value ? { marketingOptIn: value.marketingOptIn === true } : null
  } catch {
    return null
  }
}

export function clearPendingDemoIntent() {
  try { window.sessionStorage.removeItem(pendingDemoStorageKey) } catch { /* best effort */ }
}

export async function captureDemoLead(marketingOptIn: boolean): Promise<DemoLeadCaptureResult> {
  const { data, error } = await authClient.functions.invoke('capture-demo-lead', {
    body: { source: 'public_demo', marketingOptIn },
  })
  if (error) throw error
  return (data || { ok: true, emailStatus: 'skipped' }) as DemoLeadCaptureResult
}
