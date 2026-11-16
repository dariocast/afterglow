# Contributing to Afterglow

Thanks for helping shape a calmer kind of social product.

## Local development

Afterglow is intentionally dependency-free:

```bash
python3 -m http.server 8766
python3 test_static.py
node --check app.js
```

Open `http://127.0.0.1:8766/` in a browser.

## Product principles

- Prefer finite, intentional interactions over engagement loops.
- Keep the app usable without a build step.
- Do not add analytics, tracking, or third-party assets without documenting the privacy impact.
- Keep the prototype original; do not copy Seven's branding, code, assets, or distinctive copy.
- Separate local prototype behavior from claims about the future multi-user product.

## Pull requests

Explain the user problem, the interaction change, and how you verified it. Keep changes small and accessible on mobile and desktop.
