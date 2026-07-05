# Stripe Integration Status — Buyers Agent Hub

**Health-check date:** July 5, 2026 (read-only audit — code, deployed edge-function secrets, live DB counts, deployed Vercel bundle)
**Verdict in one line:** the full money loop (subscriptions IN, Connect payouts OUT) is **built and proven end-to-end in TEST mode**; nothing is configured for live mode yet.

---

## 1. Subscriptions — built end-to-end, working in TEST mode

Flow: Pricing page → `stripe-create-checkout` edge function (creates Stripe customer, saves `stripe_customer_id`, builds Checkout session with promo codes + billing address + tax-ID collection) → Stripe-hosted checkout → webhook updates the profile (`subscription_status`, `subscription_tier`, `subscription_current_period_end`; downgrade to free on cancellation) → Billing page opens the Stripe Customer Portal. Guest signup→checkout flow exists.

**Evidence of use (test mode):** 4 profiles have Stripe customer IDs; 3 are on active paid tiers.

**Gaps:**
- `invoice.paid` / `invoice.payment_failed` are **log-only stubs** — a failed renewal does not set `past_due` and sends no dunning email.
- The 4 price IDs are **hardcoded sandbox IDs in 3 places** (`src/lib/stripe.ts`, the checkout edge function, the webhook) — good refactor target: centralise before go-live.
- **Tier enforcement is thin** — premium forum categories are gated, little else; CRM (Monaco) gating awaits Dani decision #23.

## 2. Stripe Connect (payouts to professionals) — fully built, proven in TEST mode

Not "in the queue" — it is **done**: 4 edge functions (`stripe-connect-onboarding` / `-dashboard` / `-payout` / `-status`) plus the escrow pair (`accept-bid-with-payment`, `refund-escrow-payment`). Implemented lifecycle: Connect Express onboarding (33-country selector) → escrow payment on bid accept → 90/10 fee split (`calculateFees`) → payout via Stripe Transfer on report approval → `pending_inspector_setup` holding state with auto-transition when onboarding completes → refunds.

**Evidence of use (test mode):** 1 onboarded Connect account, 5 `inspection_payments` records, **2 jobs with `payout_status = 'paid'`** — money has moved end-to-end in test mode.

## 3. Webhooks & secrets

- **9 event types handled**, signatures verified against BOTH the platform and Connect webhook secrets: `checkout.session.completed` (subscription + escrow branches), `customer.subscription.created/updated/deleted`, `invoice.paid` / `invoice.payment_failed` (stubs), `account.updated`, `transfer.created`, `charge.refunded`.
- **Deployed edge-function secrets are genuinely set** (verified server-side, July 5 2026): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `RESEND_API_KEY`.
- The local `.env` Stripe entries are just `pk_test_xxx` / `sk_test_xxx` / `whsec_xxx` **placeholders — harmless**; real keys live server-side where they belong.
- **NOTE:** the deployed Vercel frontend bundle contains **NO Stripe publishable key** (Supabase + Mapbox keys are present; no `pk_test_`/`pk_live_`). Currently harmless — all checkout flows redirect via server-generated URLs, and `redirectToCheckout` (the only Stripe.js consumer) is dead code — but this **must be fixed before ever using Stripe.js or Elements directly** (set `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel project env).

## 4. Mode

**Everything is TEST/sandbox.** Sandbox price IDs, test-mode payout debugging history, no trace of `pk_live_` / `sk_live_` anywhere. No live configuration exists yet.

## 5. Go-live checklist (for real money to flow)

**Both directions:**
1. Activate the Stripe account for live mode (business verification + bank account).
2. Create **live** webhook endpoints (platform + Connect) and swap the 3 `STRIPE_*` edge-function secrets to live values.

**Subscriptions IN:**
3. Create live Products/Prices; replace the 4 sandbox price IDs (**centralise them first** — see gap above).
4. Decide tier gating (Dani #23) so paying actually buys something enforced.

**Payouts OUT:**
5. Enable Connect in live mode (Stripe platform profile/branding review); re-onboard inspectors in live mode (test-mode Connect accounts don't carry over).
6. 🔴 **RESEARCH RISK:** Stripe **cross-border transfers from an AU platform** to overseas Connect accounts have real restrictions — the current separate-charge-plus-transfer pattern may not work for every country pairing. **Validate the 33-country payout story against Stripe's docs before launch.**

**Adjacent polish (not blocking payments):**
7. Resend still sends from `onboarding@resend.dev` pending `buyersagenthub.com` domain verification — affects payment email polish, not payment processing.

## 6. Geneva note

The subscription webhook → `profiles` pipeline (`stripe_customer_id`, `subscription_tier`, `subscription_status`, `subscription_current_period_end`) is **exactly the data Geneva** (our internal customer CRM, to be built after Monaco) **will sit on top of**. Design Geneva's customer records around it.
