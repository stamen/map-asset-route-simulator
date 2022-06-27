<script>
  import {
    routeLineLayer as routeLineLayerStore,
    map as mapStore,
  } from '../stores';
  import RouteLineEditor from './RouteLineEditor.svelte';
  import { Dropdown } from 'carbon-components-svelte';
  import { addRouteLine } from '../mapbox-gl-utils';
  import { ROUTE_LINE_LAYER_ID_PREFIX } from '../constants';

  let selectedId = '0';
  let activeLayer;

  let routeLineLayers;

  routeLineLayerStore.subscribe(value => {
    routeLineLayers = value;
  });

  let map;

  mapStore.subscribe(value => (map = value));

  const handleSetRouteLine = e => {
    const { index, layer } = e.detail;
    routeLineLayerStore.update(value => {
      value.splice(index, 1, layer);
      return value;
    });
  };

  const routeLineDropdownOptions = [
    {
      id: '0',
      text: 'Route line',
    },
    {
      id: '1',
      text: 'Route line casing',
    },
  ];

  const handleRouteLineEditorChange = e => {
    selectedId = e.detail.selectedId;
  };

  $: if (selectedId) {
    activeLayer = routeLineLayers[Number(selectedId)];
  }

  const createRouteLine = () => {
    routeLineLayerStore.update(value => {
      let nextLayer = value[value.length - 1];
      nextLayer = {
        ...nextLayer,
        id: `${ROUTE_LINE_LAYER_ID_PREFIX}_${selectedId}`,
      };
      value.splice(Number(selectedId), 0, nextLayer);
      return value;
    });
    addRouteLine(map);
  };
</script>

<div>
  <div class="dropdown-container">
    <Dropdown
      titleText="Route line layers"
      {selectedId}
      items={routeLineDropdownOptions}
      on:select={handleRouteLineEditorChange}
    />
  </div>
  {#if activeLayer}
    <RouteLineEditor
      routeLineLayer={activeLayer}
      index={Number(selectedId)}
      on:setRouteLine={handleSetRouteLine}
    />
  {:else}
    <button class="primary-button" on:click={createRouteLine}
      >Add a {routeLineDropdownOptions
        .find(item => item.id === selectedId)
        ?.text.toLowerCase()}</button
    >
  {/if}
</div>

<style>
  .primary-button {
    width: 240px;
    height: 36px;
  }

  .dropdown-container {
    margin-bottom: 12px;
  }
</style>
