export const config = {
  authUrl: import.meta.env.VITE_AUTH_SUPABASE_URL || 'https://xcvffxzivlefjofueiei.supabase.co',
  authKey: import.meta.env.VITE_AUTH_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_170cU4JBOODiRIHZRQiKKg_HZ9y2RkJ',
  dataUrl: import.meta.env.VITE_DATA_SUPABASE_URL || 'https://cbfettdbdjlgbjxzwvps.supabase.co',
  dataKey: import.meta.env.VITE_DATA_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Dy8PHPwTtzv1u3BceXkgTA_JpBlPY4A',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '269030834772-skfkjvkmt2q0huva1bsh8vjr96vumd95.apps.googleusercontent.com',
} as const

export const edgeUrl = (name: string) => `${config.dataUrl}/functions/v1/${name}`
