<script lang="ts">
  import type { FeedFilter } from '../lib/api';

  interface Props {
    activeFilter?: FeedFilter;
    onFilterChange?: (filter: FeedFilter) => void;
  }

  let {
    activeFilter = 'all',
    onFilterChange,
  }: Props = $props();

  const filters: { id: FeedFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'ending', label: 'Ending soon' },
    { id: 'mine', label: 'Yours' },
  ];
</script>

<div class="feed-filters" role="group" aria-label="Feed filters">
  {#each filters as filter (filter.id)}
    <button
      class="filter"
      class:active={activeFilter === filter.id}
      type="button"
      onclick={() => onFilterChange?.(filter.id)}
      aria-pressed={activeFilter === filter.id}
    >
      {filter.label}
    </button>
  {/each}
</div>

<style>
  .feed-filters {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .filter {
    border: 0;
    background: none;
    color: var(--muted);
    padding: 8px 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    position: relative;
    transition: color var(--transition-fast);
  }

  .filter:hover {
    color: var(--ink);
  }

  .filter.active {
    color: var(--ink);
  }

  .filter.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent);
  }
</style>
