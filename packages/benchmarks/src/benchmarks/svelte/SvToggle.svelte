<script lang="ts">
  // AXIS `toggle` — Svelte's shown-or-hidden panel LIST. It used to be one panel behind an
  // `{#if}`; at that size the whole axis measured one timer tick for every participant, so the
  // panel became a LIST of panels and the hidden state became an EMPTY ARRAY. Same scenario —
  // build a subtree, throw it away, build it again with different data — at a size that
  // resolves. `toggle.tsx` carries the arithmetic.
  //
  // `{#each}` AND NOT `{#if}`: the empty array is the hidden state, so one block expresses both,
  // and a CONSTANT list inside an `{#if}` is exactly the shape a compiler may hoist — which
  // would make this participant fast for a reason unrelated to the scenario. The rows arrive
  // from outside.
  //
  // $state.raw, NOT $state: the harness replaces the whole array on every transition, so
  // reference-level reactivity is what's wanted. Plain $state would deep-proxy every row object
  // on each assignment — ~100× slower, and not what Svelte 4's `export let rows` did either.
  //
  // THE BUTTON KEEPS ITS LISTENER, the same treatment every other panel on this axis gets: it
  // does nothing, but attaching it is part of what a rebuild costs. Svelte 5 DELEGATES click —
  // it writes an expando and listens once at the root — so this is cheaper per panel than
  // Solid's or React's per-element `addEventListener`, in the same way Mikado's delegation is,
  // and it emits no attribute either way.
  type Row = { id: number; text: string };
  let { rows: initialRows = [] }: { rows?: Row[] } = $props();
  let rows = $state.raw<Row[]>(initialRows);
  const noop = () => {};
  export function setRows(next: Row[]) { rows = next; }
</script>
<div>{#each rows as r (r.id)}<div class="panel"><h4>Panel</h4><p>{r.text}</p><button onclick={noop}>x</button></div>{/each}</div>
