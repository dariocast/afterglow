# Moleskine Dot-Grid & Printed Editorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Afterglow into a tactile, elegant Moleskine dot-grid journal experience with the lightness of printed editorial matter and the fluidity of a modern 620px social stream (Threads/Bluesky style), using sober product copy and zero emojis.

**Architecture:** Token-driven Svelte 5 application with CSS dot-grid procedural texture, 620px single-column fluid stream, editorial serif typography for moments, and native SVG icons.

**Tech Stack:** Svelte 5 (runes), CSS3 (radial-gradient dot-grid, design tokens), Vitest, Node.js 22 LTS.

**Spec:** [docs/superpowers/specs/2026-11-17-moleskine-dot-grid-design.md](file:///Users/dariocastellano/Workspaces/Others/afterglow/docs/superpowers/specs/2026-11-17-moleskine-dot-grid-design.md)

## Global Constraints

- Zero Unicode emojis anywhere in the codebase.
- No bulky card boxes with heavy borders; fluid stream layout with 620px max-width.
- Sober, functional copy (no cheesy poetry, no "appunti effimeri", no "come sul tuo taccuino").
- All 60 Vitest tests and `test_static.py` must pass continuously.

## Review Focus

1. **Dot-Grid Performance & Visual Subtlety:** Dot grid must be barely visible (opacity ~0.06 - 0.08), not overwhelming the reading experience.
2. **Reading Legibility:** Post content in editorial serif must have optimal contrast and generous line-height (`1.55`).
3. **Stream Fluidity:** Each post must feel like a natural part of a continuous journal page separated only by delicate hairline rules.
4. **Interactive States:** Hover, active, and focus states must feel tactile and responsive without loud colors.

---

### Task 1: Moleskine Dot-Grid Tokens & Editorial Typography

**Files:**
- Modify: `src/styles/tokens.css`
- Test: `test_static.py`

**Steps:**
- [ ] Configure dot-grid paper tokens in `src/styles/tokens.css`:
  - `--shell-max: 620px` (Moleskine journal column width).
  - Light mode: `--bg: #fbf9f5` (warm ivory), `--dot-color: rgba(0, 0, 0, 0.075)`, `--ink: #1c1d1f`, `--ink-secondary: #5a5c61`, `--line: rgba(0, 0, 0, 0.08)`.
  - Dark mode: `--bg: #141517` (graphite charcoal), `--dot-color: rgba(255, 255, 255, 0.06)`, `--ink: #f0ede6`, `--ink-secondary: #8e9096`, `--line: rgba(255, 255, 255, 0.08)`.
  - Body background: apply procedural dot-grid via `radial-gradient(var(--dot-color) 1px, transparent 1px)` with `background-size: 20px 20px`.
  - Typography: import and configure `Newsreader` / `Lora` for `--serif` / `--font-content`.
- [ ] Run `python3 test_static.py` to confirm static contract.
- [ ] Commit: `git commit -m "style: implement moleskine dot grid and editorial tokens"`

---

### Task 2: Streamlined Header & Topbar

**Files:**
- Modify: `src/components/Topbar.svelte`
- Modify: `src/components/HeroSection.svelte`
- Test: `tests/ui.test.ts`

**Steps:**
- [ ] Refactor `src/components/Topbar.svelte`:
  - Sleek 50px topbar with dot-grid matching backdrop blur.
  - Clean wordmark `afterglow`.
  - Minimalist controls for theme switcher and Passkey auth.
- [ ] Simplify `src/components/HeroSection.svelte`:
  - Remove all status strips and developer metrics.
  - Quiet, clean header: `Moments fade.<br />That is the point.`
  - Direct, sober subtitle: `A finite space where conversations end naturally.`
- [ ] Run `npx vitest run tests/ui.test.ts` and verify.
- [ ] Commit: `git commit -m "feat(ui): streamline topbar and remove debug status from hero"`

---

### Task 3: Seamless Stream Composer

**Files:**
- Modify: `src/components/Composer.svelte`
- Test: `tests/ui.test.ts`

**Steps:**
- [ ] Refactor `src/components/Composer.svelte`:
  - Seamless writing area without heavy card borders; subtle top/bottom hairline divider.
  - Clean placeholder: `What's on your mind?`
  - Inline lifespan selector (`24h · 3d · 7d`) with quiet tactile buttons.
  - Tabular monospace counter `x/420`.
  - Direct "Publish" / "Post" button.
- [ ] Run `npx vitest run tests/ui.test.ts` and verify.
- [ ] Commit: `git commit -m "feat(ui): redesign composer into seamless stream input"`

---

### Task 4: Fluid Post Stream Item

**Files:**
- Modify: `src/components/PostCard.svelte`
- Test: `tests/ui.test.ts`, `tests/posts.test.ts`

**Steps:**
- [ ] Redesign `src/components/PostCard.svelte`:
  - Remove outer card box, background fill, and heavy box-shadow.
  - Render as an open stream entry with `border-bottom: 1px solid var(--line)` and generous vertical padding (24px).
  - Header: Author name (weight 600), handle (`@user`), discreet expiry label (`22h left`) in top right.
  - Lifespan decay: delicate 1px progress hairline across the post header.
  - Content: printed editorial serif (`Newsreader` / `Lora`), 16px, `line-height: 1.55`.
  - Actions row: subtle counters with clean stroke SVG icons for `glow`, `warm`, `thought`.
- [ ] Run `npx vitest run tests/ui.test.ts tests/posts.test.ts` and verify.
- [ ] Commit: `git commit -m "feat(ui): transform post card into fluid editorial stream item"`

---

### Task 5: Feed Navigation & Stream Alignment

**Files:**
- Modify: `src/components/FeedFilters.svelte`
- Modify: `src/App.svelte`
- Test: `tests/ui.test.ts`

**Steps:**
- [ ] Refactor `src/components/FeedFilters.svelte`:
  - Clean inline filter row: `All · Ending soon · Yours`.
  - Active state: subtle ink underline or quiet highlight.
- [ ] Polish `src/App.svelte`:
  - Ensure main container is perfectly centered at `max-width: 620px`.
  - Streamlined empty state and loading feedback.
- [ ] Run `npx vitest run tests/ui.test.ts` and verify.
- [ ] Commit: `git commit -m "feat(ui): polish stream layout and navigation"`

---

### Task 6: Global Quality & Contract Verification

**Files:**
- Workspace scan across all files

**Steps:**
- [ ] Run zero-emoji scanner script: ensure 0 Unicode emojis across all files.
- [ ] Run full test suite: `npx vitest run` (all 60 tests must pass).
- [ ] Run static contract test: `python3 test_static.py`.
- [ ] Run TypeScript checks: `npm run check`.
- [ ] Build production assets: `npm run build`.
- [ ] Commit: `git commit -m "chore: final quality verification for moleskine dot grid design"`
