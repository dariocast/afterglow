<script lang="ts">
  // HeroSection.svelte - Warm editorial intro
</script>

<section class="intro-grid">
  <div class="intro-text">
    <p class="eyebrow">A finite social network</p>
    <h1>Good things<br /><em>can end.</em></h1>
    <p class="lede">
      Share a thought, a reflection, or a quiet moment. Afterglow gives it room to breathe — then lets it go.
    </p>
  </div>

  <div class="manifesto-card">
    <div class="card-kicker">The promise</div>
    <p>Nothing here is meant to become a backlog.</p>
    <div class="manifesto-meta">
      <span>no archive</span>
      <span>no infinite scroll</span>
      <span>clean expiry</span>
    </div>
  </div>
</section>

<style>
  .intro-grid {
    padding: 64px 0 52px;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 70px;
    align-items: end;
  }

  .eyebrow {
    color: var(--accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.17em;
    text-transform: uppercase;
    margin: 0 0 16px;
  }

  h1 {
    font-family: var(--serif);
    font-size: clamp(48px, 7vw, 88px);
    line-height: 0.92;
    letter-spacing: -0.06em;
    font-weight: 400;
    margin: 0 0 24px;
    color: var(--ink);
  }

  h1 em {
    color: var(--accent);
    font-style: italic;
  }

  .lede {
    max-width: 480px;
    color: var(--muted);
    line-height: 1.6;
    font-size: 16px;
    margin: 0;
  }

  .manifesto-card {
    background: var(--accent);
    color: #fff7ef;
    padding: 32px;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transform: rotate(0.8deg);
    box-shadow: 10px 14px 0 var(--accent-soft);
    border-radius: var(--radius-sm);
    transition: transform var(--transition-smooth);
  }

  .manifesto-card:hover {
    transform: rotate(0deg) translateY(-2px);
  }

  .card-kicker {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.17em;
    text-transform: uppercase;
    color: #ffe4d8;
  }

  .manifesto-card p {
    font-family: var(--serif);
    font-size: clamp(24px, 3.2vw, 32px);
    line-height: 1.08;
    letter-spacing: -0.03em;
    margin: 16px 0;
  }

  .manifesto-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    opacity: 0.85;
  }

  @media (max-width: 768px) {
    .intro-grid {
      grid-template-columns: 1fr;
      gap: 36px;
      padding-top: 40px;
    }

    .manifesto-card {
      max-width: 100%;
      transform: none;
      box-shadow: 6px 8px 0 var(--accent-soft);
    }
  }
</style>
