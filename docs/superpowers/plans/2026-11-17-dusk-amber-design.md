# Dusk Amber / Twilight Minimal Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Afterglow frontend from an AI-slop / Anthropic clone into a bespoke, atmospheric "Dusk Amber / Twilight Minimal" design system with zero emojis, zero rounded pills, and 100% preservation of all existing contracts and tests.

**Architecture:** Token-driven Svelte 5 application with pure CSS custom properties (`tokens.css`), responsive layout, native stroke SVG icons (`Icon.svelte`), and OS-detected theme resolution. Zero external CSS/component libraries.

**Tech Stack:** Svelte 5 (runes `$state`, `$derived`, `$props`), CSS3 Custom Properties, Node.js 22 LTS, Vitest, Python 3 static contract test.

**Spec:** [docs/superpowers/specs/2026-11-17-dusk-amber-design.md](file:///Users/dariocastellano/Workspaces/Others/afterglow/docs/superpowers/specs/2026-11-17-dusk-amber-design.md)

## Global Constraints

- Zero Unicode emojis anywhere in the codebase (HTML, Svelte, CSS, JS, manifest).
- No rounded pill geometry (`--radius-full: 9999px` banned). Maximum border-radius is 6px.
- Preserved backend and UI test contracts: lifetimes `[24, 72, 168]`, 420 max chars, reactions `glow`, `warm`, `thought`, filter labels `'All'`, `'Ending soon'`, `'Yours'`.
- All 60 Vitest tests and `python3 test_static.py` must pass continuously.

## Review Focus

1. **Light/Dark Contrast Ratio:** Verify WCAG AA (>= 4.5:1) for all text on both Obsidian Dark and Smoke Light surfaces.
2. **Tabular Monospace Alignment:** Countdowns and time metrics must use tabular numbers (`font-variant-numeric: tabular-nums`) so widths do not jitter as seconds tick.
3. **No Flashing Theme on Hydration:** Theme must initialize without white flash when OS is dark.
4. **Zero AI-Slop / Zero Pills:** Visual inspection ensures no `border-radius: 9999px` badges, tilted cards, or manifesto quote boxes exist.
5. **Full Keyboard Accessibility:** Every button and interactive control must have visible `:focus-visible` ring with amber accent (`var(--amber)`).

---

### Task 1: Core Design Tokens & Global CSS

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `index.html:18-28`
- Test: `test_static.py`

**Steps:**
- [ ] Update `src/styles/tokens.css` with Dusk Amber tokens:
  - Dark mode variables (`--bg: #0a0b0e`, `--surface: #12141a`, `--surface-subtle: #181b22`, `--surface-hover: #1f232c`, `--line: rgba(255, 255, 255, 0.08)`, `--ink: #f1f3f7`, `--ink-secondary: #9ca3af`, `--ink-muted: #6b7280`, `--amber: #f59e0b`, `--amber-glow: 0 0 16px rgba(245, 158, 11, 0.22)`).
  - Light mode variables (`--bg: #f5f6f8`, `--surface: #ffffff`, `--surface-subtle: #eceef2`, `--line: rgba(0, 0, 0, 0.08)`, `--ink: #0f1218`, `--amber: #d97706`).
  - Radii: `--radius-xs: 2px`, `--radius-sm: 4px`, `--radius-md: 6px`. Remove `--radius-full`.
  - Typography: Sans (`Inter`, system-ui) and Tabular Mono.
- [ ] Clean up `index.html`: replace `✦` in `<noscript>` with SVG or clean text; verify `Good things<br /><em>can end.</em>` is intact for static contract.
- [ ] Run `python3 test_static.py` and confirm `static contract: PASS`.
- [ ] Commit: `git commit -m "style: replace tokens with dusk amber system and clean index.html"`

---

### Task 2: Topbar & Hero Section Redesign

**Files:**
- Modify: `src/components/Topbar.svelte`
- Modify: `src/components/HeroSection.svelte`
- Test: `tests/ui.test.ts`

**Steps:**
- [ ] Refactor `src/components/Topbar.svelte`:
  - 54px architectural height with hairline bottom border.
  - Brand mark: subtle amber glow dot + clean uppercase tracking wordmark `AFTERGLOW`.
  - Action buttons: squarish 32x32px (`border-radius: 4px`) with stroke SVG icons.
- [ ] Redesign `src/components/HeroSection.svelte`:
  - Completely remove `.manifesto-card` ("The thesis", "No archive", pills).
  - Clean typographic header with sans-serif headline `Moments fade. That is the point.`
  - Subtitle: `A calm, finite social space where thoughts live for a brief time and leave no permanent archive.`
  - Subtle status strip: `Active temporal decay • Zero backlog • SQLite persistent`.
- [ ] Run `npx vitest run tests/ui.test.ts` to ensure rendering passes.
- [ ] Commit: `git commit -m "feat(ui): redesign topbar and replace ai-slop manifesto in hero"`

---

### Task 3: Feed Filters & Composer Redesign

**Files:**
- Modify: `src/components/FeedFilters.svelte`
- Modify: `src/components/Composer.svelte`
- Test: `tests/ui.test.ts`

**Steps:**
- [ ] Refactor `src/components/FeedFilters.svelte`:
  - Replace pill buttons with an architectural segmented tab bar.
  - Retain labels: `'All'`, `'Ending soon'`, `'Yours'`.
  - Active indicator: solid dark/amber surface (`border-radius: 4px`) with crisp border.
- [ ] Refactor `src/components/Composer.svelte`:
  - Hairline border container with subtle focus ring.
  - Tabular monospace counter `x/420`.
  - Segmented lifetime selector (`24h`, `3d`, `7d`) with 4px border-radius buttons.
  - Solid amber Publish button (`border-radius: 4px`).
- [ ] Run `npx vitest run tests/ui.test.ts` and verify all tests pass.
- [ ] Commit: `git commit -m "feat(ui): redesign composer and feed filters without pills"`

---

### Task 4: Post Card & Lifespan Decay Styling

**Files:**
- Modify: `src/components/PostCard.svelte`
- Test: `tests/ui.test.ts`, `tests/posts.test.ts`

**Steps:**
- [ ] Redesign `src/components/PostCard.svelte`:
  - Card surface with `border-radius: 6px` and hairline border (`var(--line)`).
  - Author initials box: 32x32px square with `border-radius: 4px`.
  - Lifespan track: 1px subtle hairline countdown bar at top/bottom of card.
  - Tabular monospace countdown timestamp (`22h left`, `ending soon`).
  - Ending-soon state (`< 1h` remaining): card hairline border glows amber (`var(--amber)`).
  - Reaction buttons: squarish buttons (`glow`, `warm`, `thought`), count display, active amber tint.
  - Reply thread: clean indentation without bubble clutter.
- [ ] Run `npx vitest run tests/ui.test.ts tests/posts.test.ts` and verify all tests pass.
- [ ] Commit: `git commit -m "feat(ui): redesign post card with dusk amber aesthetic and hairline decay"`

---

### Task 5: Modal Redesigns (Passkey Auth & PWA Install)

**Files:**
- Modify: `src/components/PasskeyAuthModal.svelte`
- Modify: `src/components/PwaInstallModal.svelte`
- Test: `tests/auth.test.ts`, `tests/pwa.test.ts`

**Steps:**
- [ ] Restyle `src/components/PasskeyAuthModal.svelte`:
  - Deep backdrop blur, obsidian modal surface with 6px border-radius and hairline border.
  - Clean inputs with tabular typography and amber focus outline.
- [ ] Restyle `src/components/PwaInstallModal.svelte`:
  - Retain full Supercell Store Pattern (carousel of screenshots + OS detection).
  - Clean guide steps with native SVG icons (share, plus, check).
  - Zero emojis in text, labels, or buttons.
- [ ] Run `npx vitest run tests/auth.test.ts tests/pwa.test.ts` and verify.
- [ ] Commit: `git commit -m "feat(ui): restyle passkey and pwa modals to match dusk amber design"`

---

### Task 6: Global Quality Verification & Contract Gate

**Files:**
- Workspace scan across all files

**Steps:**
- [ ] Run zero-emoji scanner script: ensure 0 Unicode emojis across all files.
- [ ] Run full test suite: `npx vitest run` (all 60 tests must pass).
- [ ] Run static contract test: `python3 test_static.py`.
- [ ] Run svelte & node checks: `npm run check` and `node --check scripts/dev.js`.
- [ ] Commit: `git commit -m "chore: final quality verification for dusk amber design system"`
