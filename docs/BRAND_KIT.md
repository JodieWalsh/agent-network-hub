# Buyers Agent Hub — Brand Kit

**Created:** July 6, 2026 · **Owner:** Jodie & Dani
**Purpose:** the single reference for the whole brand — app, emails, social, decks, anything new. If a colour, font, or sentence doesn't match this doc, it isn't on brand. (CLAUDE.md's DESIGN VISION governs app implementation detail; this kit is the superset for everything brand-facing.)

> **Keep this doc alive.** When the brand evolves — a new colour, a tone decision, a launch-phase change — update it here first, in the same commit as the change. It is referenced from `README.md`.

---

## 1. Brand Essence

Buyers Agent Hub feels like **a private members' club for serious property professionals** — quiet modern luxury, not loud SaaS. Warm ivory rooms, deep forest green, a glint of rose gold; generous space, fine borders, ambient light. Everything communicates the same promise: *this is a considered place, built by people who take your work as seriously as you do.* It is calm where the industry is chaotic, discreet where others shout, and premium without ever being exclusive about it.

Built **for property professionals — buyers agents first** — with inspectors, conveyancers, mortgage brokers, and stylists alongside them. The brand is **globally-minded (AU, US, UK)**: never country-specific in copy, imagery, or examples unless the context genuinely is.

## 2. Colour Palette

| Swatch role | Name | Hex | Use it for |
|---|---|---|---|
| **Primary** | Forest Green | `#2D6350` | Primary buttons, active states, key accents, brand surfaces |
| **Primary deep** | Deep Green | `#173A31` | Sidebar/dark surfaces, hover on forest, shadows |
| **Accent** | Rose Gold | `#B76E79` | Decorative accents, borders, icons, large display text — **never small text** (see contrast rules) |
| **Accent deep** | Deep Rose | `#8F4E58` | Small rose text on light backgrounds; solid rose buttons (white text passes) |
| **Highlight** | Champagne | `#D8C3B8` | Gentle chips/nudges, sidebar icons, soft highlights on dark green |
| **Canvas** | Warm Ivory | `#F6F1EA` | Page backgrounds, light text on solid forest panels |
| **Text** | Charcoal | `#1C1917` | Body text on ivory/white |
| **Text secondary** | Warm Stone | `#57534E` | Secondary/meta text on light backgrounds |
| **Text placeholder** | Faded Stone | `#8A8580` | Input placeholders only |
| Support | Mist Border | `rgba(255,255,255,0.12)` | Fine borders on dark surfaces |
| Support (landing) | Mint Tint | `#F0F7F3` | Landing-page light section tint |
| Support (landing) | Ink | `#0A0A0A` / `#4A5568` | Landing display headings / landing body slate |

**Contrast rules (WCAG-verified in this codebase — non-negotiable):**
- White text on Forest `#2D6350` ✅ and on Deep Rose `#8F4E58` ✅. Charcoal `#1C1917` on ivory/white ✅. Warm Stone `#57534E` on ivory/white ✅. Deep Rose `#8F4E58` on white/ivory ✅ (this is the small-rose-text colour).
- **Rose Gold `#B76E79` FAILS WCAG for small text** on light backgrounds (~3.2:1) *and* as small text on solid Forest (~4.1:1 — caught in a real audit July 5). Use it decoratively, for large display text, borders, and icons; for small text reach for `#8F4E58` (light backgrounds) or Warm Ivory `#F6F1EA` (dark/forest backgrounds).
- Champagne `#D8C3B8` is safe on the *darkest* green overlays but **not** on solid Forest for small text — same rule: prefer Warm Ivory there.
- Every button gets an **explicit** text colour — never inherited.

## 3. Typography

| Face | Role | Rules |
|---|---|---|
| **Cormorant Garamond** | Display & hero moments ONLY | Headings, record names ("Smith Household"), stat headlines, the logo wordmark. Semibold, tight letter-spacing on big sizes. Never for body, buttons, labels, or numbers. |
| **DM Sans** | Everything else | All UI text, body copy, buttons, labels, badges, forms, emails. Uppercase micro-labels get generous tracking (`0.14em–0.25em`). |
| **Numbers** | Always DM Sans `tabular-nums` | Dates, counts, money, stats — never Cormorant, so columns align and dashboards read cleanly. |

Examples from the live app: a contact record shows the name in Cormorant ("TEST Harper Record") over DM Sans meta text; the dashboard stat tiles pair a Cormorant headline with DM Sans tabular figures; buttons are always DM Sans semibold, often uppercase-tracked on the landing page.

## 4. Voice & Tone

**Personality: warm, premium, trustworthy, quietly confident.** We sound like a knowledgeable colleague at a good dinner — never a megaphone. No hype, no exclamation-mark pile-ups, no fake urgency, no jargon walls.

- **Calm and human:** "Nothing open — add a task to keep momentum." "A reason helps you learn from this — even a few words is enough."
- **Gentle nudges, never alarms:** "This household has been in Discovery for 12 days — consider a next step."
- **Honest, always:** no fabricated stats, testimonials, or usage claims — ever (this is both brand and consumer law; see the July 5 honesty pass).
- **Warm success moments:** "You're on the list ✦ we'll be in touch."
- **Playful signatures — the wink, used sparingly:** the marketplace board is **"Inspection Spotlights"**; the payment-released notification is **"Ka-ching!"**; earning a badge is **"Achievement Unlocked!"**. These moments of delight belong in *celebrations and named features* — never in errors, legal/consent copy, money-in-escrow states, or anything a stressed user reads.
- **Global and inclusive:** no country-specific idiom or claims ("Built in Australia") in shared copy; regions/currencies come from the user's context. Plain, welcoming English that reads the same in Sydney, Austin, or London.

## 5. UI Flavour — the recurring signatures

- **Frosted quiet-luxury dialogs** — never `window.confirm()`. Rounded 20px panels, warm white-to-ivory gradients, rose-gold top border (`rgba(183,110,121,0.3)`), backdrop blur, warm shadows with a rose bloom.
- **Gentle badges** — muted rounded chips (forest tint = positive/active, rose tint = in-motion, champagne = waiting/neutral, white/stone = closed). Never traffic-light red/amber/green blocks.
- **Calm empty states with the ✦ motif** — an icon in a soft rose-tinted square, a Cormorant headline with a human line ("The book is open"), one clear action. The ✦ sparkle marks quiet delight (per-view empty states, waitlist success).
- **Gentle alerts** — champagne/rose hourglass chips and inline nudges for "stalling"/overdue; never heavy red alert boxes. Errors are a quiet deep-rose sentence, not a siren.
- **Material feel** — frosted glass panels (`backdrop-blur`, `bg-white/80`), subtle hover lift on interactive cards, fine borders over heavy outlines, aurora/ambient gradients behind hero moments, generous padding always.

## 6. Do / Don't

**DO**
- Use the exact hexes above; take all styling from this kit + CLAUDE.md, never from older pages (the legacy Briefs pages are explicitly *not* the reference).
- Use `household_name` as the display source of truth wherever a Monaco household is shown.
- Keep suggestions and automations **advisory** — the user always clicks; nothing changes state on its own.
- Verify UI changes with puppeteer + a WCAG contrast audit before committing (zero issues is the bar).
- Write global-friendly copy; celebrate quietly (✦, "Ka-ching!") in the right moments.

**DON'T**
- Don't use fabricated stats, testimonials, or usage claims — anywhere, ever.
- Don't use country-specific copy ("Built in Australia", "across Australia") in shared surfaces — US/UK expansion is live strategy.
- Don't put Rose Gold `#B76E79` on small text, or champagne small-text on solid forest — use the contrast rules above.
- Don't use Cormorant for body text, buttons, or numbers; don't let numbers render non-tabular.
- Don't drift the palette (no new colours without updating this kit), don't use `hsl(var(--colour))` indirection in Tailwind, don't ship `window.confirm()` or heavy red alert blocks.

## 7. Keeping it current

This kit changes **with** the brand, not after it: palette additions, tone shifts, launch-phase copy changes (e.g. when the waitlist becomes open signup) get recorded here in the same PR. Referenced from `README.md` so every session and collaborator finds it first.
