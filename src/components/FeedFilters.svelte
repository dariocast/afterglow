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
      class="filter-tab"
      class:active={activeFilter === filter.id}
      type="button"
      onclick={() => onFilterChange?.(filter.id)}
      aria-pressed={activeFilter === filter.id}
    >
      <span class="tab-label">{filter.label}</span>
    </button>
  {/each}
</div>

<style>
  .feed-filters {
    display: inline-flex;
    align-items: center;
    background: var(--surface-subtle);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 3px;
    gap: 3px;
  }

  .filter-tab {
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    padding: 6px 12px;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-radius: var(--radius-xs);
    transition: all var(--transition-fast);
  }

  .filter-tab:hover {
    color: var(--ink);
  }

  .filter-tab.active {
    background: var(--surface);
    color: var(--ink);
    border-color: var(--line-strong);
    box-shadow: var(--shadow-xs);
    font-weight: 600;
  }

  .tab-label {
    display: inline-block;
  }
</style>
