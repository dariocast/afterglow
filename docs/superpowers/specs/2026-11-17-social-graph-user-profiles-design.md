# Design Specification: Social Graph & User Profiles

**Date**: 2026-11-17  
**Status**: Draft for Review  
**Topic**: Relational Social Graph (Asymmetric Follows) and Editorial User Profiles  

---

## 1. Intent and Why

Afterglow is an ephemeral, finite social network where conversations exist while they matter and naturally expire. Up to this point, the backend and frontend supported individual users with Passkeys and moments with reactions/replies, but lacked the core relational fabric of a social network: user identity depth (bio, avatar styling, profile view) and interpersonal connections (following authors of interest).

The objective is to introduce:
1. **User Profiles**: Minimalist, authentic author profiles (bio, avatar color/initials, join date, active moments) without exposing expired archives.
2. **Asymmetric Social Graph**: A clean, quiet follow/unfollow mechanism without toxic vanity metrics (no public follower leaderboards or influencer counters).
3. **Curated Feed Filtering**: A dedicated `Following` feed tab allowing users to read active moments exclusively from people they follow.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Extend SQLite schema via Drizzle ORM to add `bio` and `avatar_color` to `users`, and introduce a `follows` table.
- Provide secure Hono API routes for:
  - Fetching user profiles (`GET /api/users/:username`).
  - Updating own profile bio and avatar color (`PATCH /api/users/me`).
  - Following and unfollowing authors (`POST /api/users/:id/follow`, `DELETE /api/users/:id/follow`).
  - Filtering active feed moments by followed authors (`GET /api/posts?filter=following`).
- Implement an editorial **Profile Drawer (Sheet)** in Svelte 5 that slides smoothly onto the screen when clicking any author name or avatar, rendering their profile and current active moments.
- Provide inline editing for the authenticated user's own profile directly inside the drawer.
- Add a `Following` tab in `FeedFilters` with polite unauthenticated sign-in handling.

### Non-Goals
- Public follower count badges or vanity ranking algorithms.
- Heavy image file uploads or cloud object storage for avatars (uses procedural initials on warm paper/ink palettes).
- Long-term permanent archive of expired moments in the user profile (strict adherence to closure principle).

### Anti-Goals
- Infinite scrolling, engagement-maximizing algorithms, or notification spam.
- Any Unicode emoji anywhere in code, copy, templates, or tests.
- Breaking existing Passkey authentication or SQLite seed data.

---

## 3. Approaches Considered & Selected Approach

### Approach A: Contextual Editorial Profile Drawer / Sheet (Selected)
- **Concept**: A side sheet / slide-over modal styled with Moleskine dot-grid and hairline borders. Clicking an author's name or avatar opens the drawer without navigating away from the feed.
- **Why chosen**: Keeps the single-page application calm and lightweight. Allows reading an author's active thoughts and toggling follow status in place, then dismissing back to the exact scroll position in the living room stream. Fits mobile touch gestures and desktop viewports seamlessly.

### Approach B: Full-Page Profile Route (`/u/:username`)
- **Concept**: Dedicated page replacing the living room feed with a breadcrumb back.
- **Why rejected**: Creates heavy page transitions for a quick social interaction, breaking the continuous ambient stream.

### Approach C: Floating Hover Card / Popover
- **Concept**: Desktop hover cards with follow buttons, separate modal for profile editing.
- **Why rejected**: Fragile on mobile touch screens, fragments viewing and editing into two different UX patterns.

---

## 4. Detailed Specification

### 4.1 Database Schema (Drizzle ORM & SQLite)

