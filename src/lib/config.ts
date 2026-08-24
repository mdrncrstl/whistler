export const config = {
  authUrl: import.meta.env.VITE_AUTH_SUPABASE_URL || 'https://cbfettdbdjlgbjxzwvps.supabase.co',
  authKey: import.meta.env.VITE_AUTH_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Dy8PHPwTtzv1u3BceXkgTA_JpBlPY4A',
  dataUrl: import.meta.env.VITE_DATA_SUPABASE_URL || 'https://cbfettdbdjlgbjxzwvps.supabase.co',
  dataKey: import.meta.env.VITE_DATA_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Dy8PHPwTtzv1u3BceXkgTA_JpBlPY4A',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '41868567641-3mfn5d7h31uv7t3d4ds6ur12ohtvu3pb.apps.googleusercontent.com',
} as const

export const edgeUrl = (name: string) => `${config.dataUrl}/functions/v1/${name}`
