<script lang="ts">
  interface Props {
    name:
      | 'spark'
      | 'sun'
      | 'moon'
      | 'key'
      | 'fingerprint'
      | 'heart'
      | 'bubble'
      | 'clock'
      | 'trash'
      | 'close'
      | 'arrow-up-right'
      | 'share'
      | 'device'
      | 'shield'
      | 'bolt'
      | 'box'
      | 'ios-share'
      | 'ios-plus'
      | 'check'
      | 'chevron-left'
      | 'chevron-right';
    size?: number;
    strokeWidth?: number;
    class?: string;
  }

  let {
    name,
    size = 18,
    strokeWidth = 1.75,
    class: className = '',
  }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="icon icon-{name} {className}"
  aria-hidden="true"
  focusable="false"
>
  {#if name === 'spark'}
    <path d="M12 2v20M2 12h20M6 6l12 12M6 18L18 6" stroke-width="1.25" opacity="0.3" />
    <path d="M12 3c0 4.5 4.5 9 9 9-4.5 0-9 4.5-9 9 0-4.5-4.5-9-9-9 4.5 0 9-4.5 9-9z" fill="currentColor" stroke="none" />
  {:else if name === 'sun'}
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  {:else if name === 'moon'}
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  {:else if name === 'key'}
    <path d="m21 2-2 2m-1.5 1.5L14 9l-2-2-5 5a5 5 0 1 0 7 7l5-5-2-2 3.5-3.5Z" />
    <circle cx="7.5" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
  {:else if name === 'fingerprint'}
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M2 16h.01M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
    <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    <path d="M17.5 18a8.5 8.5 0 0 0 .5-3" />
    <path d="M12 2a10 10 0 0 0-6.88 2.77" />
    <path d="M18.78 4.77A10 10 0 0 1 22 12" />
  {:else if name === 'heart'}
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  {:else if name === 'bubble'}
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  {:else if name === 'clock'}
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  {:else if name === 'trash'}
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  {:else if name === 'close'}
    <path d="M18 6 6 18M6 6l12 12" />
  {:else if name === 'arrow-up-right'}
    <path d="M7 17 17 7M7 7h10v10" />
  {:else if name === 'share'}
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  {:else if name === 'device'}
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" stroke-width="2.5" />
  {:else if name === 'shield'}
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  {:else if name === 'bolt'}
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  {:else if name === 'box'}
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  {:else if name === 'ios-share'}
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  {:else if name === 'ios-plus'}
    <rect width="18" height="18" x="3" y="3" rx="4" />
    <path d="M12 8v8M8 12h8" />
  {:else if name === 'check'}
    <polyline points="20 6 9 17 4 12" />
  {:else if name === 'chevron-left'}
    <path d="m15 18-6-6 6-6" />
  {:else if name === 'chevron-right'}
    <path d="m9 18 6-6-6-6" />
  {/if}
</svg>

<style>
  .icon {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style>
