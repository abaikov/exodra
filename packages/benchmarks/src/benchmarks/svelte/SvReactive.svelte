<svelte:options accessors />
<script lang="ts">
  export let values: string[] = [];
  export function setValues(next: string[]) { values = next; }
</script>
<div>{#each values as v, i (i)}<span>{v}</span>{/each}</div>
