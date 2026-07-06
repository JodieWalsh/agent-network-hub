# Design & Accessibility Review — Findings

**Date:** July 8, 2026 · **Scope:** read-only review, no code changed
**Method:** ui-ux-pro-max skill rules (accessibility / touch targets / responsive as priority) + static code analysis + a live puppeteer probe of 12 routes at **375×812**, each in **two modes**: default root font and a **24px-root large-font simulation** (the low-vision / iOS-large-accessibility-fonts case). Contrast measured with the same WCAG formula as the repo's verify scripts.
**Brand reference:** `docs/BRAND_KIT.md` (quiet luxury; the `#8F4E58` small-rose-text rule).

**Routes probed live:** auth, dashboard, directory, marketplace, forums, pricing, clients (Monaco), geneva (dashboard), geneva/contacts, messages, settings/profile, plus the 404 page. *(Coverage note: the real logged-out landing page, modals/dialogs, Welcome flow, and premium-member states were not exercised — see Follow-ups.)*

**What's already good:** zero WCAG contrast failures on every probed page in both font modes (the "zero issues" bar is holding); the viewport meta is correct and pinch-zoom is not disabled; BottomNav links already have `min-h-[44px]`; buttons have visible `focus-visible` rings.

---

## ⚠️ Update — July 8, 2026 (after the review): outcomes & methodology correction

**Methodology correction.** The original probe loaded each page at the default font and then flipped the root font to 24px mid-session. That method **inflates widths**: Chrome's emulated mobile layout viewport latches to the widest transient state during the flip and never shrinks back, so several "overflow" numbers were measurement artifacts. The honest method — and the realistic one, since a low-vision user's font setting exists before any page loads — is applying the 24px root font **from first paint** (`page.evaluateOnNewDocument` injecting `html { font-size: 24px !important; }` before navigation). All C1/C2 verification below used the corrected method.

**Outcomes so far (C1 + C2 complete):**

| Finding / page | Original claim | Re-measured reality | Outcome |
|---|---|---|---|
| **C1** settings/profile | 391px default / 584px large | **REAL** (391 was genuine at default font) | ✅ **Fixed & shipped** `fc94457` — `min-w-0` on the flex rows in `ServiceAreaManager.tsx` + `ProfileEdit.tsx`; now 375/375 |
| **C2** Dashboard | 452px large font | **REAL** (rigid 398px grid sections confirmed by squeeze test) | ✅ **Fixed & shipped** `843a1ac` — `min-w-0` on the page-grid columns in `Index.tsx`; `min-w-0`/`flex-wrap`/`break-words` on the tiles in `PowerTiles.tsx`; now 375/375 |
| **C2** Forums | 472px large font | **ARTIFACT** — measures 375/375, zero offenders | No change needed |
| **C2** Marketplace | 427px large font | **ARTIFACT** — measures 375/375, zero offenders | No change needed |
| **C2** Geneva dashboard | 439px large font | **ARTIFACT for scroll** — measures 375/375 | No scroll change needed — **but** its 24px-tall region bars remain a REAL touch-target finding (see **H1**) and its ellipsis-heavy attention rows remain a REAL truncation finding (see **H5**). Not lost, just not C2. |

**No horizontal scrolling remains on any measured page at either font size.** Next up in the attack order: **C4** (fixed-px text that never scales).

---

## 🔴 Critical

### C1. `settings/profile` horizontally scrolls at the DEFAULT font size — ✅ DONE (real; fixed & shipped `fc94457`)
- **Resolution:** the culprit was one level down from where this entry guessed — the classic flex `min-width:auto` trap in `ServiceAreaManager.tsx:759` (service-area rows) and `ProfileEdit.tsx:584` (security-status row). Two one-class `min-w-0` edits; verified 375/375 in both font modes with screenshots.
- **Where (original):** `src/pages/settings/ProfileEdit.tsx` (page scrollWidth 391px vs 375px viewport; grows to **584px vs 375** at large fonts).
- **Problem:** the page is wider than an iPhone screen even before any accessibility settings are applied — the whole page pans sideways.
- **Suggested fix:** find the fixed-width child (likely a grid/flex row or input group without `min-w-0`) and constrain it (`max-w-full`, `min-w-0`, `flex-wrap`). Re-verify with the 375px + 24px-root probe.

### C2. Horizontal page scroll appears at large font sizes on four more pages — ✅ DONE (see the July 8 update table)
- **Resolution:** only the **dashboard** was real (fixed & shipped `843a1ac` — `min-w-0` on the `Index.tsx` grid columns, `min-w-0`/`flex-wrap`/`break-words` on `PowerTiles.tsx`). Forums, marketplace, and the Geneva dashboard were artifacts of the mid-session font-flip measurement — all re-measure 375/375 from first paint. The Geneva dashboard's region bars and truncating rows stay open under **H1**/**H5**.
- **Where (original):** dashboard (452px), forums (472px), marketplace (427px), geneva dashboard (439px) — all vs a 375px viewport at 24px root font.
- **Problem:** for a large-font user every one of these pages pans sideways; content and actions fall off-screen. This is the single most disruptive behaviour for low-vision use.
- **Suggested fix:** per page, locate the row that refuses to shrink (stat tile rows, filter/tab rows, funnel bars are the likely suspects) and allow wrapping or `min-w-0` shrinking; the Brand Kit's chip rows already wrap correctly on the waitlist form — same treatment.

