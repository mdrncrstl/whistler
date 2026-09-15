import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { Snaptrade, SnaptradeAuth } from 'snaptrade-typescript-sdk'

type JsonRecord = Record<string, unknown>
type SnapCredentials = { userId: string; userSecret: string }

const defaultOrigin = 'https://masterdeck.app'
const allowedOrigins = new Set([
  defaultOrigin,
  'https://www.masterdeck.app',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:4176',
  'http://127.0.0.1:4176',
  'http://localhost:4180',
  'http://127.0.0.1:4180',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const brokerDefinitions = {
  commsec: { name: 'CommSec', slug: 'COMMSEC' },
  'stake-au': { name: 'Stake', slug: 'STAKEAUS' },
  moomoo: { name: 'moomoo', slug: 'MOOMOO' },
  webull: { name: 'Webull', slug: 'WEBULL' },
  schwab: { name: 'Charles Schwab', slug: 'SCHWAB' },
  fidelity: { name: 'Fidelity', slug: 'FIDELITY' },
  robinhood: { name: 'Robinhood', slug: 'ROBINHOOD' },
  etrade: { name: 'E*TRADE', slug: 'ETRADE' },
  'vanguard-us': { name: 'Vanguard (US)', slug: 'VANGUARD' },
  degiro: { name: 'DEGIRO', slug: 'DEGIRO' },
  wealthsimple: { name: 'Wealthsimple', slug: 'WEALTHSIMPLE' },
} as const

type BrokerId = keyof typeof brokerDefinitions

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function secretKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch { /* fall through to the legacy secret name */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const admin = createClient(supabaseUrl, secretKey(), { auth: { persistSession: false } })

function configuredOrigin() {
  return Deno.env.get('APP_ORIGIN') || defaultOrigin
}

function corsHeaders(origin: string | null) {
  const candidate = origin && (allowedOrigins.has(origin) || origin === configuredOrigin()) ? origin : configuredOrigin()
  return {
    'Access-Control-Allow-Origin': candidate,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) })
}

async function authenticatedUser(request: Request): Promise<User> {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) throw new ApiError(401, 'Authentication required.')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new ApiError(401, 'Your session is no longer valid.')
  return data.user
}

function snapTradeClient() {
  const clientId = Deno.env.get('SNAPTRADE_CLIENT_ID')
  const consumerKey = Deno.env.get('SNAPTRADE_CONSUMER_KEY')
  if (!clientId || !consumerKey) throw new ApiError(503, 'Broker connections are being configured. CSV import is available now.')
  return new Snaptrade({ auth: SnaptradeAuth.commercialApiKey({ clientId, consumerKey }) })
}

