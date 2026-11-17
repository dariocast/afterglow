<script lang="ts">
  import { pwaStore } from '../lib/pwa.svelte';

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
      desc: 'Feed vivo con scadenze naturali da 6h a 7 giorni.',
      img: '/screenshots/narrow-1.png',
      alt: 'Schermata Living Room con post a tempo',
    },
    {
      title: 'Scrittura Intenzionale',
      desc: 'Condividi pensieri che svaniscono spontaneamente.',
      img: '/screenshots/narrow-2.png',
      alt: 'Schermata Composer con selettore di durata',
    },
    {
      title: 'Passkey & Biometria',
      desc: 'Accesso istantaneo senza password, protetto dal tuo dispositivo.',
      img: '/screenshots/narrow-3.png',
      alt: 'Schermata Passkey con FaceID/TouchID',
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
        installResult = 'Installazione completata con successo!';
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        installResult = 'Installazione annullata.';
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
        aria-label="Chiudi finestra"
      >
        ✕
      </button>

      <div class="modal-header">
        <span class="modal-icon" aria-hidden="true">✦</span>
        <h2 id="pwa-modal-title">Esperienza Afterglow Web App</h2>
        <p class="modal-subtitle">
          Installa Afterglow sulla tua Home per un'esperienza nativa fluida, privata e senza distrazioni.
        </p>
      </div>

      <!-- Screenshot Carousel -->
      <div class="carousel-container" aria-label="Anteprime dell'applicazione">
        <div class="carousel-viewport">
          <button
            class="carousel-nav-btn prev"
            type="button"
            onclick={prevSlide}
            aria-label="Schermata precedente"
          >
            ‹
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
            aria-label="Schermata successiva"
          >
            ›
          </button>
        </div>

        <div class="carousel-dots" role="tablist" aria-label="Navigazione anteprime">
          {#each slides as _, i}
            <button
              class="carousel-dot"
              class:active={activeSlide === i}
              type="button"
              role="tab"
              aria-selected={activeSlide === i}
              aria-label="Vai a schermata {i + 1}"
              onclick={() => { activeSlide = i; }}
            ></button>
          {/each}
        </div>
      </div>

      <!-- Key Benefits (Supercell Store Pattern standard) -->
      <div class="benefits-grid">
        <div class="benefit-item">
          <span class="benefit-icon">⚡</span>
          <div>
            <strong>Zero latenza all'avvio</strong>
            <p>100% pronto offline & caricamento istantaneo con cache shell dedicata.</p>
          </div>
        </div>

        <div class="benefit-item">
          <span class="benefit-icon">🔒</span>
          <div>
            <strong>Privacy totale & zero tracciamento</strong>
            <p>Nessun cookie pubblicitario o tracciatore invasivo. I tuoi pensieri svaniscono.</p>
          </div>
        </div>

        <div class="benefit-item">
          <span class="benefit-icon">📱</span>
          <div>
            <strong>Esperienza a schermo intero senza barre del browser</strong>
            <p>Interfaccia pura, pulita e immersiva senza barre degli indirizzi o elementi superflui.</p>
          </div>
        </div>

        <div class="benefit-item">
          <span class="benefit-icon">💾</span>
          <div>
            <strong>Zero megabyte scaricati da app store</strong>
            <p>Installazione istantanea direttamente dal browser, senza app store commerciali.</p>
          </div>
        </div>
      </div>

      <!-- OS Adaptation & Action Area -->
      <div class="install-action-area">
        {#if pwaStore.isStandalone}
          <div class="standalone-notice">
            <span class="notice-icon">✓</span>
            <div>
              <strong>Già installata in modalità standalone!</strong>
              <p>Stai già utilizzando Afterglow a schermo intero dalla schermata Home.</p>
            </div>
          </div>
        {:else if pwaStore.deferredPrompt}
          <button
            class="primary-install-btn"
            type="button"
            onclick={handleInstallClick}
            disabled={isInstalling}
          >
            <span class="btn-icon">📲</span>
            {isInstalling ? 'Apertura dialog di sistema…' : 'Installa Afterglow ora'}
          </button>
          {#if installResult}
            <p class="install-status">{installResult}</p>
          {/if}
        {:else if pwaStore.isIosSafari}
          <div class="ios-guide">
            <h4 class="ios-guide-title">Come installare su iPhone & iPad (Safari):</h4>
            <ol class="ios-steps">
              <li>
                <span class="step-num">1</span>
                <span>Tocca l'icona <strong>Condividi</strong> <span class="ios-icon" aria-label="Icona condividi">📤</span> nella barra in basso.</span>
              </li>
              <li>
                <span class="step-num">2</span>
                <span>Scorri verso l'alto e tocca <span class="ios-icon" aria-label="Icona aggiungi">➕</span> <strong>Aggiungi alla schermata Home</strong>.</span>
              </li>
              <li>
                <span class="step-num">3</span>
                <span>Tocca <strong>Aggiungi</strong> nell'angolo in alto a destra per confermare.</span>
              </li>
            </ol>
          </div>
        {:else}
          <div class="generic-guide">
            <p>
              Tocca il menu del tuo browser (<strong>⋮</strong> o <strong>Condividi</strong>) e seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a schermata Home"</strong> per avviare l'esperienza a schermo intero.
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
    background: rgba(17, 17, 16, 0.65);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-card {
    position: relative;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 28px 24px;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: transparent;
    border: 0;
    color: var(--muted);
    font-size: 16px;
    padding: 8px;
    cursor: pointer;
    border-radius: var(--radius-sm);
    line-height: 1;
    transition: color var(--transition-fast), background-color var(--transition-fast);
  }

  .modal-close:hover {
    color: var(--ink);
    background-color: var(--surface-2);
  }

  .modal-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .modal-icon {
    display: inline-block;
    font-size: 24px;
    color: var(--accent);
    margin-bottom: 8px;
  }

  .modal-header h2 {
    font-size: 22px;
    letter-spacing: -0.02em;
    margin: 0 0 6px;
    color: var(--ink);
  }

  .modal-subtitle {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.45;
    margin: 0;
  }

  /* Carousel */
  .carousel-container {
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 20px;
  }

  .carousel-viewport {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .carousel-nav-btn {
    background: var(--bg);
    border: 1px solid var(--line);
    color: var(--ink);
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .carousel-nav-btn:hover {
    border-color: var(--ink);
    transform: scale(1.05);
  }

  .carousel-slide {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1;
    min-width: 0;
  }

  .screenshot-frame {
    width: 140px;
    height: 240px;
    background: var(--bg);
    border: 2px solid var(--ink);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .screenshot-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .slide-caption h4 {
    margin: 0 0 4px;
    font-size: 14px;
    color: var(--ink);
    font-weight: 700;
  }

  .slide-caption p {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.35;
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
  }

  .carousel-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    border: 0;
    background: var(--line);
    cursor: pointer;
    transition: all var(--transition-fast);
    padding: 0;
  }

  .carousel-dot.active {
    background: var(--accent);
    width: 22px;
  }

  /* Benefits */
  .benefits-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 12px;
    background: var(--surface-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
  }

  .benefit-icon {
    font-size: 18px;
    line-height: 1.2;
    flex-shrink: 0;
  }

  .benefit-item strong {
    display: block;
    font-size: 13px;
    color: var(--ink);
    margin-bottom: 2px;
  }

  .benefit-item p {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.35;
  }

  /* Install Actions */
  .install-action-area {
    margin-top: 8px;
  }

  .primary-install-btn {
    width: 100%;
    padding: 14px 20px;
    background: var(--ink);
    color: var(--bg);
    border: 0;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: transform var(--transition-fast), opacity var(--transition-fast);
  }

  .primary-install-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    opacity: 0.92;
  }

  .primary-install-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 16px;
  }

  .install-status {
    text-align: center;
    font-size: 12px;
    color: var(--accent);
    margin: 8px 0 0;
  }

  .standalone-notice {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: var(--radius-sm);
  }

  .notice-icon {
    font-size: 18px;
    color: #16a34a;
    font-weight: bold;
  }

  .standalone-notice strong {
    display: block;
    font-size: 13px;
    color: var(--ink);
  }

  .standalone-notice p {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }

  /* iOS Guide */
  .ios-guide {
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
  }

  .ios-guide-title {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
  }

  .ios-steps {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ios-steps li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--ink);
  }

  .step-num {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    background: var(--ink);
    color: var(--bg);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: bold;
    flex-shrink: 0;
  }

  .ios-icon {
    font-size: 14px;
    display: inline-block;
    vertical-align: middle;
  }

  .generic-guide {
    text-align: center;
    font-size: 12px;
    color: var(--muted);
    padding: 8px;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
</style>
