# Design Specification: Moleskine Dot-Grid & Printed Editorial

**Date:** 2026-11-17  
**Status:** Approved  
**Project:** Afterglow  
**Scope:** Visual Identity, Dot-Grid Paper Surface, Typography, and Stream Architecture  

---

## 1. Intent and Core Concept

Afterglow is a finite social network where moments expire naturally. 

The visual identity embodies the tactile, disciplined quality of a **Moleskine notebook on dot-grid paper (carta puntinata)** with the legibility and poise of **printed editorial matter (carta stampata)**.

Crucially, **no cheesy roleplaying copy or AI filler** ("appunti effimeri", "come sul tuo taccuino"). The copy remains sober, modern, and direct like Threads or Bluesky: clean labels, natural placeholders, and real social interactions.

---

## 2. Key Visual Foundations

### 2.1 The Dot-Grid Paper Surface
- **Light Mode (Warm Ivory Paper):**
  - Base: `#fbf9f5` (warm ivory paper).
  - Dot-grid pattern: subtle 1px dots spaced every 20px via CSS `radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px)` with `background-size: 20px 20px`.
  - Divider rules: delicate graphite hairlines (`rgba(0, 0, 0, 0.07)`).
  - Text: high-contrast book ink (`#19191a`).
- **Dark Mode (Moleskine Black Notebook):**
  - Base: `#141517` (rich charcoal leather / graphite paper).
  - Dot-grid pattern: subtle dots `radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)`.
  - Divider rules: faint graphite lines (`rgba(255, 255, 255, 0.08)`).
  - Text: soft off-white ink (`#f0ede6`).

### 2.2 Layout: Modern Stream (No Clunky Box Cards)
- Width: single centered stream column (`max-width: 620px`), exactly like Threads or Bluesky.
- Eliminates heavy borders, stacked boxes, and shadow cages.
- Posts flow in an uninterrupted timeline separated by hairline rules.
- Avatars align cleanly on the left (or compact inline header), with text flowing naturally.

### 2.3 Typography: Printed Editorial Craft
- Body / Content: High-craft editorial typography (`Lora` / `Newsreader` or elegant editorial serif) with crisp line-height (`1.55`) for the post text.
- UI Labels & Metadata: Clean, legible sans-serif (`Inter`, system-ui) for usernames, timestamps, and buttons.
- Expiry indicator: Discreet, elegant timestamp in the header row (`22h left`, `ending soon`).

### 2.4 Sober, Real Product Copy
- No manifesto hero, no "The thesis" card, no "appunti su carta".
- Simple, confident topbar: `afterglow` wordmark with theme switcher and Passkey auth.
- Composer placeholder: `What's on your mind?`
- Feed filters: `All`, `Ending soon`, `Yours`.
- Clean reaction buttons (`glow`, `warm`, `thought`), replies, and share.
- Zero emojis: 100% SVG stroke icons.

---

## 3. Preserved Contracts & Compatibility
- 100% preservation of all 60 Vitest tests and `test_static.py`.
- Lifetimes `[24, 72, 168]` hours (`24h`, `3d`, `7d`).
- Character limit 420 chars.
- WebAuthn Passkeys and PWA installation (Supercell Store Pattern) preserved intact.
