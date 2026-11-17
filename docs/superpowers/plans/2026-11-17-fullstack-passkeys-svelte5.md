# Afterglow Full-Stack Passkeys & Svelte 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Graduate Afterglow into a full-stack reactive application powered by Node.js, Hono, Drizzle ORM (SQLite/Postgres portable), WebAuthn Passkeys, Svelte 5, and the Supercell Store Pattern PWA standard.

**Architecture:** Monolithic single-origin service where Hono handles API routes (`/api/*`), WebAuthn challenges, and periodic post-expiry pruning while serving Vite-built Svelte 5 static assets. Drizzle ORM provides a decoupled database layer over SQLite that seamlessly adapts to PostgreSQL in the future.

**Tech Stack:** TypeScript, Node.js 22+, Hono, Drizzle ORM, `better-sqlite3`, `@simplewebauthn/server`, `@simplewebauthn/browser`, Svelte 5, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-fullstack-passkeys-design.md`

## Global Constraints

- **Dependency Boundaries**: Node.js 22+ standard ESM, TypeScript throughout, Hono for HTTP API, Drizzle ORM for database abstraction.
- **Database Portability**: Use portable Drizzle ORM column types; no SQLite-specific SQL dialects so driver swap to PostgreSQL requires zero query rewrites.
- **Privacy & Authentication**: Passwordless WebAuthn Passkeys only; no password fields, no third-party tracking cookies.
- **Finite Lifespan Enforcement**: Query-level active filtering (`expires_at > unixepoch()`) AND active background in-process reaper running every 15 minutes.
- **PWA Experience**: Complete two-tier install experience meeting the Supercell Store Pattern: Chromium Richer Install UI (wide + narrow screenshots) and in-app modal with carousel and OS-specific instructions.

## Review Focus

- **Authenticator unsupported/cancelled**: User attempts Passkey registration or login on an unsupported device or cancels prompt; UI must display clear fallback guidance without hanging.
- **Post expired during user session**: A post reaches its expiry time while currently visible in the active feed; the frontend countdown must hit 0 and gracefully fade out without requiring a page reload.
- **Session cookie expiration/tampering**: User submits a post or reaction with an invalid or expired cookie; server returns 401 and UI prompts re-authentication cleanly.
- **Unique reaction constraint race**: User rapidly double-clicks a reaction button; unique index `user_post_reaction_idx` handles conflict idempotently.
- **iOS Safari PWA detection**: Detection of standalone mode vs Safari browser accurately activates the visual "Add to Home Screen" instructions without showing the Android prompt button.

---

### Task 1: Project Scaffolding & Tooling Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `server/index.ts`
- Test: `tests/health.test.ts`

**Interfaces:**
- Produces: Base Hono server application, TypeScript compilation, Vitest test suite, and Vite dev setup.

- [ ] **Step 1: Write the failing health test**
```typescript
// tests/health.test.ts
import { describe, it, expect } from 'vitest';
import { app } from '../server/app';

