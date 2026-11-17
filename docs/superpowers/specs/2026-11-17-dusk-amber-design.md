# Design Specification: Dusk Amber / Twilight Minimal System

**Date:** 2026-11-17  
**Status:** Approved  
**Project:** Afterglow  
**Scope:** Frontend Design System, UI Tokens, and Component Redesign  

---

## 1. Intent and The Why

Afterglow is a finite, calm social network designed around moments that naturally expire (24-hour lifespan) rather than accumulating in permanent archives. 

The previous interface suffered from two severe flaws:
1. **AI-Slop & Anthropic Clone:** It mimicked Claude/Anthropic's landing page (warm beige/linen `#f8f6f0`, terracotta accents, serif typography, tilted manifesto card labeled "The thesis").
2. **Visual Clutter & Clichés:** Overuse of rounded pills (`border-radius: 9999px`), generic manifesto cards, and emojis.

This redesign establishes a distinctive, atmospheric visual identity: **"Dusk Amber / Twilight Minimal"**. The interface feels like a quiet, dimly lit room or the twilight horizon where moments glow briefly before dissolving into darkness.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Atmospheric & Intimate Identity:** Deep obsidian/smoke backgrounds with subtle hairline borders and warm amber embers (`#f59e0b` / `#d97706`).
- **Architectural & Typographic Discipline:** Clean sans-serif hierarchy (Inter / system-ui) paired with technical tabular monospaced metadata for countdowns and time metrics.
- **Natural Temporal Decay:** Express time and expiry through quiet visual feedback (subtle post opacity fade as expiry approaches, hairline countdown tracks) rather than noisy game-like badges.
- **Zero Emojis:** 100% SVG stroke-based icons (1.75px stroke width) via `Icon.svelte`.
- **Anti-AI-Slop:** Remove all rounded pills (`radius: 9999px`), tilted cards, and fake manifesto copy. Use structured, restrained geometry (`border-radius: 4px` to `6px`).
- **Full Functional Integrity:** Preserve 100% of existing backend routes, WebAuthn Passkey auth, SQLite persistence, PWA installation flows, and all 60 Vitest tests.

### Non-Goals
- Changing the backend data model, SQLite schema, or Hono routes.
- Changing authentication mechanics (WebAuthn Passkeys remain standard).
- Introducing third-party CSS frameworks (Tailwind, Radix, etc.) — Afterglow stays dependency-free vanilla CSS/Svelte.

### Anti-Goals
- **No Marketing Fluff:** No "The thesis" cards, no motivational quotes about social media detox.
- **No Bright SaaS Palettes:** No primary blues, neon purples, or glossy glassmorphism.
- **No Infinite Feed Paradigms:** Never add infinite scrolling, follower counts, or algorithmic engagement traps.

---

## 3. Constraints
- **Zero Unicode Emojis:** Strictly prohibited in HTML, Svelte templates, CSS, JS, and documentation.
- **Dependency-Free Architecture:** Single CSS tokens file (`tokens.css`), pure Svelte 5 components with runes (`$state`, `$derived`, `$props`).
- **PWA Experience:** Retain full Supercell Store Pattern (Chromium Richer Install UI + interactive educational modal + OS detection).
- **Test Integrity:** All 60 Vitest tests must pass without regressions.

---

## 4. Approaches Considered

1. **Direction 1: Dusk Amber / Twilight Minimal (Selected)**
   - *Characteristics:* Deep obsidian dark mode (`#0c0d10`), crisp twilight light mode (`#f4f4f6`), warm amber glowing embers (`#f59e0b`), hairline borders (`1px solid rgba(255,255,255,0.08)`), micro-monospace expiry timestamps.
   - *Trade-off:* High visual personality and atmospheric calm, highly aligned with the metaphor of *Afterglow*.
   - *Decision:* Chosen by user.

2. **Direction 2: Spatial Swiss Bulletin**
   - *Characteristics:* Pure monochrome, architectural grids, zero border radius, stark black/white contrast.
   - *Trade-off:* Clean and professional, but feels colder and more utilitarian.

3. **Direction 3: Raw Monospace Teletype**
   - *Characteristics:* Text-only single-column terminal, no cards, pure monospace.
   - *Trade-off:* Too niche and stark for a consumer social experience.

---

## 5. Design System Specifications

### 5.1 Color Tokens & Theme Resolution

**Theme Resolution:**
- On first visit without saved preference, automatically detect OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`.
- If user manually toggles theme via Topbar button, persist in `localStorage` (`afterglow_theme` = `'dark'` | `'light'`).
- Both Dark Mode and Light Mode are first-class, designed with equivalent architectural precision.

#### Dark Mode (Deep Obsidian / Twilight Ember)
- `--bg`: `#0a0b0e` (Deep Obsidian Void)
- `--surface`: `#12141a` (Elevated Charcoal Surface)
- `--surface-subtle`: `#181b22` (Secondary Surface / Input background)
- `--surface-hover`: `#1f232c` (Interactive Hover Surface)
- `--line`: `rgba(255, 255, 255, 0.08)` (Hairline Divider)
- `--line-focus`: `rgba(255, 255, 255, 0.18)` (Active / Focus Divider)
- `--ink`: `#f1f3f7` (Primary Text, high legibility)
- `--ink-secondary`: `#9ca3af` (Secondary Text / Metadata)
- `--ink-muted`: `#6b7280` (Muted Labels / Timestamps)
- `--amber`: `#f59e0b` (Ember Glow / Active state)
- `--amber-subtle`: `rgba(245, 158, 11, 0.12)` (Warm Amber Tint)
- `--amber-glow`: `0 0 16px rgba(245, 158, 11, 0.22)`
- `--danger`: `#ef4444`
- `--danger-subtle`: `rgba(239, 68, 68, 0.12)`

