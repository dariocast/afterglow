# Afterglow

Afterglow is a finite social network: small, meaningful conversations are visible while they matter, then naturally disappear.

## Product thesis

Most social feeds optimize for accumulation: more followers, more content, more notifications, more backlog. Afterglow competes by optimizing for **closure**. Every post has a visible lifetime (24 hours, 3 days, or 7 days), the feed stays small, and sharing a moment is intentionally lighter than publishing an identity.

## Positioning

> **Afterglow is the social network for moments you want to share, not content you want to store.**

### Differentiation from Seven

- Seven's clearest promise is a uniform seven-day lifespan and a minimalist public feed.
- Afterglow keeps the finite-life insight but introduces a more useful product wedge:
  - creator-chosen lifetimes (24h, 3 days, 7 days);
  - a calm "living room" feed rather than a generic public stream;
  - explicit ending-soon discovery instead of urgency driven by notifications;
  - a stronger boundary between moments, saved social posts, and permanent profiles;
  - lightweight, private-by-default interactions rather than follower vanity metrics.

### Competitive frame

| Product | Core promise | Weakness / opening |
|---|---|---|
| Instagram / TikTok | Infinite discovery and identity | Endless backlog, performance pressure |
| Snapchat | Ephemeral private messaging | Primarily closed 1:1/group messaging |
| BeReal | One daily authentic moment | Rigid cadence, little conversation depth |
| Seven | Everything lasts seven days | Uniform lifetime; public-feed framing |
| Afterglow | Finite, intentional conversations | Must earn habit without addictive mechanics |

---

## Full-Stack Architecture

Afterglow is built as a cohesive, lightweight full-stack application:

- **Frontend**: Svelte 5 with fine-grained reactivity (runes: `$state`, `$derived`, `$effect`), Vite bundler, accessible semantic HTML, and responsive CSS tokens.
- **Backend**: Hono web framework running on Node.js 22+, providing high performance, type-safe API routing, and cookie session security.
- **Authentication**: Modern passwordless authentication via **Passkeys (WebAuthn / FIDO2)** powered by `@simplewebauthn` (client and server) with signed HTTP-only session cookies.
- **Database & ORM**: **Drizzle ORM** with **SQLite** (`better-sqlite3` locally and in testing, with seamless portability to PostgreSQL via Drizzle schema mapping).
- **Background Expiry Reaper**: Automated periodic cleanup service that purges expired moments, orphaned reactions, and replies to guarantee closure without lingering archives.
- **Unified Production Serving**: Unified Node.js server that simultaneously serves API endpoints and compiled static SPA assets with client-side SPA routing fallback.

---

## Progressive Web App (PWA) Experience

Following the **Supercell Store pattern**, Afterglow delivers a two-tier installation experience:

1. **Chromium Richer Install UI (Native System Dialog)**:
   - Configured Web App Manifest (`manifest.json`) with multi-device screenshots (narrow mobile and wide desktop).
   - High-resolution icons (192x192, 512x512) for both `any` and `maskable` display modes.
   - Configured `display_override: ["window-controls-overlay", "standalone", "minimal-ui"]`.
2. **In-App Educational Modal & OS Adaptation**:
   - Interactive installation guide adapting dynamically to the client OS (Android/Desktop one-tap `beforeinstallprompt` vs. iOS Safari step-by-step Share Sheet guide).
   - Non-intrusive banner with dismissed state remembered in local preferences.
   - 100% offline-ready application shell via Service Worker cache.

---

## Commands & Development Workflow

Ensure Node.js 22+ is active (e.g., via `nvm use` with the repository `.nvmrc`).

```bash
# Install dependencies
npm install

# Run database seed (populates initial active demo moments with staggered expiries)
npm run db:seed

# Start development server (Vite frontend with API proxy)
npm run dev

# Build production assets (Vite frontend -> dist/)
npm run build

# Start unified production server (serves API and dist/ static assets on port 3000)
npm start

# Run the complete test suite (Vitest)
npm test

# Run TypeScript type check
npm run check
```

---

## Database Seeding

To quickly test and verify feed behaviors, including the "Ending Soon" (<= 48h) filter and active discussions, run:

```bash
npm run db:seed
```

This seeds:
- 4 authentic demo users: Maya Chen (`@maya_writes`), Alex Rivera (`@alexr`), Jo Park (`@jopark`), and Dario Castellano (`@dario`).
- Moments with staggered finite lifespans (24h, 72h, 168h), some expiring within 12–36 hours and others active for several days.
- Interactive reactions (`glow`, `warm`, `thought`) and threaded conversation replies.

---

## Static Contract Verification

To ensure backwards compatibility with repository static contract baselines:

```bash
python3 test_static.py
```
