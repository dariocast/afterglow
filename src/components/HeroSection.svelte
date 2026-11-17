<script lang="ts">
  import Icon from './icons/Icon.svelte';
</script>

<section class="hero-section">
  <div class="hero-content">
    <div class="hero-eyebrow">
      <span class="eyebrow-pip"></span>
      <span>Finite Social Protocol</span>
    </div>
    <h1 class="hero-title">Moments fade.<br />That is the point.</h1>
    <p class="hero-lede">
      A calm space for thoughts, reflections, and genuine presence.
      Nothing here accumulates into a permanent backlog: moments live briefly and dissolve.
    </p>
  </div>

  <div class="hero-status-strip" role="status" aria-label="Network parameters">
    <div class="status-item">
      <span class="status-indicator"></span>
      <span class="status-label">Expiry Engine</span>
      <span class="status-value">Active</span>
    </div>
    <div class="status-divider"></div>
    <div class="status-item">
      <span class="status-label">Archive Policy</span>
      <span class="status-value">Zero Backlog</span>
    </div>
    <div class="status-divider"></div>
    <div class="status-item">
      <span class="status-label">Storage</span>
      <span class="status-value">Local SQLite</span>
    </div>
  </div>
</section>

<style>
  .hero-section {
    padding: 48px 0 36px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 32px;
  }

  .hero-content {
    max-width: 680px;
  }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 16px;
  }

  .eyebrow-pip {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-xs);
    background: var(--amber);
    box-shadow: var(--amber-glow);
  }

  .hero-title {
    font-family: var(--sans);
    font-size: clamp(34px, 4.8vw, 56px);
    line-height: 1.05;
    letter-spacing: -0.035em;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 16px;
  }

  .hero-lede {
    font-size: 15px;
    line-height: 1.6;
    color: var(--muted);
    margin: 0;
    max-width: 580px;
  }

  .hero-status-strip {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    width: fit-content;
  }

  .status-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-xs);
    background: var(--success);
  }

  .status-label {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .status-value {
    color: var(--ink);
    font-weight: 500;
  }

  .status-divider {
    width: 1px;
    height: 12px;
    background: var(--line);
  }

  @media (max-width: 640px) {
    .hero-section {
      padding: 32px 0 24px;
      gap: 20px;
    }
    .hero-status-strip {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      width: 100%;
    }
    .status-divider {
      display: none;
    }
  }
</style>
