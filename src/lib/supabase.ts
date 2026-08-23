import { createClient } from '@supabase/supabase-js'
import { config } from './config'

export const authClient = createClient(config.authUrl, config.authKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'masterdeck-auth',
  },
})
