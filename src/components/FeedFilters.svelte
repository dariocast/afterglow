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
    { id: 'following', label: 'Following' },
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
    gap: 18px;
  }

  .filter-tab {
    border: none;
    background: transparent;
    color: var(--muted);
    padding: 6px 0;
    font-size: 13px;
    font-weight: 500;
    position: relative;
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .filter-tab:hover {
    color: var(--ink);
  }

  .filter-tab.active {
    color: var(--ink);
    font-weight: 600;
  }

  .filter-tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1.5px;
    background: var(--ink);
  }

  .tab-label {
    display: inline-block;
  }
</style>
