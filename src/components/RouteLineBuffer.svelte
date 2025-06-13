<script>
  import { mapStyle as mapStyleStore, map as mapStore } from '../stores';
  import { Checkbox, NumberInput, TextInput } from 'carbon-components-svelte';
  import { faTrash } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa/src/fa.svelte';
  import * as turf from '@turf/turf';
  import { Dropdown } from 'carbon-components-svelte';

  export let routeLineBuffer;
  export let directionsApiResponse;
  export let index;

  let map;

  let checked;
  let padding;
  let layerNames;
  let includeExclude = 'include';

  let focusedPadding = false;

  $: isUnsaved = !!routeLineBuffer
    ? !Object.entries(routeLineBuffer).every(([k, v]) => {
        let same = false;

        if (k === 'type') {
          same = v === includeExclude;
        }
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
      })
    : !!checked;

  let buffer;

  $: if (checked && padding !== undefined && directionsApiResponse) {
    const { coordinates } = directionsApiResponse;

    const highResGeom = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates,
      },
    };

    buffer = turf.buffer(highResGeom, padding, {
      units: 'meters',
    });
  }

  mapStore.subscribe(v => (map = v));

  $: if (routeLineBuffer) {
    checked = routeLineBuffer?.state;
    padding = routeLineBuffer?.padding;
    layerNames = routeLineBuffer?.layers;
  }

  $: if (!!checked && !layerNames && padding === undefined) {
    layerNames = [''];
    padding = 10;
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

      next.routeLineBuffer = next.routeLineBuffer.map((v, i) =>
        i === index
          ? {
              state: checked,
              padding,
              layers: layerNames,
              type: includeExclude,
            }
          : v
      );

      return next;
    });
  };

  // Visualizer!
  const onFocus = () => {
    if (!buffer) return;
    focusedPadding = true;
    // buffer visualizing when focused
    map.addSource('BUFFER_VISUALIZER', { type: 'geojson', data: buffer });

    map.addLayer({
      id: 'BUFFER_VISUALIZER_FILL',
      type: 'fill',
      source: 'BUFFER_VISUALIZER',
      layout: {},
      paint: {
        'fill-color': 'cyan',
        'fill-opacity': 0.3,
      },
    });

    map.addLayer({
      id: 'BUFFER_VISUALIZER_OUTLINE',
      type: 'line',
      source: 'BUFFER_VISUALIZER',
      layout: {},
      paint: {
        'line-color': 'cyan',
        'line-width': 2,
      },
    });
  };

  const onBlur = () => {
    focusedPadding = false;
    // buffer visualizing when focused
    map.removeLayer('BUFFER_VISUALIZER_FILL');
    map.removeLayer('BUFFER_VISUALIZER_OUTLINE');
    map.removeSource('BUFFER_VISUALIZER');
  };

  const updateVisualizer = () => {
    if (!map.getSource('BUFFER_VISUALIZER')) return;
    map.getSource('BUFFER_VISUALIZER').setData(buffer);
  };

  $: if (focusedPadding && buffer) {
    updateVisualizer();
  }
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
        on:input={e => (padding = e.detail)}
        on:focus={onFocus}
        on:blur={onBlur}
      />
      <Dropdown
        titleText="Include/exclude"
        selectedId={includeExclude}
        items={[
          { id: 'include', text: 'Include' },
          { id: 'exclude', text: 'Exclude' },
        ]}
        on:select={e => (includeExclude = e.detail.selectedId)}
      />
      {#each layerNames as layerId, i}
        <div class="text-input-container">
          <TextInput
            labelText={i === 0 ? "Layer ID's" : null}
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
    align-items: end;
  }

  .action-button {
    padding: 6px;
    margin-left: 3px;
  }

  :global(.bx--text-input__field-wrapper input) {
    height: 32px;
  }
</style>