#### Light Mode (Crisp Dusk Horizon)
- `--bg`: `#f5f6f8` (Crisp Pale Smoke)
- `--surface`: `#ffffff` (Pure White Card)
- `--surface-subtle`: `#eceef2` (Subtle Muted Surface)
- `--surface-hover`: `#e4e6ec` (Hover Surface)
- `--line`: `rgba(0, 0, 0, 0.08)` (Hairline Divider)
- `--line-focus`: `rgba(0, 0, 0, 0.22)`
- `--ink`: `#0f1218` (Deep Charcoal Ink)
- `--ink-secondary`: `#4b5563`
- `--ink-muted`: `#808a9d`
- `--amber`: `#d97706` (Deep Amber Accent)
- `--amber-subtle`: `rgba(217, 119, 6, 0.10)`
- `--amber-glow`: `0 0 14px rgba(217, 119, 6, 0.16)`

### 5.2 Geometry & Typography
- **Border Radius:**
  - `--radius-xs`: `2px` (Tags, micro indicators)
  - `--radius-sm`: `4px` (Buttons, inputs, reaction triggers)
  - `--radius-md`: `6px` (Cards, dialogs, composer)
  - *No `--radius-full` (pills are banned).*
- **Typography:**
  - Sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` (Clean, neutral, objective).
  - Tabular Mono: `ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace` (For live countdowns, post IDs, technical metrics).
  - Headings: Sans-serif, tight letter-spacing (`-0.03em`), bold weights (600/700) instead of literary serif italics.

---

## 6. Component Redesign Architecture

### 6.1 Topbar (`Topbar.svelte`)
- Compact, architectural navigation bar (height 54px).
- Left: Brand mark with subtle amber dot and clean wordmark `AFTERGLOW`.
- Right: Minimalist action group:
  - Theme toggle (Sun / Moon SVG icon, 32x32px squarish button).
  - Passkey Auth Trigger: Clean button with Key/User icon and state label (`Sign in with Passkey` / `@username`).
  - PWA Install trigger (when installable).

### 6.2 Hero Section (`HeroSection.svelte`)
- **Replace the AI-slop manifesto card.**
- Layout: Compact, confident two-column or integrated header:
  - Headline: `Moments fade. That is the point.` (Sans-serif, precise, no italic serif).
  - Subtitle: A simple, sober statement: `A calm, finite social space where thoughts live for 24 hours and leave no permanent archive.`
  - Status Indicator: A live network pulse strip: `[LIVE] 24-hour decay active • Zero tracking • SQLite persistent`.

### 6.3 Composer (`Composer.svelte`)
- Contained, focused text area with subtle hairline border.
- Character counter with mono font (`x/420`).
- Lifespan selector (`24h` / `3d` / `7d`) styled with geometric segmented buttons (`border-radius: 4px`), eliminating rounded pill buttons.
- Primary "Publish" button: Solid amber button (`border-radius: 4px`), hover state with subtle glow.

### 6.4 Feed Filters (`FeedFilters.svelte`)
- Replaces pill buttons with an architectural segmented bar or underlined tab row:
  - `[ All ]` `[ Ending soon ]` `[ Yours ]`
  - Retains existing filter labels for full test and contract compatibility.
  - Active state: Crisp underline or solid dark/amber indicator with 4px border-radius.

### 6.5 Post Card (`PostCard.svelte`)
- Distinct card with 1px hairline border (`var(--line)`).
- Top: Author username and initials badge (squarish with `border-radius: 4px`).
- Expiry indicator: Tabular countdown (`22h left`, `ending soon`) with a 1px hairline decay bar across the card.
- Approaching Expiry State: When `< 1h`, card subtly shifts with an amber border tint, signaling the final afterglow.
- Actions:
  - Reaction triggers retain canonical keys (`glow`, `warm`, `thought`) styled as technical micro-buttons with counts and clean stroke SVG icons.
  - Inline reply thread: Clean, indented lines without bubble chatter aesthetics.

### 6.6 Modals (`PasskeyAuthModal.svelte`, `PwaInstallModal.svelte`)
- Clean architectural modal overlay (`backdrop-filter: blur(8px)` with dark overlay).
- Dialog surface with `border-radius: 6px` and sharp hairline border.
- Clear step-by-step PWA guide with native SVG icons (Share sheet, Home screen, Check).
- Zero emojis.

---

## 7. Verification & Definition of Done
1. **Visual QA:** No elements with pill radius, no serif italic manifesto cards, zero Unicode emojis.
2. **Automated Tests:** `npm test` runs all 60 tests and passes 100%.
3. **Static Contracts:** `python3 test_static.py` passes.
4. **Svelte Check:** `npx svelte-check` passes without errors.
5. **Node.js Check:** `node --check` across server scripts passes.