#### Alteration to `users` table:
```typescript
// server/db/schema.ts
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio'), // Max 160 characters
  avatarColor: text('avatar_color'), // Hex code or preset token (e.g., #b57a38, #5a7d65, #7a6590)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

#### New `follows` table:
```typescript
export const follows = sqliteTable(
  'follows',
  {
    id: text('id').primaryKey(),
    followerId: text('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: text('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('follower_following_idx').on(table.followerId, table.followingId),
  ]
);
```

#### Seeding:
Update `server/db/seed.ts` with diverse bios and avatar colors for seed users (Elena Vance, Marcus Thorne, Maya Lin, Julian Croft) and sample follow relationships.

---

### 4.2 Backend API Routes (`server/routes/users.ts` & `server/routes/posts.ts`)

1. `GET /api/users/:username`:
   - Returns public user profile:
     ```json
     {
       "id": "user-uuid",
       "username": "elenavance",
       "displayName": "Elena Vance",
       "bio": "Observing quiet intersections of light and city architecture.",
       "avatarColor": "#a26a42",
       "createdAt": "2026-11-17T12:00:00.000Z",
       "isFollowing": true,
       "activeMoments": [ /* array of unexpired Post objects by this user */ ]
     }
     ```
   - If session user is viewing their own profile, `isFollowing` is null / not applicable.

2. `PATCH /api/users/me`:
   - Requires valid session cookie.
   - Body: `{ "bio"?: string, "displayName"?: string, "avatarColor"?: string }`.
   - Validates length (bio <= 160 chars, displayName <= 50 chars).
   - Returns updated user object.

3. `POST /api/users/:id/follow`:
   - Requires valid session cookie.
   - Prohibits self-follow (`followerId === followingId` -> 400 Bad Request).
   - Idempotent insert (ignores or returns 200 if already following).
   - Returns `{ "success": true, "isFollowing": true }`.

4. `DELETE /api/users/:id/follow`:
   - Requires valid session cookie.
   - Idempotent delete.
   - Returns `{ "success": true, "isFollowing": false }`.

5. `GET /api/posts?filter=following`:
   - Requires valid session cookie.
   - Returns active, unexpired posts where `authorId` is in the list of `followingId` for the current user.
   - If not authenticated, returns 401 (handled gracefully in frontend).

---

### 4.3 Frontend Architecture & Components

1. **`src/components/ProfileDrawer.svelte`**:
   - Slide-in side drawer from the right on desktop, bottom sheet on mobile.
   - Backdrop click or `Escape` key dismisses drawer.
   - Header with custom avatar circle (colored background with initials), display name, `@username`, and member since date.
   - Bio display with subtle edit button if viewing own profile (`PATCH /api/users/me`).
   - Follow / Unfollow button if viewing another author (with optimistic UI update).
   - Stream of active moments authored by this user, reusing `PostCard.svelte`. If none active: "No active moments. New thoughts will appear while they live."
   
2. **`src/components/FeedFilters.svelte`**:
   - Filter items: `All`, `Following`, `Ending soon`, `Yours`.
   - Active indicator line in ink color.

3. **`src/components/PostCard.svelte`**:
   - Author avatar and username are clickable buttons that trigger `onAuthorClick(author.username)` to open the Profile Drawer.
   - If author is followed by current user, optionally display a subtle hairline indicator.

4. **`src/components/Topbar.svelte`**:
   - Clicking authenticated username or avatar opens the Profile Drawer for self-profile inspection and bio editing.

5. **`src/App.svelte`**:
   - Manages state for `activeProfileUsername: string | null`.
   - When set, renders `<ProfileDrawer username={activeProfileUsername} onClose={() => activeProfileUsername = null} />`.
   - Handles `filter === 'following'` with graceful sign-in prompt if unauthenticated.

---

## 5. Verification & Test Plan

1. **Database & Schema Tests (`tests/db.test.ts`)**:
   - Verify `users` table schema includes `bio` and `avatarColor`.
   - Verify `follows` table creation, foreign key cascade on user delete, and unique index constraint preventing duplicate follows.
   - Verify self-follow prevention at DB or route level.
2. **API Endpoint Tests (`tests/users.test.ts` & `tests/posts.test.ts`)**:
   - Profile fetch by username (`GET /api/users/:username`).
   - Profile update (`PATCH /api/users/me`) with authorization checks and length limits.
   - Follow and unfollow operations (`POST / DELETE /api/users/:id/follow`).
   - Following feed query (`GET /api/posts?filter=following`) returns only followed authors' active posts and excludes expired ones.
3. **Frontend Integration Tests (`tests/ui.test.ts` & `tests/e2e.test.ts`)**:
   - Profile drawer opens upon clicking post author.
   - Following filter displays active moments when signed in and polite passkey sign-in prompt when signed out.
   - Vitest suite (all tests passing) and `python3 test_static.py` passing.
   - Zero Unicode emojis verified via scan.
