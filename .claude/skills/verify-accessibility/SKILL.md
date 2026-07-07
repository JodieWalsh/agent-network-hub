---
name: verify-accessibility
description: "Verify a page of Buyers Agent Hub at large accessibility font sizes with the HARDENED puppeteer probe — proven 24px root font from first paint, container-level spill checks, one screenshot copied to Downloads for eye review. Actions: verify, measure, check, probe, screenshot a page at large fonts; fix horizontal scroll, overflow, spill, clipping, text scaling. Context: low-vision / iOS large fonts, 375px viewport, 24px root, min-w-0 flexbox min-width trap, quiet-luxury design. Use BEFORE claiming any accessibility fix works and AFTER applying one. Triggers: large font, accessibility check, overflow check, scrollWidth, 375px, spills outside card, does it fit on mobile."
---

# Verify Accessibility — the hardened large-font check

How to verify (and fix) a page at large accessibility font sizes without fooling
yourself. Every rule below was paid for the hard way in July 2026: a silently
broken probe produced BOTH false "all clear" readings and false "fixed"
confidence, and the wrong conclusions were committed to docs before being caught.

**The standard:** 375×812 viewport (iPhone), root font forced to **24px from
first paint**, page `scrollWidth` must equal 375, no content may spill outside
its own card, and the result is confirmed **by eye** from a screenshot — never
by numbers alone.

---

## The five hard rules

### 1. PROVE the root font size — or the measurement is invalid

Log `getComputedStyle(document.documentElement).fontSize` on every page you
measure and confirm it reads `24px`. A probe whose injection silently fails
measures the DEFAULT font while claiming 24px — it once returned a clean
"375/375 artifact" verdict for three pages that were genuinely broken (472px,
427px, 515px). **No proven rootFont, no verdict.**

### 2. Apply the large font FROM FIRST PAINT — never mid-session

A real user's font setting exists before any page loads. Inject before
navigation with the hardened pattern (plain `documentElement.appendChild` has a
race — `documentElement` can be null at document start, which is exactly how
the silent failures happened):

```js
await page.evaluateOnNewDocument(() => {
  const add = () => {
    try {
      const style = document.createElement('style');
      style.textContent = 'html { font-size: 24px !important; }';
      (document.head || document.documentElement).appendChild(style);
    } catch {}
  };
  if (document.documentElement) add();
  document.addEventListener('DOMContentLoaded', add);
});
```

**Never** flip the font mid-session (`document.documentElement.style.fontSize =
'24px'` after load): Chrome's emulated mobile layout viewport **latches to the
widest transient state** and never shrinks back, giving inflated false-overflow
numbers (and a phantom ~1px that survives every "fix").

### 3. Check CONTAINER-level containment, not just page width

A clean `scrollWidth === 375` does **NOT** prove the page is right. Content can
spill outside an inner card while staying inside the page's padding zone — the
Demand-by-Region card did exactly this (bars and counts poking past the card's
right edge) while the page probe read a perfect 375. For the section under
test, compare every descendant's right edge to its own container:

```js
const pr = panel.getBoundingClientRect();
for (const el of panel.querySelectorAll('*')) {
  const over = Math.round(el.getBoundingClientRect().right - pr.right);
  if (over > 1) spills.push({ el, over });
}
```

Report **"NO CONTENT SPILLS OUTSIDE THE CARD ✓"** or list the offenders.
(Elements inside a `truncate` parent report wide rects but are clipped — a
clean scrollWidth confirms they don't count.)

### 4. Trust the eye, not just numbers

Numbers can be wrong in ways that look exactly like success. Take **exactly
ONE screenshot** per verification at 375px + proven 24px root, copy it to
Jodie's Downloads with a clear name, and tell her the filename:

```powershell
Copy-Item "<scratchpad>\<page>-largefont.png" -Destination "$env:USERPROFILE\Downloads\<page>-check.png"
```

She reviews it with her own eyes before anything is committed. Her visual
review has caught real defects the probes missed (the region-card spill, the
shredded one-letter-per-line tile text that a passing scrollWidth hid).

### 5. One probe run, no loops

One measurement run before the fix, one after — each run may visit several
pages, but never re-run in a loop or spawn repeated screenshot/dev-server
cycles. Shut the dev server down afterwards with `npx kill-port <port>` — the
background task then reports "failed / exit 1", which is the **expected**
deliberate shutdown, not an error. Temp probe scripts are named `check-*.mjs`
(already gitignored) and deleted when done.

---

## Fixing what the probe finds

The cause is almost always the **flexbox/grid `min-width: auto` trap**: a flex
or grid item refuses to shrink below its content, so rem-based padding, fixed
`w-28`-style columns, or `whitespace-nowrap` labels blow past the viewport when
the root font grows.

- **Prefer** `min-w-0`, `flex-wrap`, `max-w-full` — never new hard-coded widths.
- **The default-font look must not change.** Wrapping must only engage when
  large fonts make the row too tight (a rem-based `flex-basis` on a grouped
  unit is the trick for "beside at normal size, stacked below at large size").
- **Preserve the quiet-luxury design exactly** — colours, Cormorant/DM Sans
  pairing, champagne chips, spacing (see `docs/BRAND_KIT.md`).
- **Fix ONLY the page asked for** — one page at a time.
- **Never commit during verification** — Jodie reviews the Downloads screenshot
  first and gives the commit instruction herself.

## Verification checklist (per page)

- [ ] Dev server up; hardened injection registered BEFORE `page.goto`
- [ ] `rootFont=24px` logged and confirmed for the measured page
- [ ] `scrollWidth === clientWidth === 375` (page level)
- [ ] Container-level check on the section under test: no spills
- [ ] ONE screenshot → `Downloads\<page>-check.png`, filename reported
- [ ] Probe script deleted, dev server killed (expected "failed" notice)
- [ ] Nothing committed; findings reported with before/after numbers
