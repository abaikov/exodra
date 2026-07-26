<svelte:options accessors />
<script lang="ts">
  export let on = false;
  export function setOn(v: boolean) { on = v; }
</script>
<div>
  {#if on}
    <div class="panel"><h4>Panel</h4><p>body</p><button>x</button></div>
  {/if}
</div>
