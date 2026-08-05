# Six Stamps — Core Build Spec

A visit-driven stamp card for Steers & Debonairs (Malaysia, RM, English + Bahasa Malaysia).

**Stack:** Next.js on Vercel, Supabase (Postgres, Auth, RLS, SECURITY DEFINER functions).
**onlyAIapp:** provisioning and deploy orchestration only — no runtime role, no game logic depends on it.

---

## The product in one paragraph

Every visit, the customer claims a code from their purchase and fills one stamp on a card. Six stamps completes the card and earns a **free Triple-Decker** — no minimum purchase, no conditions. The card shows exactly where they are and exactly what they get. Nothing is random.

Be clear-eyed about what this is: a six-punch loyalty card with a collectable skin. That is not a weakness. It is the only mechanic in this portfolio with a direct, countable line to repeat visits, and it works precisely because the customer can do the arithmetic themselves.

---

## Design decisions — settled, do not re-open

**Stamps are deterministic, never random.** Each claim fills the next available slot. There are no duplicate stamps, no rare stamp, no "one more to complete the set" frustration loop. Six visits, six stamps, guaranteed. This is a deliberate rejection of the random-collectable model: chance-based prize mechanics are a different regulatory animal in this market, and the rest of this portfolio is deterministic. Consistency across the estate makes legal review tractable.

**The customer picks their reward, not their stamps.** On completion, offer a small content-managed set of reward options and let them choose. Agency belongs at the payoff, where it means something, not at the stamp slot, where it is decoration.

**No minimum purchase on the completion reward.** They have already bought six times. Attaching a seventh condition to the payoff is the kind of small meanness that gets screenshotted onto Lowyat. If the client insists otherwise, surface it as their decision with that risk stated.

**Stamps are non-transferable.** No gifting, no trading, no sharing between accounts. Permit it and a secondary market appears within a fortnight.

---

## Feature 1 — Claiming a stamp

The customer enters or scans a single-use code tied to their purchase. On a valid claim, one stamp fills, immediately and visibly, with the card's remaining count and deadline updated.

**Codes come from a pre-generated pool** (`stamp_codes`), issued in batches per outlet, distributed at the till. Each code is globally single-use and permanently bound to the first account that claims it.

**Understand what this does and does not prove.** Without POS integration, a code proves a slip was handed over — not that a purchase occurred, and not for how much. That gap is a commercial risk for the client to accept explicitly, not an engineering problem to solve here. Print it in the handover notes. POS-printed codes bound to a bill total are the eventual answer.

## Feature 2 — Fraud controls (the critical piece)

This is the highest-abuse-surface product in the portfolio. Codes will be photographed, shared in WhatsApp groups, posted to forums, and recovered from bins. Design for that from the first commit:

- **Single-use globally**, enforced by a unique constraint on the code row's claimed-by field, not by application logic. First claim wins; every subsequent attempt fails identically.
- **High entropy.** Codes must not be guessable or enumerable. If a short human-typeable code is required, pair it with per-account and per-IP rate limiting and a lockout after repeated failures.
- **Time-to-live.** A code expires a configurable number of hours after issue. This is what kills resale, bin-diving and stockpiling — a code that is only good today is worth almost nothing to a reseller.
- **Daily claim cap per account.** A real customer does not buy eight times in a day. Cap it, configurably, and log every rejection.
- **Outlet velocity monitoring.** Track claims per outlet per hour. An outlet issuing far beyond its transaction volume is a staff-abuse signal, not a popular branch. Expose this as a query; do not attempt automated enforcement in v1.

Claiming is a SECURITY DEFINER RPC. The client never writes stamp state.

## Feature 3 — The card, expiry and liability

A card is created on the first claim and carries an expiry set a configurable number of days from that moment.

Expiry is the single largest source of customer anger in loyalty programmes, so handle it deliberately: the deadline is visible from the first stamp onward, never buried, and the interval should be generous enough that six visits are comfortably achievable. Warn the customer as the deadline approaches. A card that expires quietly is worse for the brand than no card at all.

**Every incomplete card is a deferred liability.** The business owes food to everyone holding five stamps. Build a reporting view giving outstanding cards by stamp count, projected redemption exposure, and completion rate by cohort. Finance needs this before launch, not after.

## Feature 4 — Completion and redemption

On the sixth stamp: the customer chooses from the available reward options, and a single-use redemption code is minted with a validity window.

**Redemption uses the same staff verification surface as Flame Grill** — a staff-authenticated page where a code is entered, validated, and marked redeemed with timestamp and outlet. Idempotent: an already-redeemed code returns a clear "already used" state showing the original timestamp, never an error and never a second grant.

A new empty card becomes available immediately.

## Feature 5 — Frontend and data model

Mobile-first. The card is the entire home screen: six slots, filled ones obvious at a glance, the deadline and remaining count always visible. Plain-language copy, English and Bahasa Malaysia. Claiming must feel instant — optimistic fill with server reconciliation and a clean rollback.

`profiles` · `stamp_codes` · `cards` · `card_stamps` · `reward_options` · `rewards` · `game_config`

`UNIQUE (card_id, stamp_slot)` and a unique constraint on the claimed code prevent double-fills under retry or concurrency. Row Level Security on every table; users read and write only their own rows. The staff redemption path is separately authenticated.

`game_config` holds: stamps required, card validity days, code time-to-live, daily claim cap.

---

## Not in v1

POS integration · WhatsApp code delivery · push notifications · randomised or rare stamps · stamp gifting or transfer · leaderboards · tiers or VIP levels · automated fraud enforcement (monitoring only)

---

## Done when

1. Six valid claims complete a card, a reward is chosen, and a redemption code is issued.
2. A code already claimed by any account is rejected for every subsequent attempt.
3. An expired code is rejected and does not fill a stamp.
4. Concurrent or replayed claims of the same code fill exactly one stamp.
5. The daily claim cap is enforced server-side and cannot be bypassed from the client.
6. A card's deadline is visible from the first stamp, and an expired card cannot be claimed against.
7. A redemption code works once; a second attempt reports "already used" with the original timestamp.
8. Stamps required, card validity, code TTL and reward options change via table edits with no redeploy.
9. The liability report returns outstanding cards by stamp count.
10. A user cannot read or modify another user's card, stamps or rewards.
