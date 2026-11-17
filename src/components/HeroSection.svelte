<script lang="ts">
  import Icon from './icons/Icon.svelte';
</script>

<section class="intro-grid">
  <div class="intro-text">
    <div class="eyebrow-wrap">
      <span class="eyebrow-dot"></span>
      <p class="eyebrow">A finite social space</p>
    </div>
    <h1>Good things<br /><em>can end.</em></h1>
    <p class="lede">
      Share a thought, a reflection, or a quiet moment. Afterglow gives it room to breathe — then lets it go.
    </p>
  </div>

  <div class="manifesto-card">
    <div class="card-kicker">
      <Icon name="spark" size={13} />
      <span>The thesis</span>
    </div>
    <p class="manifesto-quote">Nothing here is meant to become an accumulating backlog.</p>
    <div class="manifesto-meta">
      <span class="meta-tag">No archive</span>
      <span class="meta-tag">No infinite scroll</span>
      <span class="meta-tag">Natural closure</span>
    </div>
  </div>
</section>

<style>
  .intro-grid {
    padding: 72px 0 56px;
    display: grid;
    grid-template-columns: 1.25fr 0.85fr;
    gap: 64px;
    align-items: end;
  }

  .eyebrow-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
  }

  .eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--accent);
  }

  .eyebrow {
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 0;
  }

  h1 {
    font-family: var(--serif);
    font-size: clamp(44px, 6.2vw, 80px);
    line-height: 0.94;
    letter-spacing: -0.04em;
    font-weight: 400;
    margin: 0 0 24px;
    color: var(--ink);
  }

  h1 em {
    color: var(--accent);
    font-style: italic;
    font-weight: 300;
  }

  .lede {
    max-width: 460px;
    color: var(--muted);
    line-height: 1.65;
    font-size: 16px;
    font-weight: 400;
    margin: 0;
  }

  .manifesto-card {
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 32px 32px 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 200px;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    position: relative;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .manifesto-card:hover {
    border-color: var(--line-strong);
    box-shadow: var(--shadow-md);
  }

  .card-kicker {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .manifesto-quote {
    font-family: var(--serif);
    font-size: clamp(21px, 2.4vw, 26px);
    line-height: 1.25;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 20px 0;
    font-weight: 400;
  }

  .manifesto-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .meta-tag {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    background: var(--surface-2);
    padding: 4px 10px;
    border-radius: var(--radius-full);
    border: 1px solid var(--line-subtle);
  }

  @media (max-width: 860px) {
    .intro-grid {
      grid-template-columns: 1fr;
      gap: 36px;
      padding: 44px 0 36px;
    }
  }
</style>
