import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260829075005_referral_program.sql', 'utf8')

describe('referral programme database security', () => {
  it('enables RLS and keeps client writes behind authenticated RPCs', () => {
    for (const table of ['referral_profiles', 'referral_attributions', 'referral_rewards']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
    expect(migration).toContain('revoke all on public.referral_profiles, public.referral_attributions, public.referral_rewards from anon, authenticated')
    expect(migration).toContain("security definer\nset search_path = ''")
    expect(migration).toContain('grant execute on function public.claim_referral_code(text) to authenticated')
    expect(migration).toContain('constraint referral_attributions_no_self_referral')
  })
})
