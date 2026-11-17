<script lang="ts">
  import { pwaStore } from '../lib/pwa.svelte';
  import Icon from './icons/Icon.svelte';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
  }

  let {
    isOpen = false,
    onClose,
  }: Props = $props();

  let activeSlide = $state(0);
  let isInstalling = $state(false);
  let installResult = $state<string | null>(null);

  const slides = [
    {
      title: 'The Living Room',
      desc: 'Finite conversations with natural lifespans from 24h to 7 days.',
      img: '/screenshots/narrow-1.png',
      alt: 'Living Room view with moments and expiry countdowns',
    },
    {
      title: 'Intentional Writing',
      desc: 'Share a thought that breathes, then gently fades away.',
      img: '/screenshots/narrow-2.png',
      alt: 'Composer screen with duration selector',
    },
    {
      title: 'Biometric Passkeys',
      desc: 'Fast passwordless access, securely stored in your device hardware.',
      img: '/screenshots/narrow-3.png',
      alt: 'Passkey screen with Touch ID and Face ID',
    },
  ];

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      handleClose();
    }
  }

  function handleClose() {
    installResult = null;
    onClose ? onClose() : pwaStore.closeInstallModal();
  }

  function nextSlide() {
    activeSlide = (activeSlide + 1) % slides.length;
  }

  function prevSlide() {
    activeSlide = (activeSlide - 1 + slides.length) % slides.length;
  }

  async function handleInstallClick() {
    isInstalling = true;
    installResult = null;
    try {
      const outcome = await pwaStore.promptInstall();
      if (outcome === 'accepted') {
        installResult = 'Installation confirmed!';
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        installResult = 'Installation dismissed.';
      }
    } finally {
      isInstalling = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
  >
    <div
      class="modal-card"
      role="dialog"
      aria-labelledby="pwa-modal-title"
      aria-modal="true"
    >
      <button
        class="modal-close"
        type="button"
        onclick={handleClose}
        aria-label="Close dialog"
      >
        <Icon name="close" size={16} />
      </button>

      <div class="modal-header">
        <div class="modal-icon-badge">
          <Icon name="spark" size={20} />
        </div>
        <h2 id="pwa-modal-title">Install Afterglow Web App</h2>
        <p class="modal-subtitle">
          Add Afterglow to your home screen for an uninterrupted, private, and distraction-free experience.
        </p>
      </div>

      <!-- Screenshot Carousel -->
      <div class="carousel-container" aria-label="Application preview carousel">
        <div class="carousel-viewport">
          <button
            class="carousel-nav-btn prev"
            type="button"
            onclick={prevSlide}
            aria-label="Previous screenshot"
          >
            <Icon name="chevron-left" size={16} />
          </button>

          <div class="carousel-slide">
            <div class="screenshot-frame">
              <img
                src={slides[activeSlide].img}
                alt={slides[activeSlide].alt}
                class="screenshot-img"
                loading="lazy"
              />
            </div>
            <div class="slide-caption">
              <h4>{slides[activeSlide].title}</h4>
              <p>{slides[activeSlide].desc}</p>
            </div>
          </div>

          <button
            class="carousel-nav-btn next"
            type="button"
            onclick={nextSlide}
            aria-label="Next screenshot"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        <div class="carousel-dots" role="tablist" aria-label="Preview navigation">
          {#each slides as _, i}
            <button
              class="carousel-dot"
              class:active={activeSlide === i}
              type="button"
              role="tab"
              aria-selected={activeSlide === i}
              aria-label="View slide {i + 1}"
              onclick={() => { activeSlide = i; }}
            ></button>
          {/each}
        </div>
      </div>

      <!-- Key Benefits (Supercell Store Pattern standard with zero emojis) -->
      <div class="benefits-grid">
        <div class="benefit-item">
          <div class="benefit-icon-badge">
            <Icon name="bolt" size={16} />
          </div>
          <div>
            <strong>Zero latenza all'avvio</strong>
            <p>100% pronto offline & caricamento istantaneo con cache shell dedicata.</p>
          </div>
        </div>

        <div class="benefit-item">
          <div class="benefit-icon-badge">
            <Icon name="shield" size={16} />
          </div>
          <div>
            <strong>Privacy totale & zero tracciamento</strong>
            <p>Nessun cookie pubblicitario o tracciatore invasivo. I tuoi pensieri svaniscono.</p>
          </div>
        </div>

        <div class="benefit-item">
          <div class="benefit-icon-badge">
            <Icon name="device" size={16} />
          </div>
          <div>
            <strong>Esperienza a schermo intero senza barre del browser</strong>
            <p>Interfaccia pura, pulita e immersiva senza barre degli indirizzi o elementi superflui.</p>
          </div>
        </div>

        <div class="benefit-item">
          <div class="benefit-icon-badge">
            <Icon name="box" size={16} />
          </div>
          <div>
            <strong>Zero megabyte scaricati da app store</strong>
            <p>Installazione istantanea direttamente dal browser, senza store commerciali.</p>
          </div>
        </div>
      </div>

      <!-- OS Adaptation & Action Area -->
      <div class="install-action-area">
        {#if pwaStore.isStandalone}
          <div class="standalone-notice">
            <div class="notice-icon-wrap">
              <Icon name="check" size={16} />
            </div>
            <div>
              <strong>Currently running in standalone mode</strong>
              <p>You are already using Afterglow from your home screen.</p>
            </div>
          </div>
        {:else if pwaStore.deferredPrompt}
          <button
            class="primary-install-btn"
            type="button"
            onclick={handleInstallClick}
            disabled={isInstalling}
          >
            <Icon name="device" size={16} />
            <span>{isInstalling ? 'Opening system dialog…' : 'Install Afterglow'}</span>
          </button>
          {#if installResult}
            <p class="install-status">{installResult}</p>
          {/if}
        {:else if pwaStore.isIosSafari}
          <div class="ios-guide">
            <h4 class="ios-guide-title">How to install on iOS & iPadOS (Safari):</h4>
            <ol class="ios-steps">
              <li>
                <span class="step-num">1</span>
                <span>Tap the <strong>Share</strong> icon <span class="ios-icon"><Icon name="ios-share" size={14} /></span> in the bottom bar.</span>
              </li>
              <li>
                <span class="step-num">2</span>
                <span>Scroll down and select <span class="ios-icon"><Icon name="ios-plus" size={14} /></span> <strong>Add to Home Screen</strong>.</span>
              </li>
              <li>
                <span class="step-num">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner to confirm.</span>
              </li>
            </ol>
          </div>
        {:else}
          <div class="generic-guide">
            <p>
              Open your browser menu and choose <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong> to enjoy the distraction-free standalone experience.
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(10, 11, 14, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-card {
    background: var(--surface);
    border: 1px solid var(--line-focus);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 28px;
    position: relative;
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    border: 1px solid transparent;
    transition: all var(--transition-fast);
  }

  .modal-close:hover {
    color: var(--ink);
    background: var(--surface-subtle);
    border-color: var(--line);
  }

  .modal-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .modal-icon-badge {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-sm);
    background: var(--amber-subtle);
    color: var(--amber);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    border: 1px solid var(--amber);
    box-shadow: var(--amber-glow);
  }

  .modal-header h2 {
    font-family: var(--sans);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0 0 6px;
  }

  .modal-subtitle {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
    line-height: 1.45;
  }

  .carousel-container {
    background: var(--surface-subtle);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 16px 12px 12px;
    margin-bottom: 20px;
  }

  .carousel-viewport {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .carousel-slide {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .screenshot-frame {
    width: 130px;
    height: 190px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg);
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow-sm);
    margin-bottom: 10px;
  }

  .screenshot-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .slide-caption h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    margin: 0 0 3px;
  }

  .slide-caption p {
    font-size: 11px;
    color: var(--muted);
    margin: 0;
    line-height: 1.35;
  }

  .carousel-nav-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-xs);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    background: var(--surface);
    border: 1px solid var(--line);
    transition: all var(--transition-fast);
  }

  .carousel-nav-btn:hover {
    color: var(--ink);
    border-color: var(--line-strong);
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 5px;
    margin-top: 10px;
  }

  .carousel-dot {
    width: 14px;
    height: 3px;
    border-radius: 1px;
    background: var(--line-strong);
    border: none;
    padding: 0;
    transition: all var(--transition-fast);
  }

  .carousel-dot.active {
    background: var(--amber);
    box-shadow: var(--amber-glow);
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }

  .benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .benefit-icon-badge {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-xs);
    background: var(--surface-subtle);
    color: var(--amber);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid var(--line);
  }

  .benefit-item strong {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 2px;
    line-height: 1.3;
  }

  .benefit-item p {
    font-size: 10px;
    color: var(--muted);
    margin: 0;
    line-height: 1.3;
  }

  .install-action-area {
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }

  .primary-install-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px;
    background: var(--amber);
    color: #0a0b0e;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    border: 1px solid var(--amber);
    box-shadow: var(--amber-glow);
    transition: all var(--transition-fast);
  }

  .primary-install-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .install-status {
    text-align: center;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--amber);
    margin: 8px 0 0;
  }

  .standalone-notice {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--success-soft);
    border: 1px solid var(--success);
    border-radius: var(--radius-sm);
    color: var(--success);
  }

  .notice-icon-wrap {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-xs);
    background: var(--success);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .standalone-notice strong {
    display: block;
    font-size: 12px;
    color: var(--ink);
  }

  .standalone-notice p {
    font-size: 11px;
    color: var(--muted);
    margin: 0;
  }

  .ios-guide {
    background: var(--surface-subtle);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
  }

  .ios-guide-title {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--ink);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ios-steps {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ios-steps li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--ink-secondary);
  }

  .step-num {
    width: 16px;
    height: 16px;
    border-radius: var(--radius-xs);
    background: var(--surface);
    border: 1px solid var(--line-strong);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
    font-size: 9px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .ios-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px 3px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-xs);
    margin: 0 2px;
  }

  .generic-guide p {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0;
    text-align: center;
  }

  @media (max-width: 480px) {
    .benefits-grid {
      grid-template-columns: 1fr;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>
