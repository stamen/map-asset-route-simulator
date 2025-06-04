<script>
  import { mapStyle as mapStyleStore, map as mapStore } from '../stores';
  import { Checkbox, NumberInput, TextInput } from 'carbon-components-svelte';
  import { faTrash } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa/src/fa.svelte';

  let routeLineBuffer;
  let mapStyle;
  let map;

  let checked;
  let padding;
  let layerNames;

  $: isUnsaved =
    !!routeLineBuffer &&
    !Object.entries(routeLineBuffer).every(([k, v]) => {
      let same = false;

      if (k === 'state') {
        same = v === checked;
      }
      if (k === 'padding') {
        same = v === padding;
      }
      if (k === 'layers') {
        same =
          v.every(l => layerNames.includes(l)) &&
          layerNames.every(l => v.includes(l));
      }

      return same;
    });

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

  const removeLayer = index => {
    layerNames = layerNames.filter((l, i) => i !== index);
  };

  const onInputLayerName = (value, index) => {
    layerNames[index] = value;
  };

  const onSubmit = () => {
    layerNames = layerNames.filter(v => {
      let valid = v !== '';
      const layer = map.getLayer(v);
      valid = valid && !!layer && layer.type === 'symbol';
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
        <div class="text-input-container">
          <TextInput
            on:input={e => onInputLayerName(e.detail, i)}
            value={layerId}
          />
          <button class="action-button" on:click={() => removeLayer(i)}
            ><Fa icon={faTrash} /></button
          >
        </div>
      {/each}
      <button class="primary-button" on:click={addLayer}
        >Add another layer id</button
      >
    {/if}
    <button class="primary-button" on:click={onSubmit}
      >{#if isUnsaved}
        <div class="unsaved" />
      {/if}Submit</button
    >
  </div>
</div>

<style>
  .unsaved {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: red;
  }

  .primary-button {
    width: 240px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .container {
    display: flex;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    width: 240px;
    margin-bottom: 12px;
  }

  .text-input-container {
    display: flex;
    align-items: center;
  }

  .action-button {
    padding: 6px;
    margin-left: 3px;
  }
</style>
