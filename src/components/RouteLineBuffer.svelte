<script>
  import {
    routeLineBuffer as routeLineBufferStore,
    map as mapStore,
  } from '../stores';
  import { Checkbox, NumberInput, TextInput } from 'carbon-components-svelte';
  import { addRouteLine } from '../mapbox-gl-utils';
  import { ROUTE_LINE_LAYER_ID_PREFIX } from '../constants';

  let routeLineBuffer;
  let map;

  let checked;
  let padding;
  let layerNames;

  routeLineBufferStore.subscribe(value => {
    routeLineBuffer = value;
    console.log(routeLineBuffer);
    checked = routeLineBuffer.state;
    padding = routeLineBuffer.padding;
    layerNames = routeLineBuffer.layers;
  });

  mapStore.subscribe(value => (map = value));

  const addLayer = () => (layerNames = layerNames.concat(['']));

  const onInputLayerName = (value, index) => {
    layerNames[index] = value;
  };

  const onSubmit = () => {
    layerNames = layerNames.filter(v => {
      let valid = v !== '';
      valid = valid && !!map.getLayer(v);
      return valid;
    });
    routeLineBufferStore.set({ state: checked, padding, layers: layerNames });
  };
</script>

<div>
  <div class="container">
    <Checkbox labelText="Add a buffer to the route line" bind:checked />
    {#if checked}
      <NumberInput
        size="sm"
        label={'Padding (meters)'}
        value={padding}
        min={0}
        step={1}
        on:change={e => (padding = e.detail)}
      />
      {#each layerNames as layerId, i}
        <TextInput
          on:input={e => onInputLayerName(e.detail, i)}
          value={layerId}
        />
      {/each}
      <button class="primary-button" on:click={addLayer}
        >Add another layer id</button
      >
    {/if}
    <button class="primary-button" on:click={onSubmit}>Submit</button>
  </div>
</div>

<style>
  .primary-button {
    width: 240px;
    height: 36px;
  }

  .container {
    display: flex;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    width: 240px;
    margin-bottom: 12px;
  }
</style>
