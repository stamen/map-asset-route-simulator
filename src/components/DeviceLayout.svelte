<script>
  import MapView from './MapView.svelte';

  export let height;
  export let width;
</script>

<div class="layout" style={`height:${height}px; width:${width}px`}>
  <MapView />
</div>

<style>
  .layout {
    display: flex;
  }
</style>
