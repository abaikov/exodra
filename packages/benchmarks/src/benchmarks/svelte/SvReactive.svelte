<script lang="ts">
  // $state.raw — the whole array is replaced per sweep; see SvList for why.
  let { values: initialValues = [] }: { values?: string[] } = $props();
  let values = $state.raw<string[]>(initialValues);
  export function setValues(next: string[]) { values = next; }
</script>
<div>{#each values as v, i (i)}<span>{v}</span>{/each}</div>
