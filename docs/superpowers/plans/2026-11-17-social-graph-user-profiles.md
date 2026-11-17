# Social Graph & User Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement asymmetric social follow/unfollow relations, user profile management (bio, avatar color, active moments), and a "Following" feed filter with an editorial Moleskine drawer interface.

**Architecture:** Extend SQLite tables (`users` with bio/avatarColor, new `follows` table) via Drizzle ORM. Add Hono `/api/users` routes for profiles and follow relations, and extend `/api/posts?filter=following`. In the frontend, introduce an editorial `ProfileDrawer.svelte` sheet opened from post headers or topbar, with inline bio editing, follow toggling, and clean "Following" feed tabs.

**Tech Stack:** Svelte 5 (runes: `$state`, `$derived`, `$effect`), TypeScript, Hono, Drizzle ORM, SQLite (`better-sqlite3`), Vitest, CSS custom properties.

**Spec:** [docs/superpowers/specs/2026-11-17-social-graph-user-profiles-design.md](file:///Users/dariocastellano/Workspaces/Others/afterglow/docs/superpowers/specs/2026-11-17-social-graph-user-profiles-design.md)

## Global Constraints

- Zero Unicode emojis anywhere in HTML, Svelte templates, CSS, JS, manifest, docs, or tests.
- Zero rounded pills (`border-radius: 9999px`).
- Node 22 LTS compatibility (`~/.nvm/versions/node/v22.23.1/bin/node`).
- Preserve 100% of existing tests (60/60 passing Vitest tests) and `python3 test_static.py`.
- No expired posts visible in user profiles (closure principle).

## Review Focus

1. **Self-follow attempt**: `POST /api/users/:id/follow` where `:id` is the authenticated user's own id must reject with 400 Bad Request.
2. **Expired posts in profile**: `GET /api/users/:username` must only return moments where `expiresAt > Date.now()`.
3. **Unauthenticated Following filter**: `GET /api/posts?filter=following` without auth cookie returns 401, handled in frontend by showing a quiet passkey sign-in prompt without crash or raw error.
4. **Duplicate follow idempotency**: Repeated `POST /api/users/:id/follow` returns success without throwing SQLite unique constraint error.
5. **Cascade deletion**: Deleting a user cascades and cleans up their follow records (`follower_id` and `following_id`).

---

### Task 1: Database Schema Extension & Follows Table

**Files:**
- Modify: `server/db/schema.ts`
- Modify: `server/db/index.ts`
- Modify: `server/db/seed.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Produces:
  - `users.bio`: `text('bio')`
  - `users.avatarColor`: `text('avatar_color')`
  - `follows`: table with `id`, `followerId`, `followingId`, `createdAt`
  - `Follow`: type `typeof follows.$inferSelect`
  - `NewFollow`: type `typeof follows.$inferInsert`

- [ ] **Step 1: Write failing tests in `tests/db.test.ts`**

Add unit tests covering:
- Creating a user with `bio` and `avatarColor`.
- Creating a follow relationship between two users in `follows`.
- Enforcing uniqueness on `(followerId, followingId)`: second insert throws constraint violation.
- Cascade delete: removing a user deletes their corresponding records in `follows`.

- [ ] **Step 2: Run test to verify it fails**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/db.test.ts`
Expected: FAIL (missing `follows` table and columns on `users`).

- [ ] **Step 3: Update `server/db/schema.ts` and `server/db/index.ts`**

In `server/db/schema.ts`:
- Add `bio: text('bio')` and `avatarColor: text('avatar_color')` to `users`.
- Export `follows` table with `id`, `followerId` (FK to `users.id` cascade), `followingId` (FK to `users.id` cascade), `createdAt`, and unique index on `(followerId, followingId)`.

In `server/db/index.ts`:
- Add `CREATE TABLE IF NOT EXISTS follows (...)` and `CREATE UNIQUE INDEX IF NOT EXISTS follower_following_idx (...)` to initialization SQL.
- Run migration checks to safely add `bio` and `avatar_color` columns to `users` if they do not exist.

In `server/db/seed.ts`:
- Populate seed users with distinct bios and warm avatar colors.
- Seed sample follow connections between Elena, Marcus, and Maya.

- [ ] **Step 4: Run database tests to verify they pass**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/db/ tests/db.test.ts
git commit -m "feat(db): add user bio, avatar color, and follows relation schema"
```

---

### Task 2: User Profile & Follows API Endpoints

**Files:**
- Create: `server/routes/users.ts`
- Modify: `server/app.ts`
- Create: `tests/users.test.ts`

**Interfaces:**
- Consumes:
  - `db`, `users`, `follows`, `posts` from `../db`
  - `requireAuth`, `getSessionUser` from `../auth/session`
- Produces:
  - `GET /api/users/:username`: returns `{ id, username, displayName, bio, avatarColor, createdAt, isFollowing, activeMoments }`
  - `PATCH /api/users/me`: updates bio and avatarColor (protected)
  - `POST /api/users/:id/follow`: follows user (protected, prohibits self-follow)
  - `DELETE /api/users/:id/follow`: unfollows user (protected)

- [ ] **Step 1: Write failing tests in `tests/users.test.ts`**

Test scenarios:
- `GET /api/users/:username`: returns 200 with profile and unexpired active moments only; returns 404 for nonexistent username.
- `PATCH /api/users/me`: rejects unauthenticated with 401; updates bio and avatarColor for authenticated user; rejects bio > 160 chars with 400.
- `POST /api/users/:id/follow`: rejects unauthenticated with 401; rejects self-follow with 400; successfully creates follow relation; idempotent on duplicate follow.
- `DELETE /api/users/:id/follow`: successfully removes follow relation; idempotent if not currently following.

- [ ] **Step 2: Run test to verify it fails**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/users.test.ts`
Expected: FAIL (404 or routes not found).

- [ ] **Step 3: Implement `server/routes/users.ts` and mount in `server/app.ts`**

Implement `usersRouter`:
- `GET /:username`: joins `users` with unexpired `posts` (`gt(posts.expiresAt, new Date())`), queries `follows` if requester has active session to compute `isFollowing`.
- `PATCH /me`: guarded by `requireAuth`. Validates bio length (max 160). Updates `users` table and returns updated user.
- `POST /:id/follow`: guarded by `requireAuth`. Rejects if `currentUser.id === targetId`. Inserts into `follows` using `onConflictDoNothing()`.
- `DELETE /:id/follow`: guarded by `requireAuth`. Deletes from `follows` where `followerId === currentUser.id AND followingId === targetId`.

Mount in `server/app.ts`:
- `app.route('/api/users', usersRouter);`

- [ ] **Step 4: Run test to verify it passes**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/users.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/users.ts server/app.ts tests/users.test.ts
git commit -m "feat(api): add user profile and follow/unfollow routes"
```

---

### Task 3: Feed Filter "Following" in Posts Router

**Files:**
- Modify: `server/routes/posts.ts`
- Modify: `tests/posts.test.ts`

**Interfaces:**
- Consumes:
  - `follows` table from `../db`
  - `c.req.query('filter') === 'following'`
- Produces:
  - `GET /api/posts?filter=following`: returns active moments authored by followed users only; returns 401 if unauthenticated. Includes `bio` and `avatarColor` in author object.

- [ ] **Step 1: Write failing tests in `tests/posts.test.ts`**

Test scenarios:
- `GET /api/posts?filter=following`: returns 401 when called without session cookie.
- `GET /api/posts?filter=following`: returns empty array `[]` when authenticated user follows no authors.
- `GET /api/posts?filter=following`: returns active moments authored by followed users, excluding un-followed authors and excluding expired moments.
- Verifies post author object returns `avatarColor` and `bio`.

- [ ] **Step 2: Run test to verify it fails**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/posts.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `server/routes/posts.ts`**

In `postsRouter.get('/')`:
- When `filter === 'following'`:
  - Check `currentUser`, return 401 if missing.
  - Query `follows` table for `followingId` list where `followerId === currentUser.id`.
  - If empty, return `c.json([])`.
  - Otherwise, add `inArray(posts.authorId, followedIds)` to `whereClause`.
- In all post queries, expand author select to include `bio: users.bio` and `avatarColor: users.avatarColor`.

- [ ] **Step 4: Run test to verify it passes**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/posts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/posts.ts tests/posts.test.ts
git commit -m "feat(api): support following feed filter and author profile tokens"
```

---

### Task 4: Frontend API Client & Auth Store Updates

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/lib/auth.svelte.ts`
- Modify: `tests/auth-store.test.ts`

**Interfaces:**
- Consumes:
  - Hono endpoints `/api/users/*` and `/api/posts?filter=following`
- Produces:
  - `api.fetchUserProfile(username: string): Promise<UserProfile>`
  - `api.updateProfile(data: { bio?: string; displayName?: string; avatarColor?: string }): Promise<User>`
  - `api.followUser(userId: string): Promise<{ success: boolean; isFollowing: boolean }>`
  - `api.unfollowUser(userId: string): Promise<{ success: boolean; isFollowing: boolean }>`
  - `authStore.updateProfile(data: ...)`

- [ ] **Step 1: Write failing tests in `tests/auth-store.test.ts`**

Test scenarios:
- `authStore.updateProfile()` sends patch request and updates `authStore.currentUser` with new bio and avatar color.
- API functions format correct HTTP requests and handle 401/404 appropriately.

- [ ] **Step 2: Run test to verify it fails**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/auth-store.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `src/lib/api.ts` and `src/lib/auth.svelte.ts`**

In `src/lib/api.ts`:
- Update `User` interface to include `bio?: string | null`, `avatarColor?: string | null`, `createdAt?: string | Date`.
- Define `UserProfile` interface: `User & { isFollowing: boolean | null; activeMoments: Post[] }`.
- Update `FeedFilter` type: `'all' | 'following' | 'ending' | 'mine'`.
- Implement `fetchUserProfile`, `updateProfile`, `followUser`, `unfollowUser`.

In `src/lib/auth.svelte.ts`:
- Add `updateProfile(data: { bio?: string; displayName?: string; avatarColor?: string })` method that calls `api.updateProfile` and mutates `currentUser`.

- [ ] **Step 4: Run test to verify it passes**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/auth-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/auth.svelte.ts tests/auth-store.test.ts
git commit -m "feat(client): implement profile and follow api client and auth store actions"
```

---

### Task 5: Editorial Profile Drawer & UI Integration

**Files:**
- Create: `src/components/ProfileDrawer.svelte`
- Modify: `src/components/FeedFilters.svelte`
- Modify: `src/components/PostCard.svelte`
- Modify: `src/components/Topbar.svelte`
- Modify: `src/App.svelte`
- Modify: `tests/ui.test.ts`
- Modify: `tests/e2e.test.ts`

**Interfaces:**
- Consumes:
  - `ProfileDrawer` component accepting `username: string`, `onClose: () => void`, `onPostUpdated?: () => void`
  - `FeedFilters` accepting `filter: 'all' | 'following' | 'ending' | 'mine'`
- Produces:
  - Interactive profile drawer showing author profile, follow/unfollow toggle, bio editing, and active moments stream.
  - Clickable author headers on post cards.
  - "Following" tab in feed navigation.

- [ ] **Step 1: Write UI tests in `tests/ui.test.ts` and `tests/e2e.test.ts`**

Test scenarios:
- `FeedFilters.svelte`: renders `Following` tab alongside `All`, `Ending soon`, and `Yours`.
- Clicking author name or avatar triggers profile opening.
- ProfileDrawer displays author display name, username, bio, and follow button.
- E2E flow: follow Elena, switch to "Following" filter, verify Elena's active moments appear.

- [ ] **Step 2: Run test to verify it fails**

Run: `~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run tests/ui.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `ProfileDrawer.svelte` and integrate into `App.svelte`**

Create `src/components/ProfileDrawer.svelte`:
- Paper background with dot-grid styling and subtle hairline borders.
- Header with close button (`Icon name="close"`), avatar badge with `avatarColor` and initials, display name, `@username`, and join date.
- Bio display: if viewing own profile, provide inline textarea and "Save" button to update bio.
- Follow button: if viewing another user, display discrete button (`Follow` / `Following`) with optimistic update.
- Active moments list: renders author's active posts. If none: "No active moments. Thoughts will appear here while they live."

Update `src/components/FeedFilters.svelte`:
- Add `Following` filter option (`All · Following · Ending soon · Yours`).

Update `src/components/PostCard.svelte`:
- Make author avatar and username clickable buttons dispatching `onAuthorClick(author.username)`.
- Use `author.avatarColor` if present for the avatar background.

Update `src/components/Topbar.svelte`:
- Make username/avatar clickable, calling `onProfileClick(currentUser.username)`.

Update `src/App.svelte`:
- Manage `selectedProfileUsername: string | null`.
- When set, render `<ProfileDrawer username={selectedProfileUsername} onClose={() => selectedProfileUsername = null} />`.
- When `activeFilter === 'following'` and user is signed out, show clean empty state prompting passkey sign-in.

- [ ] **Step 4: Run full verification suite**

Run:
```bash
~/.nvm/versions/node/v22.23.1/bin/node ./node_modules/.bin/vitest run
python3 test_static.py
npm run build
python3 -c "import re, glob; emojis = [f for f in glob.glob('src/**/*', recursive=True) if re.search(r'[\U00010000-\U0010ffff]', open(f, errors='ignore').read())]; assert not emojis, f'Found emojis in {emojis}'"
```
Expected: All tests pass, static contract passes, build succeeds, 0 emojis.

- [ ] **Step 5: Commit**

```bash
git add src/ tests/
git commit -m "feat(ui): add editorial profile drawer, author interactions, and following filter"
```
