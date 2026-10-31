<script lang="ts">
  // Svelte 4 drove this through `inst.$set({ rows })`, which runes removed; the
  // equivalent is an exported setter writing to internal $state.
  // $state.raw — the whole array is replaced per op; see SvList for why.
  let { rows: initialRows = [] }: { rows?: number[] } = $props();
  let rows = $state.raw<number[]>(initialRows);
  export function setRows(next: number[]) { rows = next; }
</script>

<ul>
  {#each rows as id (id)}<li class="row">#{id}</li>{/each}
</ul>
