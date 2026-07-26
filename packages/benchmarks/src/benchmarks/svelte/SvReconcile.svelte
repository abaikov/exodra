<script lang="ts">
  export let rows: number[] = [];
</script>

<ul>
  {#each rows as id (id)}<li class="row">#{id}</li>{/each}
</ul>
