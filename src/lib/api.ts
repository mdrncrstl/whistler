import type { Session } from '@supabase/supabase-js'
import type { PortfolioBundle, Profile, SuperheroReport } from '../types'
import { config, edgeUrl } from './config'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function edgeRequest<T>(session: Session, functionName: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(edgeUrl(functionName), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
      apikey: config.dataKey,
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.ok === false) {
    throw new ApiError(payload.error || payload.message || `Request failed (${response.status}).`, response.status)
  }
  return payload as T
}

export const portfolioApi = {
  bundle: async (session: Session) => {
    const result = await edgeRequest<{ bundle: PortfolioBundle }>(session, 'masterdeck-data', { route: 'bundle' })
    return result.bundle
  },
  updateProfile: (session: Session, profile: Pick<Profile, 'full_name' | 'avatar_url' | 'settings'>) =>
    edgeRequest<{ profile: Profile; message: string }>(session, 'masterdeck-data', { route: 'profile', action: 'update', profile }),
  importSuperhero: (session: Session, report: SuperheroReport) =>
    edgeRequest<{ counts: { positions: number; transactions: number; cash: number }; warnings: string[]; message: string }>(session, 'masterdeck-data', { route: 'superhero', action: 'import', report }),
  disconnect: (session: Session, connectionId: string) =>
    edgeRequest<{ message: string }>(session, 'masterdeck-data', { route: 'connections', action: 'disconnect', connectionId }),
  connectIbkr: (session: Session, input: { label: string; token: string; queryId: string }) =>
    edgeRequest<{ message: string }>(session, 'masterdeck-ibkr', { action: 'connect', ...input }),
  syncIbkr: (session: Session, connectionId: string) =>
    edgeRequest<{ message: string }>(session, 'masterdeck-ibkr', { action: 'sync', connectionId }),
  refreshQuotes: (session: Session) =>
    edgeRequest<{ message: string; updated: number; failures: { symbol: string; error: string }[] }>(session, 'masterdeck-quotes'),
  storeGmailToken: (session: Session, providerToken: string) =>
    edgeRequest<{ message: string; stored: boolean }>(session, 'masterdeck-gmail', { action: 'store_tokens', providerToken }),
  syncGmail: (session: Session, connectionId: string) =>
    edgeRequest<{ message: string; scanned: number; imported: number; warnings: string[] }>(session, 'masterdeck-gmail', { action: 'sync_gmail', connectionId }),
}
