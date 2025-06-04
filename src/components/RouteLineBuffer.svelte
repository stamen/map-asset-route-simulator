<script>
  import { mapStyle as mapStyleStore, map as mapStore } from '../stores';
  import { Checkbox, NumberInput, TextInput } from 'carbon-components-svelte';

  let routeLineBuffer;
  let mapStyle;
  let map;

  let checked;
  let padding;
  let layerNames;

  mapStore.subscribe(v => (map = v));
  mapStyleStore.subscribe(value => {
    mapStyle = value;
    routeLineBuffer = mapStyle?.routeLineBuffer;
    checked = routeLineBuffer?.state;
    padding = routeLineBuffer?.padding;
    layerNames = routeLineBuffer?.layers;
  });

  $: if (!!checked && !layerNames && padding === undefined) {
    layerNames = [''];
    padding = 0;
  }

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
    mapStyleStore.update(v => {
      const next = { ...v };
      next.routeLineBuffer = { state: checked, padding, layers: layerNames };
      return next;
    });
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