function credentialsKey() {
  const secret = Deno.env.get('MASTERDECK_CREDENTIALS_KEY')
  if (!secret) throw new ApiError(503, 'Secure broker storage is not configured yet.')
  return secret
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function cryptoKey() {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credentialsKey()))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptCredentials(credentials: SnapCredentials) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await cryptoKey(),
    new TextEncoder().encode(JSON.stringify(credentials)),
  )
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`
}

async function decryptCredentials(value: string): Promise<SnapCredentials> {
  try {
    const [version, encodedIv, encodedCiphertext] = value.split('.')
    if (version !== 'v1' || !encodedIv || !encodedCiphertext) throw new Error('Invalid credential envelope')
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(encodedIv) },
      await cryptoKey(),
      fromBase64Url(encodedCiphertext),
    )
    const credentials = JSON.parse(new TextDecoder().decode(plaintext)) as Partial<SnapCredentials>
    if (!credentials.userId || !credentials.userSecret) throw new Error('Invalid credentials')
    return { userId: credentials.userId, userSecret: credentials.userSecret }
  } catch {
    throw new ApiError(409, 'This secure broker connection needs to be reconnected.')
  }
}

function unwrap(response: unknown): any {
  return (response as { data?: unknown })?.data ?? response
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : value == null ? fallback : String(value).trim()
}

function currencyCode(value: unknown, fallback = 'AUD') {
  if (typeof value === 'object' && value !== null) {
    const record = value as JsonRecord
    return text(record.code || record.currency || record.symbol, fallback).toUpperCase() || fallback
  }
  return text(value, fallback).toUpperCase() || fallback
}

function safeReturnOrigin(value: unknown) {
  const configured = configuredOrigin()
  try {
    const candidate = new URL(String(value || configured)).origin
    if (candidate === configured || allowedOrigins.has(candidate)) return candidate
  } catch { /* use configured origin */ }
  return configured
}

function callbackUrl(returnUrl: unknown, connectionId: string, brokerId: string) {
  const callback = new URL('/deck/connections', safeReturnOrigin(returnUrl))
  callback.searchParams.set('setup', 'snaptrade')
  callback.searchParams.set('connectionId', connectionId)
  callback.searchParams.set('broker', brokerId)
  return callback.toString()
}

async function connectionRows(userId: string) {
  const { data, error } = await admin.from('masterdeck_broker_connections')
    .select('id,label,status,credentials_encrypted,config,last_synced_at,last_error')
    .eq('user_id', userId)
    .eq('provider', 'snaptrade')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

async function userCredentials(client: any, userId: string, rows: any[]): Promise<SnapCredentials & { encrypted: string }> {
  const stored = rows.find((row) => row.credentials_encrypted)?.credentials_encrypted
  if (stored) return { ...(await decryptCredentials(stored)), encrypted: stored }

  const snapUserId = `masterdeck:${userId}`
  const response = unwrap(await client.authentication.registerSnapTradeUser({ userId: snapUserId })) as JsonRecord
  const userSecret = text(response.userSecret)
  if (!userSecret) throw new ApiError(502, 'The secure broker provider did not return a user credential.')
  const credentials = { userId: snapUserId, userSecret }
  return { ...credentials, encrypted: await encryptCredentials(credentials) }
}

async function ensureConnection(userId: string, brokerId: BrokerId, credentials: SnapCredentials & { encrypted: string }, rows: any[]) {
  const broker = brokerDefinitions[brokerId]
  const existing = rows.find((row) => row.config?.broker_id === brokerId || row.label === broker.name)
  const config = {
    ...(existing?.config || {}),
    broker_id: brokerId,
    broker_name: broker.name,
    broker_slug: broker.slug,
    via: 'snaptrade',
    connection_type: 'read',
    snaptrade_user_id: credentials.userId,
  }
  if (existing) {
    const { data, error } = await admin.from('masterdeck_broker_connections')
      .update({ label: broker.name, status: 'pending', credentials_encrypted: credentials.encrypted, config, last_error: null, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('id,label,status,credentials_encrypted,config,last_synced_at,last_error')
      .single()
    if (error || !data) throw error || new Error('Could not update the broker connection.')
    return data
  }
  const { data, error } = await admin.from('masterdeck_broker_connections')
    .insert({ user_id: userId, provider: 'snaptrade', label: broker.name, status: 'pending', credentials_encrypted: credentials.encrypted, config })
    .select('id,label,status,credentials_encrypted,config,last_synced_at,last_error')
    .single()
  if (error || !data) throw error || new Error('Could not create the broker connection.')
  return data
}

function accountName(account: any, brokerName: string) {
  return text(account.name || account.institution_name || account.account_category, brokerName).slice(0, 120)
}

function instrumentSymbol(instrument: any) {
  return text(instrument?.symbol || instrument?.raw_symbol || instrument?.ticker).toUpperCase()
}

function instrumentMarket(instrument: any) {
  const exchange = instrument?.exchange
  if (typeof exchange === 'object' && exchange !== null) return text(exchange.mic_code || exchange.code || exchange.name)
  return text(exchange)
}

function activitySymbol(value: unknown) {
  if (typeof value === 'object' && value !== null) {
    const symbol = value as JsonRecord
    return text(symbol.symbol || symbol.raw_symbol || symbol.ticker).toUpperCase()
  }
  return text(value).toUpperCase()
}

function activityCurrency(value: unknown, fallback: string) {
  return currencyCode(value, fallback)
}

function transactionType(value: unknown) {
  const normalized = text(value).toUpperCase()
  if (normalized === 'BUY' || normalized === 'REI') return normalized === 'REI' ? 'DIVIDEND' : 'BUY'
  if (normalized === 'SELL') return 'SELL'
  if (['DIVIDEND', 'DISTRIBUTION', 'STOCK_DIVIDEND', 'SUBSTITUTE_DIVIDEND'].includes(normalized)) return 'DIVIDEND'
  if (['INTEREST'].includes(normalized)) return 'INTEREST'
  if (['CONTRIBUTION', 'DEPOSIT'].includes(normalized)) return 'DEPOSIT'
  if (['WITHDRAWAL'].includes(normalized)) return 'WITHDRAWAL'
  if (['FEE', 'COMMISSION'].includes(normalized)) return 'FEE'
  if (['TAX'].includes(normalized)) return 'TAX'
  return 'OTHER'
}

async function fetchActivities(client: any, accountId: string, credentials: SnapCredentials) {
  const activities: any[] = []
  const limit = 1000
  for (let offset = 0; offset < 100000; offset += limit) {
    const response = unwrap(await client.accountInformation.getAccountActivities({ accountId, userId: credentials.userId, userSecret: credentials.userSecret, offset, limit })) as JsonRecord
    const page = Array.isArray(response.data) ? response.data : []
    activities.push(...page)
    if (page.length < limit || response.pagination?.next == null && response.pagination?.total == null) break
    if (typeof response.pagination?.total === 'number' && offset + page.length >= response.pagination.total) break
  }
  return activities
}

async function syncConnection(user: User, connectionId: string) {
  const { data: connection, error: connectionError } = await admin.from('masterdeck_broker_connections')
    .select('id,label,status,credentials_encrypted,config,last_synced_at,last_error')
    .eq('id', connectionId)
    .eq('user_id', user.id)
    .eq('provider', 'snaptrade')
    .maybeSingle()
  if (connectionError) throw connectionError
  if (!connection) throw new ApiError(404, 'That broker connection no longer exists.')
  if (!connection.credentials_encrypted) throw new ApiError(409, 'Reconnect this broker before syncing it.')

  const brokerId = text(connection.config?.broker_id) as BrokerId
  const broker = brokerDefinitions[brokerId]
  if (!broker) throw new ApiError(400, 'This broker connection is no longer supported.')
  const credentials = await decryptCredentials(connection.credentials_encrypted)
  const client = snapTradeClient()
  const authorizations = unwrap(await client.connections.listBrokerageAuthorizations({ userId: credentials.userId, userSecret: credentials.userSecret })) as any[]
  const authorization = authorizations.find((item) => text(item.brokerage?.slug).toUpperCase() === broker.slug)
  if (!authorization) throw new ApiError(409, `Finish connecting ${broker.name} in the secure broker window, then try again.`)

  const accounts = unwrap(await client.connections.listBrokerageAuthorizationAccounts({ authorizationId: authorization.id, userId: credentials.userId, userSecret: credentials.userSecret })) as any[]
  const collected = await Promise.all(accounts.map(async (account) => {
    const accountId = text(account.id)
    const name = accountName(account, broker.name)
    const [positionsResponse, balancesResponse, activities] = await Promise.all([
      client.accountInformation.getAllAccountPositions({ accountId, userId: credentials.userId, userSecret: credentials.userSecret }),
      client.accountInformation.getUserAccountBalance({ accountId, userId: credentials.userId, userSecret: credentials.userSecret }),
      fetchActivities(client, accountId, credentials),
    ])
    const positionsPayload = unwrap(positionsResponse) as JsonRecord
    const positions = (Array.isArray(positionsPayload.results) ? positionsPayload.results : []).map((position: any) => {
      const instrument = position.instrument || {}
      const symbol = instrumentSymbol(instrument)
      const units = numeric(position.units)
      const price = numeric(position.price)
      const averageCost = numeric(position.cost_basis, price)
      const cost = units * averageCost
      const value = units * price
      const currency = currencyCode(position.currency || instrument.currency, text(account.base_currency, 'AUD'))
      return {
        user_id: user.id,
        broker_connection_id: connectionId,
        provider: 'snaptrade',
        provider_account_id: accountId,
        account_name: name,
        symbol,
        name: text(instrument.description || instrument.name, symbol),
        market: instrumentMarket(instrument),
        currency,
        asset_class: text(instrument.kind || instrument.type, 'Security'),
        quantity: units,
        average_cost: averageCost,
        current_price: price,
        fx_rate: 1,
        value_aud: value,
        cost_aud: cost,
        unrealised_gain_aud: value - cost,
        return_pct: cost ? (value - cost) / cost * 100 : 0,
        day_change_aud: 0,
        as_of: positionsPayload.data_freshness?.as_of || new Date().toISOString(),
        raw_data: { provider: 'snaptrade', instrument_kind: text(instrument.kind || instrument.type), cash_equivalent: Boolean(position.cash_equivalent) },
      }
    }).filter((position: any) => position.symbol && position.quantity !== 0 && !position.raw_data.cash_equivalent)
    const balances = (Array.isArray(unwrap(balancesResponse)) ? unwrap(balancesResponse) : []).map((balance: any) => {
      const currency = currencyCode(balance.currency, text(account.base_currency, 'AUD'))
      const amount = numeric(balance.cash)
      return {
        user_id: user.id,
        broker_connection_id: connectionId,
        provider: 'snaptrade',
        provider_account_id: accountId,
        account_name: name,
        currency,
        balance: amount,
        fx_rate: 1,
        value_aud: amount,
        as_of: new Date().toISOString(),
      }
    })
    const transactions = activities.map((activity: any) => {
      const currency = activityCurrency(activity.currency, text(account.base_currency, 'AUD'))
      const id = text(activity.id || activity.external_reference_id || `${activity.trade_date}-${activity.type}-${activity.symbol}`)
      return {
        user_id: user.id,
        broker_connection_id: connectionId,
        provider: 'snaptrade',
        provider_external_id: `${accountId}:${id}`,
        provider_account_id: accountId,
        account_name: name,
        date: activity.trade_date || activity.settlement_date || new Date().toISOString(),
        type: transactionType(activity.type),
        symbol: activitySymbol(activity.symbol) || null,
        description: text(activity.description || activity.type, 'Broker activity'),
        quantity: numeric(activity.units),
        price: numeric(activity.price),
        currency,
        amount: numeric(activity.amount),
        fees: numeric(activity.fee),
        fx_rate: 1,
        raw_data: { provider: 'snaptrade', provider_type: text(activity.type), external_reference_id: text(activity.external_reference_id) || null },
      }
    })
    return {
      account: {
        user_id: user.id,
        broker_connection_id: connectionId,
        provider: 'snaptrade',
        provider_account_id: accountId,
        name,
        base_currency: text(account.base_currency, 'AUD'),
        raw_data: { institution_name: text(account.institution_name), account_category: text(account.account_category), broker: broker.slug },
      },
      positions,
      balances,
      transactions,
    }
  }))

  const accountsToStore = collected.map((item) => item.account)
  const positionsToStore = collected.flatMap((item) => item.positions)
  const balancesToStore = collected.flatMap((item) => item.balances)
  const transactionsToStore = collected.flatMap((item) => item.transactions)
  const startedAt = new Date().toISOString()
  const { data: syncRun, error: syncRunError } = await admin.from('masterdeck_sync_runs')
    .insert({ user_id: user.id, broker_connection_id: connectionId, provider: 'snaptrade', status: 'running', message: `Syncing ${broker.name}`, started_at: startedAt })
    .select('id')
    .single()
  if (syncRunError) throw syncRunError

  try {
    for (const table of ['masterdeck_positions', 'masterdeck_cash_balances', 'masterdeck_accounts'] as const) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id).eq('broker_connection_id', connectionId)
      if (error) throw error
    }
    const { error: transactionDeleteError } = await admin.from('masterdeck_transactions').delete().eq('user_id', user.id).eq('broker_connection_id', connectionId)
    if (transactionDeleteError) throw transactionDeleteError

    if (accountsToStore.length) {
      const { error } = await admin.from('masterdeck_accounts').upsert(accountsToStore, { onConflict: 'user_id,provider,provider_account_id' })
      if (error) throw error
    }
    if (positionsToStore.length) {
      const { error } = await admin.from('masterdeck_positions').upsert(positionsToStore, { onConflict: 'user_id,broker_connection_id,provider,provider_account_id,symbol' })
      if (error) throw error
    }
    if (balancesToStore.length) {
      const { error } = await admin.from('masterdeck_cash_balances').upsert(balancesToStore, { onConflict: 'user_id,broker_connection_id,provider,provider_account_id,currency' })
      if (error) throw error
    }
    if (transactionsToStore.length) {
      const { error } = await admin.from('masterdeck_transactions').upsert(transactionsToStore, { onConflict: 'user_id,provider,provider_external_id' })
      if (error) throw error
    }

    const finishedAt = new Date().toISOString()
    const details = { broker: broker.slug, accounts: accountsToStore.length, positions: positionsToStore.length, cash: balancesToStore.length, transactions: transactionsToStore.length }
    const { error: runUpdateError } = await admin.from('masterdeck_sync_runs').update({ status: 'success', message: `Imported ${positionsToStore.length} positions, ${transactionsToStore.length} activities and ${balancesToStore.length} cash balances.`, imported_count: positionsToStore.length + transactionsToStore.length + balancesToStore.length, details, finished_at: finishedAt }).eq('id', syncRun.id)
    if (runUpdateError) throw runUpdateError
    const { error: connectionUpdateError } = await admin.from('masterdeck_broker_connections').update({ status: 'connected', last_synced_at: finishedAt, last_error: null, config: { ...(connection.config || {}), snaptrade_authorization_id: authorization.id, account_count: accountsToStore.length }, updated_at: finishedAt }).eq('id', connectionId).eq('user_id', user.id)
    if (connectionUpdateError) throw connectionUpdateError
    return { message: `Imported ${positionsToStore.length} positions and ${transactionsToStore.length} activities from ${broker.name}.`, imported: positionsToStore.length + transactionsToStore.length + balancesToStore.length, accounts: accountsToStore.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The broker data could not be saved.'
    const finishedAt = new Date().toISOString()
    await admin.from('masterdeck_sync_runs').update({ status: 'error', message: 'The broker data could not be saved.', finished_at: finishedAt }).eq('id', syncRun.id)
    await admin.from('masterdeck_broker_connections').update({ status: 'error', last_error: 'The latest broker sync could not be saved.', updated_at: finishedAt }).eq('id', connectionId).eq('user_id', user.id)
    throw new ApiError(502, message)
  }
}

async function startConnection(user: User, brokerId: BrokerId, returnUrl: unknown) {
  const client = snapTradeClient()
  const rows = await connectionRows(user.id)
  const credentials = await userCredentials(client, user.id, rows)
  const connection = await ensureConnection(user.id, brokerId, credentials, rows)
  const broker = brokerDefinitions[brokerId]
  const response = unwrap(await client.authentication.loginSnapTradeUser({
    broker: broker.slug,
    immediateRedirect: true,
    customRedirect: callbackUrl(returnUrl, connection.id, brokerId),
    connectionType: 'read',
    showCloseButton: true,
    connectionPortalVersion: 'v4',
    userId: credentials.userId,
    userSecret: credentials.userSecret,
  })) as JsonRecord
  const redirectUrl = text(response.redirectURI)
  if (!redirectUrl) throw new ApiError(502, 'The secure broker provider did not return a connection link.')
  return { message: `Opening a read-only ${broker.name} connection.`, redirectUrl, connectionId: connection.id }
}

async function disconnectConnection(user: User, connectionId: string) {
  const { data: connection, error } = await admin.from('masterdeck_broker_connections')
    .select('id,credentials_encrypted,config')
    .eq('id', connectionId)
    .eq('user_id', user.id)
    .eq('provider', 'snaptrade')
    .maybeSingle()
  if (error) throw error
  if (!connection) throw new ApiError(404, 'That broker connection no longer exists.')
  if (connection.config?.snaptrade_authorization_id && connection.credentials_encrypted) {
    const credentials = await decryptCredentials(connection.credentials_encrypted)
    const client = snapTradeClient()
    await client.connections.deleteConnection({ connectionId: connection.config.snaptrade_authorization_id, userId: credentials.userId, userSecret: credentials.userSecret })
  }
  const { error: deleteError } = await admin.from('masterdeck_broker_connections').delete().eq('id', connectionId).eq('user_id', user.id)
  if (deleteError) throw deleteError
  return { message: 'Broker connection and imported records removed.' }
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)

  try {
    const user = await authenticatedUser(request)
    const body = await request.json().catch(() => ({})) as { action?: unknown; brokerId?: unknown; connectionId?: unknown; returnUrl?: unknown }
    const action = text(body.action)
    if (action === 'start') {
      const brokerId = text(body.brokerId) as BrokerId
      if (!brokerId || !(brokerId in brokerDefinitions)) throw new ApiError(400, 'Choose a supported broker.')
      return json({ ok: true, ...(await startConnection(user, brokerId, body.returnUrl)) }, 200, origin)
    }
    if (action === 'sync') {
      const connectionId = text(body.connectionId)
      if (!connectionId) throw new ApiError(400, 'Choose a broker connection.')
      return json({ ok: true, ...(await syncConnection(user, connectionId)) }, 200, origin)
    }
    if (action === 'disconnect') {
      const connectionId = text(body.connectionId)
      if (!connectionId) throw new ApiError(400, 'Choose a broker connection.')
      return json({ ok: true, ...(await disconnectConnection(user, connectionId)) }, 200, origin)
    }
    throw new ApiError(400, 'Unknown broker connection action.')
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 400
    const message = error instanceof ApiError ? error.message : 'The broker connection could not be completed.'
    return json({ ok: false, error: message }, status, origin)
  }
})
