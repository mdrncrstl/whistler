# MASTERDECK

MASTERDECK is a private, read-only portfolio workspace for Interactive Brokers and Superhero investors. It combines holdings, cash, activity, income, performance and Australian financial-year tax-lot reporting in one responsive web app.

## Stack

- React 19 + Vite + TypeScript
- One isolated MASTERDECK Supabase project for Auth, portfolio data and Edge Functions
- Supabase Edge Functions for broker credentials, imports and quote refreshes
- Vercel hosting

Google sign-in and optional Gmail read-only access are separate authorisations. Connecting Gmail is not required to use MASTERDECK.

## Local development

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

The public Supabase publishable keys and Google OAuth client ID belong in `.env.local`. Never place a Supabase secret/service-role key, IBKR Flex token or Google client secret in the browser environment.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run qa:visual
```

Broker connections are read-only. MASTERDECK does not place or modify trades. Tax calculations are estimates for record-keeping and should be checked by a qualified Australian tax professional.
# MASTERDECK

## Billing activation

The app includes Stripe-hosted subscription checkout, customer portal, signed webhook handling, and an RLS-protected `billing_customers` table. Annual monthly-equivalent prices are A$14, A$17.50 and A$28 — exactly 30% below the captured Navexa tiers of A$20, A$25 and A$40.

The three Edge Functions are `stripe-checkout`, `stripe-portal`, and `stripe-webhook`. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`, and `APP_ORIGIN` as Supabase project secrets. Register the webhook endpoint at:

`https://cbfettdbdjlgbjxzwvps.supabase.co/functions/v1/stripe-webhook`

Subscribe it to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Prices are created inline by Checkout from the reviewed server-side plan map, so browser-supplied amounts are never trusted.
