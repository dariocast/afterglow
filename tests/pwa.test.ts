import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render } from 'svelte/server';

// Ensure localStorage mock is available in Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: 0,
  } as any;
}

describe('PWA Manifest & Supercell Store Pattern Contract', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');

  it('verifies public/manifest.webmanifest exists and is valid JSON', () => {
    expect(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in public/').toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);
    expect(manifest).toBeDefined();
  });

  it('conforms to Chromium Richer Install UI and PWA standards', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Identity and description
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.description).toBeTruthy();
    expect(manifest.description.length).toBeGreaterThan(20);

    // Categories
    expect(Array.isArray(manifest.categories)).toBe(true);
    expect(manifest.categories).toContain('social');

    // Display and display_override
    expect(manifest.display).toBe('standalone');
    expect(Array.isArray(manifest.display_override)).toBe(true);
    expect(manifest.display_override).toContain('window-controls-overlay');
    expect(manifest.display_override).toContain('standalone');
    expect(manifest.display_override).toContain('minimal-ui');

    // Icons
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const has192Any = manifest.icons.some(
      (icon: any) => icon.sizes === '192x192' && (icon.purpose === 'any' || icon.purpose?.includes('any'))
    );
    const has192Maskable = manifest.icons.some(
      (icon: any) => icon.sizes === '192x192' && icon.purpose?.includes('maskable')
    );
    const has512Any = manifest.icons.some(
      (icon: any) => icon.sizes === '512x512' && (icon.purpose === 'any' || icon.purpose?.includes('any'))
    );
    const has512Maskable = manifest.icons.some(
      (icon: any) => icon.sizes === '512x512' && icon.purpose?.includes('maskable')
    );

    expect(has192Any, 'Must provide 192x192 icon with purpose any').toBe(true);
    expect(has192Maskable, 'Must provide 192x192 icon with purpose maskable').toBe(true);
    expect(has512Any, 'Must provide 512x512 icon with purpose any').toBe(true);
    expect(has512Maskable, 'Must provide 512x512 icon with purpose maskable').toBe(true);

    // Verify all icon files exist on disk
    for (const icon of manifest.icons) {
      const iconFilePath = path.resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconFilePath), `Icon file ${icon.src} must exist on disk`).toBe(true);
    }

    // Screenshots: Richer Install UI requires at least 3 narrow and at least 1 wide screenshot
    expect(Array.isArray(manifest.screenshots)).toBe(true);
    const narrowScreenshots = manifest.screenshots.filter((s: any) => s.form_factor === 'narrow');
    const wideScreenshots = manifest.screenshots.filter((s: any) => s.form_factor === 'wide');

    expect(narrowScreenshots.length, 'Must have at least 3 narrow screenshots for mobile').toBeGreaterThanOrEqual(3);
    expect(wideScreenshots.length, 'Must have at least 1 wide screenshot for desktop').toBeGreaterThanOrEqual(1);

    for (const screenshot of manifest.screenshots) {
      expect(screenshot.src).toBeTruthy();
      expect(screenshot.sizes).toBeTruthy();
      expect(screenshot.type).toBe('image/png');
      expect(screenshot.label).toBeTruthy();

      const screenshotFilePath = path.resolve(process.cwd(), 'public', screenshot.src.replace(/^\//, ''));
      expect(fs.existsSync(screenshotFilePath), `Screenshot file ${screenshot.src} must exist on disk`).toBe(true);
    }

    // Shortcuts
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(1);
  });

  it('verifies public/sw.js exists and contains cache lifecycle', () => {
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    expect(fs.existsSync(swPath), 'public/sw.js service worker file must exist').toBe(true);
    const content = fs.readFileSync(swPath, 'utf-8');
    expect(content).toContain('install');
    expect(content).toContain('activate');
    expect(content).toContain('fetch');
  });
});

describe('pwaStore (Svelte 5 runes)', async () => {
  let pwaStoreModule: any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    pwaStoreModule = await import('../src/lib/pwa.svelte');
    pwaStoreModule.pwaStore.reset();
  });

  it('initializes with default state', () => {
    const { pwaStore } = pwaStoreModule;
    expect(pwaStore.isModalOpen).toBe(false);
    expect(pwaStore.isDismissed).toBe(false);
  });

  it('manages modal open and close states', () => {
    const { pwaStore } = pwaStoreModule;
    pwaStore.openInstallModal();
    expect(pwaStore.isModalOpen).toBe(true);

    pwaStore.closeInstallModal();
    expect(pwaStore.isModalOpen).toBe(false);
  });

  it('persists dismissed state to localStorage', () => {
    const { pwaStore } = pwaStoreModule;
    pwaStore.dismissBanner();
    expect(pwaStore.isDismissed).toBe(true);
    expect(localStorage.getItem('afterglow.pwa_dismissed')).toBe('true');
  });

  it('handles beforeinstallprompt and install trigger', async () => {
    const { pwaStore } = pwaStoreModule;
    const promptMock = vi.fn().mockResolvedValue({ outcome: 'accepted' });
    const fakeEvent = {
      preventDefault: vi.fn(),
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    pwaStore.setInstallPrompt(fakeEvent);
    expect(pwaStore.canInstall).toBe(true);

    const outcome = await pwaStore.promptInstall();
    expect(promptMock).toHaveBeenCalled();
    expect(outcome).toBe('accepted');
    expect(pwaStore.canInstall).toBe(false);
  });
});

describe('PwaInstallModal.svelte', async () => {
  it('renders modal with Supercell Store Pattern key benefits and carousel', async () => {
    const PwaInstallModal = (await import('../src/components/PwaInstallModal.svelte')).default;
    const { html } = render(PwaInstallModal, {
      props: {
        isOpen: true,
      },
    });

    // Check key benefits
    expect(html).toContain('Zero latenza');
    expect(html).toContain('Privacy totale');
    expect(html).toContain('schermo intero');
    expect(html).toContain('Zero megabyte');

    // Check interactive carousel indicators/controls
    expect(html).toContain('carousel');
    expect(html).toContain('dot');
  });
});
