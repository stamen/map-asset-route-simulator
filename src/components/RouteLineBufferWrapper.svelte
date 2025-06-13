<script>
  import RouteLineBuffer from './RouteLineBuffer.svelte';
  import {
    mapStyle as mapStyleStore,
    map as mapStore,
    route as routeStore,
  } from '../stores';

  let mapStyle;
  let routeLineBuffers = [];

  let directionsApiResponse;
  routeStore.subscribe(value => ({ response: directionsApiResponse } = value));

  mapStyleStore.subscribe(value => {
    mapStyle = value;
    routeLineBuffers = mapStyle?.routeLineBuffer;
  });
</script>

<div class="RouteLineBufferWrapper">
  {#each routeLineBuffers as routeLineBuffer, index}
    <RouteLineBuffer {routeLineBuffer} {directionsApiResponse} {index} />
  {/each}
</div>

<style>
</style>
