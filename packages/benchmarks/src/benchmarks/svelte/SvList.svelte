<script lang="ts">
  // Svelte 5 (runes). The list is internal $state advanced through an exported
  // setter, so the harness can push a new array without going through props —
  // the same shape the other frameworks' adapters use.
  // $state.raw, NOT $state: the harness replaces the whole array on every op, so
  // reference-level reactivity is what's wanted. Plain $state would deep-proxy all
  // 300 row objects on each assignment — ~100× slower, and not what Svelte 4's
  // `export let rows` did either.
  type Row = { id: number; text: string };
  let { rows: initialRows = [] }: { rows?: Row[] } = $props();
  let rows = $state.raw<Row[]>(initialRows);
  export function setRows(next: Row[]) { rows = next; }
</script>
<ul>{#each rows as r (r.id)}<li>{r.text}</li>{/each}</ul>
