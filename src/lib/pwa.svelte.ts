class PwaStore {
  deferredPrompt = $state<any>(null);
  isStandalone = $state<boolean>(false);
  isIosSafari = $state<boolean>(false);
  canInstall = $state<boolean>(false);
  isDismissed = $state<boolean>(false);
  isModalOpen = $state<boolean>(false);

  private initialized = false;

  constructor() {
    this.checkEnvironment();
  }

  checkEnvironment() {
    if (typeof window === 'undefined') return;

    // Check standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    this.isStandalone = isStandaloneMode;

    // Check iOS Safari
    const ua = window.navigator.userAgent;
    const isIos =
      /iPhone|iPad|iPod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isWebkit = /WebKit/i.test(ua);
    const isOtherBrowser = /CriOS|FxiOS|OPiOS|mercury|EdgiOS/i.test(ua) || /Chrome/i.test(ua);
    this.isIosSafari = isIos && isWebkit && !isOtherBrowser && !isStandaloneMode;

    // If iOS Safari and not standalone, user can install via Add to Home Screen guide
    if (this.isIosSafari && !this.isStandalone) {
      this.canInstall = true;
    }

    // Check dismiss state from localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        this.isDismissed = localStorage.getItem('afterglow.pwa_dismissed') === 'true';
      } catch {
        this.isDismissed = false;
      }
    }
  }

  init() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    this.checkEnvironment();

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.setInstallPrompt(e);
    });

    // Listen for appinstalled
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall = false;
      this.isStandalone = true;
      this.isModalOpen = false;
      console.log('Afterglow PWA was installed successfully');
    });

    // Monitor display-mode changes
    try {
      const matchMediaStandalone = window.matchMedia('(display-mode: standalone)');
      matchMediaStandalone.addEventListener('change', (e) => {
        this.isStandalone = e.matches;
        if (e.matches) {
          this.canInstall = false;
          this.isModalOpen = false;
        }
      });
    } catch {
      // media query listener unsupported
    }
  }

  setInstallPrompt(e: any) {
    this.deferredPrompt = e;
    this.canInstall = true;
  }

  async promptInstall(): Promise<string> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.canInstall = false;
      return choice?.outcome || 'dismissed';
    } catch (err) {
      console.error('Error triggering PWA install prompt:', err);
      return 'error';
    }
  }

  openInstallModal() {
    this.isModalOpen = true;
  }

  closeInstallModal() {
    this.isModalOpen = false;
  }

  dismissBanner() {
    this.isDismissed = true;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('afterglow.pwa_dismissed', 'true');
      } catch {
        // ignore storage errors
      }
    }
  }

  reset() {
    this.deferredPrompt = null;
    this.isStandalone = false;
    this.isIosSafari = false;
    this.canInstall = false;
    this.isDismissed = false;
    this.isModalOpen = false;
    this.initialized = false;
  }
}

export const pwaStore = new PwaStore();
