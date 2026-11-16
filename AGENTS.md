# AGENTS.md

## Project

Afterglow is an original, dependency-free prototype for a finite social network. Posts, reactions, replies, filters, theme preference, and expiry behavior currently run in the browser and persist only in `localStorage`.

The product thesis is **social interaction without an accumulating archive**. Preserve this direction: finite, intentional, calm, and lightweight. Do not turn the prototype into an infinite feed, engagement-optimization experiment, or permanent content archive without an explicit product decision.

## Repository map

- `index.html` — semantic application shell, stable UI IDs, and accessible labels.
- `styles.css` — design tokens, layout, responsive behavior, light/dark themes.
- `app.js` — seed data, versioned local state, rendering, post creation, reactions, replies, filters, sharing, and expiry logic.
- `test_static.py` — dependency-free static contract test.
- `README.md` — product thesis, competitive positioning, acceptance criteria, and prototype boundary.
- `CONTRIBUTING.md` — contributor expectations.
- `.github/workflows/ci.yml` — syntax, static contract, and HTTP smoke checks.
- `.agents/skills/` — repository-local agent workflows and supporting prompts.
- `.claude/skills/` — compatibility symlinks into `.agents/skills/`; do not edit the symlink targets through this path.
- `.codegraph/` — codegraph tool state/configuration; do not treat generated state as application source.
- `skills-lock.json` — pinned external skill metadata; change only when intentionally updating the skill bundle.

## Agent workflow

1. **Read context first.** Inspect this file, `README.md`, the relevant source files, and the applicable skill under `.agents/skills/` before changing code. Use the repository's local skill workflow when one matches the task.
2. **Protect the user's work.** Run `git status --short --branch` before editing. Do not discard, reset, or overwrite user changes. Prefer a feature branch or worktree for non-trivial work; do not make exploratory changes directly on `main`.
3. **Clarify product ambiguity.** If a request changes the product promise, privacy model, persistence model, or public behavior, write a short decision/plan before implementation. Do not silently expand the prototype into a backend or multi-user system.
4. **Use TDD for behavior changes.** Add or update a focused test before production behavior, run it to observe the intended failure when practical, implement the smallest change, then run the complete available suite. Configuration-only and throwaway prototype changes are the only normal exceptions.
5. **Keep the change narrow.** Avoid unrelated refactors, framework migrations, package managers, build tooling, analytics, trackers, or third-party assets unless the task explicitly requires them and the README is updated.
6. **Verify before claiming completion.** Run fresh verification commands, read their output and exit codes, and report any unverified layer explicitly. A code diff or an agent report is not evidence of a working feature.

## Implementation rules

### Architecture

- Keep the default stack dependency-free: semantic HTML, one CSS file, one small JavaScript file, and the browser platform.
- Do not add React, TypeScript, a bundler, or a runtime backend for a feature that can be implemented within the current static boundary.
- If production multi-user behavior is introduced, document the architecture and migration boundary first; do not disguise server behavior as local prototype behavior.
- Keep domain behavior separable from rendering where practical so it can be tested without a browser.

### State and expiry

- Use the existing versioned storage key `afterglow.v1`; migrate state deliberately if its shape changes.
- Treat malformed or missing local state as recoverable: fall back to valid seed data without exposing raw storage errors to the user.
- Store absolute timestamps for expiry and compare against `Date.now()`; never hard-code demo dates as “today.”
- Expired posts must not appear in active feed views. Do not create an archive or hidden recovery path unless the product decision explicitly adds one.
- Use stable IDs for seeded records and `crypto.randomUUID()` with a fallback for new records.
- Keep local-only behavior explicit in UI and documentation. Never imply that a post is synchronized with other users.

### UI and accessibility

- Preserve the existing Afterglow visual language and tokens unless a redesign is explicitly requested.
- Keep mobile and desktop layouts usable; test narrow widths when changing layout or interaction.
- Maintain semantic headings, labels, button names, visible focus states, keyboard access, and `aria-live` behavior for feed updates.
- Escape user-authored text before inserting it into HTML. Do not introduce `innerHTML` paths that bypass the existing escaping discipline.
- Prefer progressive enhancement and clear empty/error states over silent failures.

### Product and originality boundaries

- Afterglow may learn from the finite-life interaction principle in Seven, but must not copy Seven's code, assets, branding, distinctive copy, or exact screens.
- Do not add engagement loops, dark patterns, aggressive notifications, public follower counts, or infinite scrolling without a documented product rationale.
- The prototype currently has **no authentication** and no server-side user identity. Authentication, media uploads, moderation, notifications, and server-side expiry are deferred features; keep them labeled as such.
- Do not add telemetry or external analytics by default. Any privacy-impacting dependency requires an explicit decision and README documentation.

## Verification commands

Run from the repository root:

```bash
python3 test_static.py
node --check app.js
python3 -m http.server 8766 --bind 127.0.0.1
```

For HTTP verification, serve the files and request `/`, `/styles.css`, and `/app.js`; confirm HTTP 200 and stable user-visible markers. Stop the server after the check.

Before a completion claim, at minimum verify:

- the focused behavior test or static contract passes;
- `node --check app.js` passes;
- the full available test command passes;
- HTTP assets return 200 when source/runtime files changed;
- `git diff --check` is clean;
- `git status --short` accounts for every changed file.

If browser automation is unavailable, report static and HTTP verification separately from browser interaction or visual QA. Never claim a browser flow was exercised when only source checks ran.

## Change and commit guidance

- Keep commits focused and describe behavior, for example `feat: add circle visibility filter` or `test: cover expiry fallback`.
- Update `README.md` when acceptance criteria, product positioning, local setup, privacy behavior, or deferred production scope changes.
- Do not commit credentials, `.env` files, session data, generated secrets, or personal browser data.
- Do not edit pinned skill content or `skills-lock.json` as part of an application feature.
- Before opening or pushing a PR, run the complete verification checklist and inspect the final diff. Report known CI or environment failures instead of masking them.

## Definition of done

A task is complete only when:

- the requested behavior is implemented within the declared architecture boundary;
- tests or static contracts cover the changed behavior;
- the complete available verification commands have fresh passing evidence, or failures are explicitly reported;
- accessibility, expiry, persistence, and privacy implications were considered;
- README/product scope is updated when needed;
- no secrets or unrelated generated files are included;
- the final diff and working tree are understood.
