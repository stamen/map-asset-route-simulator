<script>
  import DisplayArea from './components/DisplayArea.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import Loader from './components/Loader.svelte';
  import {
    config as configStore,
    route as routeStore,
    mapState as mapStateStore,
    routeLineLayer as routeLineLayerStore,
    mapStyle as mapStyleStore,
    fullScreenLoading as fullScreenLoadingStore,
    deviceSize as deviceSizeStore,
    map as mapStore,
  } from './stores';
  import { makeConfig } from './make-config';
  import { writeHash } from './query';
  import {
    DEFAULT_ROUTELINE_PROPERTIES,
    PUCK,
    DESTINATION_PIN,
  } from './constants';
  import { removeMarkerLayer } from './mapbox-gl-utils';

  export let localConfig;
  const config = makeConfig(localConfig);
  configStore.set(config);

  let mapState;
  mapStateStore.subscribe(value => {
    if (value && Object.keys(value).length) {
      mapState = value;
    } else {
      mapStateStore.set(config.mapState);
    }
  });

  let locations = null;
  routeStore.subscribe(value => {
    const { locations: storeLocations } = value;
    locations =
      storeLocations && storeLocations.every(l => l.center !== null)
        ? storeLocations
        : null;
  });

  let routeLines = null;
  routeLineLayerStore.subscribe(value => {
    const nextValue = value.map(layer => ({
      layout: layer.layout,
      paint: layer.paint,
    }));

    const defaults = value.map(() => DEFAULT_ROUTELINE_PROPERTIES);

    if (JSON.stringify(defaults) !== JSON.stringify(nextValue)) {
      routeLines = nextValue;
    } else {
      routeLines = null;
    }
  });

  let styleUrl = null;
  mapStyleStore.subscribe(value => {
    styleUrl = value !== '' ? value : null;
  });

  let deviceSize = null;
  deviceSizeStore.subscribe(value => {
    deviceSize = value ?? null;
  });

  let fullScreenLoading = { loading: false };
  fullScreenLoadingStore.subscribe(value => (fullScreenLoading = value));

  $: {
    if (mapState || locations || routeLines || styleUrl) {
      writeHash({ locations, routeLines, styleUrl, deviceSize, ...mapState });
    }
  }

  let map;
  mapStore.subscribe(value => (map = value));

  let routeFlag = false;

  const setRouteFlag = value => {
    routeFlag = value;
    if (map && !routeFlag) {
      // For now remove map assets on move
      map.once('move', () => {
        if (map.getLayer(DESTINATION_PIN)) {
          removeMarkerLayer(map, DESTINATION_PIN);
        }
        if (map.getLayer(PUCK)) {
          removeMarkerLayer(map, PUCK);
        }
      });
    }
  };
</script>

<svelte:head>
  <base href="process.env.BASE_PATH" />
</svelte:head>
<main>
  <ControlPanel {setRouteFlag} {routeFlag} />
  <DisplayArea {routeFlag} />
  {#if fullScreenLoading.loading}
    <Loader helperText={fullScreenLoading.helperText || null} />
  {/if}
</main>

<style>
  main {
    display: flex;
    height: 100%;
  }
</style>