describe('GET /api/health', () => {
  it('returns status ok with timestamp', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/health.test.ts`
Expected: FAIL with module not found or missing server/app.

- [ ] **Step 3: Implement dependencies, configs, and minimal Hono app**
Initialize `package.json` with Hono, `@hono/node-server`, Drizzle, Svelte 5, Vite, Vitest, and `@simplewebauthn/server`.
Implement `server/app.ts` exposing `GET /api/health` returning `{ status: 'ok', timestamp: Date.now() }`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/health.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts server/app.ts server/index.ts tests/health.test.ts
git commit -m "chore: setup project scaffolding with TypeScript, Hono, and Vitest"
```

---

### Task 2: Database Schema & Drizzle ORM Setup

**Files:**
- Create: `server/db/schema.ts`
- Create: `server/db/index.ts`
- Create: `drizzle.config.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Produces: `db`, `users`, `credentials`, `posts`, `reactions`, `replies` from `server/db/index.ts`.
- Consumes: `better-sqlite3` and `drizzle-orm/better-sqlite3`.

- [ ] **Step 1: Write the failing database schema and CRUD test**
```typescript
// tests/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db, users, posts } from '../server/db';
import { eq } from 'drizzle-orm';

describe('Database Schema & Operations', () => {
  it('creates a user and a post with expiry', async () => {
    const userId = 'u-test-1';
    await db.insert(users).values({
      id: userId,
      username: 'dario',
      displayName: 'Dario',
      createdAt: new Date(),
    });

    const postId = 'p-test-1';
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await db.insert(posts).values({
      id: postId,
      authorId: userId,
      content: 'A quiet morning thought.',
      lifetimeHours: 24,
      createdAt: new Date(),
      expiresAt,
    });

    const result = await db.select().from(posts).where(eq(posts.id, postId));
    expect(result.length).toBe(1);
    expect(result[0].content).toBe('A quiet morning thought.');
    expect(result[0].lifetimeHours).toBe(24);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/db.test.ts`
Expected: FAIL (missing `server/db/index.ts` and `schema.ts`).

- [ ] **Step 3: Implement `server/db/schema.ts` and `server/db/index.ts`**
Define `users`, `credentials`, `posts`, `reactions` (with `user_post_reaction_idx` unique index), and `replies` using Drizzle ORM.
Initialize SQLite connection using `better-sqlite3` with foreign keys enabled (`PRAGMA foreign_keys = ON;`).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/db.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/db/ tests/db.test.ts drizzle.config.ts
git commit -m "feat: implement Drizzle ORM schema for users, credentials, posts, reactions, replies"
```

---

### Task 3: Backend Authentication & WebAuthn Passkeys Service

**Files:**
- Create: `server/auth/passkeys.ts`
- Create: `server/auth/session.ts`
- Create: `server/routes/auth.ts`
- Modify: `server/app.ts`
- Test: `tests/auth.test.ts`

**Interfaces:**
- Produces: Endpoints `POST /api/auth/register-options`, `POST /api/auth/register-verify`, `POST /api/auth/login-options`, `POST /api/auth/login-verify`, `GET /api/auth/me`, `POST /api/auth/logout`.
- Session middleware providing `c.get('user')`.

- [ ] **Step 1: Write the failing authentication options and session test**
```typescript
// tests/auth.test.ts
import { describe, it, expect } from 'vitest';
import { app } from '../server/app';

describe('Auth API', () => {
  it('generates registration options for a new username', async () => {
    const res = await app.request('/api/auth/register-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'aurora', displayName: 'Aurora' }),
    });
    expect(res.status).toBe(200);
    const options = await res.json();
    expect(options.challenge).toBeDefined();
    expect(options.rp.name).toBe('Afterglow');
  });

  it('rejects registration options when username is missing', async () => {
    const res = await app.request('/api/auth/register-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/auth.test.ts`
Expected: FAIL (routes not defined, 404).

- [ ] **Step 3: Implement WebAuthn services and routes**
Implement `@simplewebauthn/server` helpers in `server/auth/passkeys.ts` (challenge generation, verification).
Implement signed cookie session storage in `server/auth/session.ts`.
Mount `/api/auth` router in `server/app.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/auth/ server/routes/auth.ts server/app.ts tests/auth.test.ts
git commit -m "feat: implement WebAuthn Passkey registration and login flows with cookie sessions"
```

---

### Task 4: Finite Social Feed API & Expiry Pruning Service

**Files:**
- Create: `server/routes/posts.ts`
- Create: `server/services/reaper.ts`
- Modify: `server/app.ts`
- Test: `tests/posts.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/posts?filter=all|ending|mine`
  - `POST /api/posts` (body: `{ content, lifetimeHours }`)
  - `DELETE /api/posts/:id`
  - `POST /api/posts/:id/reactions` (body: `{ kind: 'glow'|'warm'|'thought' }`)
  - `POST /api/posts/:id/replies` (body: `{ content }`)
  - `purgeExpiredPosts()` reaper function.

- [ ] **Step 1: Write the failing post lifecycle and expiry test**
```typescript
// tests/posts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../server/app';
import { db, users, posts } from '../server/db';
import { purgeExpiredPosts } from '../server/services/reaper';

describe('Posts API & Expiry Reaper', () => {
  it('excludes expired posts from the feed and reaper deletes them', async () => {
    const userId = 'u-poster-1';
    await db.insert(users).values({ id: userId, username: 'tester', displayName: 'Tester', createdAt: new Date() });
    
    // Insert an active post
    await db.insert(posts).values({
      id: 'p-active',
      authorId: userId,
      content: 'I am still glowing',
      lifetimeHours: 24,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    // Insert an expired post
    await db.insert(posts).values({
      id: 'p-expired',
      authorId: userId,
      content: 'I have vanished',
      lifetimeHours: 24,
      createdAt: new Date(Date.now() - 48 * 3600 * 1000),
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
    });

    const res = await app.request('/api/posts?filter=all');
    expect(res.status).toBe(200);
    const feed = await res.json();
    const ids = feed.map((p: any) => p.id);
    expect(ids).toContain('p-active');
    expect(ids).not.toContain('p-expired');

    // Run reaper
    const purgedCount = await purgeExpiredPosts();
    expect(purgedCount).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/posts.test.ts`
Expected: FAIL (missing routes and reaper).

- [ ] **Step 3: Implement `server/routes/posts.ts` and `server/services/reaper.ts`**
Implement posts routes with author verification, reaction toggling, and query filter (`expiresAt > new Date()`).
Implement `purgeExpiredPosts()` executing `DELETE FROM posts WHERE expiresAt <= ?`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/posts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/routes/posts.ts server/services/reaper.ts server/app.ts tests/posts.test.ts
git commit -m "feat: implement finite posts API, reactions, and periodic expiry reaper"
```

---

### Task 5: Frontend Design System & Core Svelte 5 Components

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/lib/api.ts`
- Create: `src/components/Topbar.svelte`
- Create: `src/components/HeroSection.svelte`
- Create: `src/components/Composer.svelte`
- Create: `src/components/FeedFilters.svelte`
- Create: `src/components/PostCard.svelte`
- Create: `src/App.svelte`
- Create: `src/main.ts`
- Modify: `index.html`

**Interfaces:**
- Produces: Reactive Svelte 5 single-page application mounting to `#app`.
- Design tokens incorporating warm minimalism, glowing amber accents, and responsive layout.

- [ ] **Step 1: Write Svelte component rendering test**
Create `tests/ui.test.ts` using `@testing-library/svelte` or component mount verification to verify `PostCard.svelte` renders post content, author display name, and remaining time calculation.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL (components not created).

- [ ] **Step 3: Implement Svelte 5 components and styling**
Implement `tokens.css` with dark/light theme support.
Implement `PostCard.svelte` with live countdown timer and remaining lifespan visual glow indicator.
Implement `Composer.svelte` with 420 char limit and 24h/3d/7d lifespan selector.
Implement `FeedFilters.svelte` ("All", "Ending soon", "Yours").

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/ui.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/ index.html tests/ui.test.ts
git commit -m "feat: implement modern Svelte 5 UI components with warm editorial design system"
```

---

### Task 6: Frontend Passkey Authentication Flow & State

**Files:**
- Create: `src/lib/auth.svelte.ts`
- Create: `src/components/PasskeyAuthModal.svelte`
- Modify: `src/components/Topbar.svelte`
- Modify: `src/App.svelte`

**Interfaces:**
- Produces: `authStore` with `$state` for `currentUser`, `isAuthenticated`, `loginWithPasskey()`, `registerWithPasskey()`, `logout()`.

- [ ] **Step 1: Write auth store unit test**
Create `tests/auth-store.test.ts` verifying `authStore.logout()` resets active user state and handles unauthenticated session checks.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/auth-store.test.ts`
Expected: FAIL (missing auth store).

- [ ] **Step 3: Implement `@simplewebauthn/browser` integration in `auth.svelte.ts` and `PasskeyAuthModal.svelte`**
Implement client registration (`startRegistration`) and login (`startAuthentication`) flows with fallback error messages.
Integrate auth modal trigger in `Topbar.svelte`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/auth-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/auth.svelte.ts src/components/PasskeyAuthModal.svelte src/components/Topbar.svelte tests/auth-store.test.ts
git commit -m "feat: implement client-side WebAuthn Passkey modal and reactive auth store"
```

---

### Task 7: PWA Installation Experience (Supercell Store Pattern)

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `src/lib/pwa.svelte.ts`
- Create: `src/components/PwaInstallModal.svelte`
- Create: `public/screenshots/` (mockups narrow & wide)
- Create: `public/icons/` (192, 512, maskable)
- Modify: `src/components/Topbar.svelte`
- Modify: `src/App.svelte`

**Interfaces:**
- Produces:
  - Valid W3C Web App Manifest configured for Chromium Richer Install UI.
  - Interactive install drawer/modal with screenshot carousel and OS detection.

- [ ] **Step 1: Write manifest contract test**
Create `tests/pwa.test.ts` checking `manifest.webmanifest` contains `screenshots` (at least 3 narrow, 1 wide), `icons`, `display_override`, `categories`, and `description`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/pwa.test.ts`
Expected: FAIL (manifest missing).

- [ ] **Step 3: Implement Web App Manifest and PwaInstallModal component**
Configure `manifest.webmanifest` per Supercell Store Pattern standard.
Implement `PwaInstallModal.svelte` with:
- Carousel of preview screenshots with dots navigation.
- Value props (Zero latency, Privacy, Fullscreen, Zero app store download).
- Platform detector: Android/Chrome invokes `deferredPrompt.prompt()`; iOS Safari displays step-by-step visual guidance (*Condividi -> Aggiungi alla schermata Home*).
- Standalone check to hide button if already running in standalone mode.
- Dismissal preference stored in `localStorage`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/pwa.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add public/ src/lib/pwa.svelte.ts src/components/PwaInstallModal.svelte tests/pwa.test.ts
git commit -m "feat: implement Supercell Store Pattern PWA install experience and rich manifest"
```

---

### Task 8: End-to-End Verification & Production Build Integration

**Files:**
- Create: `server/db/seed.ts`
- Modify: `server/index.ts`
- Modify: `README.md`
- Test: Full Vitest suite & build check

**Interfaces:**
- Produces: Production build (`npm run build`), seed database runner (`npm run db:seed`), unified production server start (`npm start`).

- [ ] **Step 1: Write end-to-end integration test**
Create `tests/e2e.test.ts` simulating full user journey: user creation, post creation with 24h lifespan, reaction submission, reply creation, and feed retrieval.

- [ ] **Step 2: Run test to verify it passes**
Run: `npx vitest run tests/e2e.test.ts`
Expected: PASS

- [ ] **Step 3: Implement database seed script and production static file serving**
Implement `server/db/seed.ts` populating initial seed moments with active timestamps.
Configure `server/index.ts` to serve static files from `dist/` when `NODE_ENV === 'production'`.
Update `README.md` documenting new full-stack commands and architecture.

- [ ] **Step 4: Run full verification checklist**
Run: `npm run build && npx vitest run`
Expected: All tests pass and build generates without error.

- [ ] **Step 5: Commit**
```bash
git add server/db/seed.ts server/index.ts README.md tests/e2e.test.ts
git commit -m "feat: complete fullstack integration, database seeding, and production asset serving"
```
