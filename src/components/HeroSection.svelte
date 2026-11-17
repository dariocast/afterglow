<script lang="ts">
  // Minimal, quiet header for Afterglow
</script>

<header class="stream-header">
  <div class="header-content">
    <h1 class="header-title">Good things<br /><em>can end.</em></h1>
    <p class="header-sub">
      A finite social network without an accumulating archive. Moments dissolve naturally.
    </p>
  </div>
</header>

<style>
  .stream-header {
    padding: 40px 0 28px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 24px;
  }

  .header-content {
    max-width: 100%;
  }

  .header-title {
    font-family: var(--serif);
    font-size: clamp(32px, 5vw, 44px);
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-weight: 400;
    color: var(--ink);
    margin: 0 0 12px;
  }

  .header-title em {
    font-style: italic;
    color: var(--ink-secondary);
  }

  .header-sub {
    font-size: 14px;
    line-height: 1.5;
    color: var(--muted);
    margin: 0;
  }
</style>