### C3. Dashboard stat-tile and CRM-snapshot labels are clipped (content lost, no ellipsis)
- **Where:** `src/components/dashboard/StatsGrid.tsx` + `src/components/dashboard/CrmSnapshot.tsx` — "Inspections Active" (+105px hidden), "Properties Listed" (+92), "Messages" (+76), "Rating" (+39), "Clients Needing Attention" (+28), "Active Households" (+55) at large fonts; "Inspections Active" is **already 8px clipped at the default font**.
- **Problem:** `truncate:false` clipping — the text is simply cut off with no ellipsis, so the label becomes unreadable/meaningless.
- **Suggested fix:** remove fixed heights / `overflow-hidden` on tile label containers, let labels wrap to two lines; keep the Cormorant stat number + DM Sans label pairing intact.

### C4. Fixed-pixel text never scales with the user's font size (68 occurrences)
- **Where:** `text-[10px]`/`text-[11px]`/`text-[13px]` etc. across 10 files, concentrated in **GenevaContactDetail (18)**, **GenevaContacts (12)**, **GenevaDashboard (8)**, **ClientDetail (15)**, plus `BottomNav.tsx` (labels `text-[10px]`) and the TopBar "Free Member" badge (10px).
- **Problem:** confirmed live — at 24px root everything else grows but these stay 10–11px: bottom-nav labels, "Free Member", Geneva stat labels, funnel "% advance" figures, saved-view chip counts. A low-vision user's most-used admin pages (Geneva) keep their smallest text permanently tiny. 10px is also below the 12px readable floor even at default.
- **Suggested fix:** replace px-literal text classes with rem-based steps (`text-xs` = 0.75rem scales; `text-[11px]` doesn't). BottomNav labels deserve `text-xs` minimum.

---

## 🟠 High

### H1. Touch targets under 24px (fail even the lenient WCAG 2.5.8 floor)
- **Where (live-measured):**
  - Dashboard "View All" button — 60×16
  - Geneva dashboard "View inactive →" (92×16) and "View all →" (59×16) links
  - Geneva contacts "Command Centre" back-link — 141×20
  - Geneva dashboard region bars ("View contacts in …") — 285×24
  - Pricing "Contact us" link — 83×21; billing-period Switch — 44×24
  - Settings avatar icon button — 16×16; 404 page "Return to Home" — 116×21
- **Problem:** near-impossible to tap accurately; several are primary navigation for the Geneva CRM.
- **Suggested fix:** `min-h-[44px]` with padding (visual size can stay small via inner span), or expand the hit area with `p-3 -m-3`.

### H2. Systemic 36–40px control heights (below the 44px Apple HIG / skill rule)
- **Where:** `src/components/ui/button.tsx` — `default: h-10` (40px), `sm: h-9` (36px), `icon: h-10 w-10` (40×40); saved-view chips 30px tall (Geneva contacts); forum tab buttons 36px; shadcn `Switch` 24px tall.
- **Problem:** every standard button in the app is 4–8px under the 44px minimum; chips and switches are much further under.
- **Suggested fix:** raise `default` to `h-11` (44px) and `icon` to `h-11 w-11` — a one-file change that fixes most of the app; give chips/switch `min-h-[44px]` tap areas (visual pill can stay smaller inside).

### H3. Icon-only buttons without accessible names
- **Where (live: label fell back to tag name "BUTTON"):** directory filter icon button (32×36), settings avatar buttons (16×16, 24×24), pricing billing toggle, a pagination/carousel button on pricing (44×24). Static spot-checks agree: several `size="icon"` buttons lack `aria-label`.
- **Problem:** screen readers announce "button" with no purpose; these are also among the smallest targets.
- **Suggested fix:** add `aria-label` to every icon-only `<Button size="icon">` (grep `size="icon"` — 18 occurrences across 11 files — and audit each).

### H4. Rose Gold `#B76E79` used for small text (explicit Brand Kit contrast rule violation, ~3.2:1)
- **Where (static; these states didn't render in the live probe, which is why live contrast came back clean):**
  - `src/index.css:208` — `.badge-rose` sets `text-xs … text-rose-gold`
  - "Premium" badge variant `bg-rose-gold/20 text-rose-gold` in `ProfileDetailModal.tsx:33`, `PublicProfile.tsx:58`, `ProfileEdit.tsx:57`
  - `Directory.tsx:313` — clear-filters link `text-rose-gold`
  - `components/ui/trust-tip-banner.tsx:52` — "learn more" button `text-rose-gold text-sm`
  - `components/ui/verified-badge.tsx:36` — badge text `text-rose-gold`
  - `Welcome.tsx:204` — `text-xs` chip; `Inspections.tsx:326`
- **Problem:** the Brand Kit marks this non-negotiable: `#B76E79` fails WCAG for small text on light backgrounds; small rose text must be `#8F4E58`.
- **Suggested fix:** swap `text-rose-gold` → `text-rose-gold-dark` (already maps to `#8F4E58`) for all small-text cases; icons may keep `text-rose-gold`.

### H5. Geneva list truncation makes rows unreadable at large fonts
- **Where:** `geneva/contacts` rows and geneva-dashboard "needs attention" list — email/name cells ellipsis-truncate up to **443px of hidden content** at large fonts (a row shows a few characters + "…").
- **Problem:** truncation is by design at desktop, but at narrow width + large font the information density collapses to nothing for exactly the user who needs it most.
- **Suggested fix:** below `sm`, stack the row (name on one line, email wrapping beneath) instead of a single truncating line; keep ellipsis only for genuinely secondary meta.

---

## 🟡 Medium

### M1. Buttons force `whitespace-nowrap` with fixed heights
- **Where:** `src/components/ui/button.tsx` base classes.
- **Problem:** long labels ("View contacts in South East Queensland") cannot wrap; combined with fixed `h-*` this is the mechanism behind several C2 overflows at large fonts.
- **Suggested fix:** allow wrapping (`whitespace-normal h-auto min-h-[44px]`) at least on mobile, or shorten labels.

### M2. Visually-hidden native selects measured at 1×1
- **Where:** `settings/profile` country + currency selects (custom trigger over a 1×1 native `<select>`).
- **Problem:** a 1×1 element is still focusable — keyboard/screen-reader users can land on an invisible control; verify the custom pattern is the shadcn Select (fine) or fix with proper `sr-only` styling.
- **Suggested fix:** confirm keyboard operability; if it's a hand-rolled overlay, use the shadcn `Select` used elsewhere.

### M3. Conversation-list preview truncation
- **Where:** `messages` — last-message preview truncates (+46px default, +70px large font).
- **Problem:** acceptable for previews, but confirm the full message view (not just the list) wraps rather than truncates at large fonts.
- **Suggested fix:** verify `Messaging.tsx` bubble text wraps; leave previews as-is.

### M4. `text-xs` (12px) used for meaningful meta across the app
- **Where:** widespread (stat labels via `.stat-label`, badges, timestamps).
- **Problem:** 12px is the floor, not a target; it does at least scale (rem). Where the meta is load-bearing (consent status, stage names), prefer `text-sm`.
- **Suggested fix:** case-by-case bump of load-bearing meta to `text-sm`; keep `text-xs` for true decoration.

---

## 🟢 Low

### L1. `hsl(var(--sidebar-border))` in `src/components/ui/sidebar.tsx`
Violates the "never `hsl(var(--colour))`" brand rule — but the component is **unused** (no imports found). Suggested fix: delete the dead file (also removes its `size="sm" h-7` sub-44px patterns) or leave with a note.

### L2. `.dashboard-highlight` (`text-rose-gold font-semibold`) in `index.css:255`
Unused class that would violate the small-rose-text rule if ever applied. Suggested fix: delete or switch to `text-rose-gold-dark`.

### L3. 404 page polish
"Return to Home" is a 21px-tall plain link (counted in H1); the page is otherwise plain and off-brand (no ✦ empty-state treatment). Suggested fix: quiet-luxury empty-state styling + 44px button.

### L4. Probe coverage gaps (follow-ups, not defects)
The logged-out landing page (`/landing` turned out to be the 404 route — the real landing renders at `/` when signed out), all dialogs/drawers (stage pickers, frosted modals), the Welcome flow, forms mid-validation, and premium-member badge states weren't exercised. Suggested fix: extend the probe to those states before the mobile/large-font accessibility work is called done — especially the Geneva contact record (`GenevaContactDetail.tsx` has the most fixed-px text in the app).

---

## Suggested attack order

1. ~~**C1 + C2** (horizontal scroll)~~ ✅ **DONE July 8, 2026** — C1 fixed (`fc94457`), C2 dashboard fixed (`843a1ac`), other C2 pages were measurement artifacts (see update at top)
2. **C4** (fixed-px → rem text; mechanical find-and-replace with visual check) ← **NEXT**
3. **C3 + H5** (let labels wrap / stack Geneva rows) — note C3's dashboard stat-tile clipping was addressed as part of the C2 dashboard fix; re-verify labels wrap before closing C3
4. **H2** (button.tsx one-file height bump) then **H1** (per-target hit-area fixes — includes the Geneva region bars)
5. **H4** (rose small-text swaps) + **H3** (aria-labels)
6. Mediums/Lows opportunistically, then re-run the 375px + 24px-root **first-paint** probe to zero.
