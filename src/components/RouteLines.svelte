<script>
  import { routeLineLayer as routeLineLayerStore } from '../stores';
  import RouteLineEditor from './RouteLineEditor.svelte';

  let routeLineLayers;

  routeLineLayerStore.subscribe(value => {
    routeLineLayers = value;
  });

  const handleSetRouteLine = e => {
    const { index, layer } = e.detail;
    routeLineLayerStore.update(value => {
      value.splice(index, 1, layer);
      return value;
    });
  };
</script>

<div>
  {#each routeLineLayers as routeLineLayer, i}
    <RouteLineEditor
      {routeLineLayer}
      index={i}
      on:setRouteLine={handleSetRouteLine}
    />
  {/each}
</div>

<style>
</style>
