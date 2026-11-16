# Afterglow

Afterglow is an original prototype for a finite social network: small conversations are visible while they matter, then naturally disappear.

## Product thesis

Most social feeds optimize for accumulation: more followers, more content, more notifications, more backlog. Afterglow competes by optimizing for **closure**. Every post has a visible lifetime, the feed stays small, and sharing a moment is intentionally lighter than publishing an identity.

## Positioning

> **Afterglow is the social network for moments you want to share, not content you want to store.**

### Differentiation from Seven

- Seven's clearest promise is a uniform seven-day lifespan and a minimalist public feed.
- Afterglow keeps the finite-life insight but introduces a more useful product wedge:
  - creator-chosen lifetimes (24h, 3 days, 7 days);
  - a calm "living room" feed rather than a generic public stream;
  - explicit ending-soon discovery instead of urgency driven by notifications;
  - a stronger boundary between moments, saved social posts, and permanent profiles;
  - future small circles and prompts, so the product is about lightweight relationships rather than only content deletion.

### Competitive frame

| Product | Core promise | Weakness / opening |
|---|---|---|
| Instagram / TikTok | Infinite discovery and identity | Endless backlog, performance pressure |
| Snapchat | Ephemeral private messaging | Primarily closed 1:1/group messaging |
| BeReal | One daily authentic moment | Rigid cadence, little conversation depth |
| Seven | Everything lasts seven days | Uniform lifetime; public-feed framing |
| Afterglow | Finite, intentional conversations | Must earn habit without addictive mechanics |

## Prototype acceptance criteria

- Render an active feed with visible expiry progress.
- Create a post with a selectable 24h, 3-day, or 7-day lifetime.
- Persist posts, likes, theme, and comments in localStorage.
- Filter all posts, ending-soon posts, or the user's posts.
- Support a lightweight reply interaction and share-to-clipboard action.
- Remove expired posts from the active feed.
- Provide empty and malformed-storage fallbacks.

## Run locally

```bash
python3 -m http.server 8766 --directory .
```

Open http://127.0.0.1:8766/.

This is a real local-first prototype, not a production backend. Authentication, media upload, multi-user sync, moderation, notifications, and server-side expiry are deliberately deferred to the next vertical slice.
