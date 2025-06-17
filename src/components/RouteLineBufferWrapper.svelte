<script>
  import RouteLineBuffer from './RouteLineBuffer.svelte';
  import {
    mapStyle as mapStyleStore,
    route as routeStore,
    map as mapStore,
  } from '../stores';

  let mounted = false;
  let isUnsaved = false;
  let tempRoutelineBuffers = [];

  let map;
  mapStore.subscribe(v => (map = v));

  let directionsApiResponse;
  routeStore.subscribe(value => ({ response: directionsApiResponse } = value));

  let mapStyle;
  let routeLineBuffers = [];
  mapStyleStore.subscribe(value => {
    mapStyle = value;
    routeLineBuffers = mapStyle?.routeLineBuffer ?? [];
  });

  $: if (routeLineBuffers) {
    tempRoutelineBuffers = routeLineBuffers;
  }

  $: if (!mounted && tempRoutelineBuffers.length && map && mapStyle) {
    if (map.isStyleLoaded()) {
      onSubmit();
    } else {
      map.on('style.load', () => {
        onSubmit();
      });
    }
    mounted = true;
  }

  const onAddBuffer = () => {
    const blankBuffer = {
      padding: 10,
      layers: [],
      type: 'include',
    };
    const prevState = [...tempRoutelineBuffers].concat([blankBuffer]);
    tempRoutelineBuffers = routeLineBuffers.concat([blankBuffer]);
    onSubmit();
    tempRoutelineBuffers = prevState;
  };

  const onRemoveBuffer = bufferIndex => {
    const prevState = [...tempRoutelineBuffers].filter(
      (v, i) => i !== bufferIndex
    );
    tempRoutelineBuffers = routeLineBuffers.filter((v, i) => i !== bufferIndex);
    onSubmit();
    tempRoutelineBuffers = prevState;
  };

  const onChange = (buffer, bufferIndex) => {
    tempRoutelineBuffers = tempRoutelineBuffers.map((b, i) =>
      i === bufferIndex ? buffer : b
    );
  };

  const onSubmit = () => {
    tempRoutelineBuffers = tempRoutelineBuffers.map(buffer => {
      let { layers } = buffer;
      layers = layers.filter(v => {
        let valid = v !== '';
        const layer = map.getLayer(v);
        valid = valid && !!layer && layer.type === 'symbol';
        return valid;
      });
      const nextBuffer = { ...buffer, layers };
      delete nextBuffer.isUnsaved;
      return nextBuffer;
    });

    mapStyleStore.update(v => {
      const next = { ...v };
      next.routeLineBuffer = tempRoutelineBuffers;
      return next;
    });
  };

  $: {
    isUnsaved = tempRoutelineBuffers.some(v => v?.isUnsaved);
  }
</script>

<div class="RouteLineBufferWrapper">
  {#if routeLineBuffers}
    {#each routeLineBuffers as routeLineBuffer, index}
      <RouteLineBuffer
        {routeLineBuffer}
        {directionsApiResponse}
        {index}
        {onChange}
        removeBuffer={onRemoveBuffer}
      />
    {/each}
    <button class="primary-button" on:click={onSubmit}
      >{#if isUnsaved}
        <div class="unsaved" />
      {/if}Submit</button
    >
  {/if}
  <button class="primary-button" on:click={onAddBuffer}
    >Add another buffer</button
  >
</div>

<style>
  .RouteLineBufferWrapper {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .primary-button {
    width: 240px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .unsaved {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: red;
  }
</style>
