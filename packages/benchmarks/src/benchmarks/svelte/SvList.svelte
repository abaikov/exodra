<svelte:options accessors />
<script lang="ts">
  export let rows: { id: number; text: string }[] = [];
  export function setRows(next: { id: number; text: string }[]) { rows = next; }
</script>
<ul>{#each rows as r (r.id)}<li>{r.text}</li>{/each}</ul>
