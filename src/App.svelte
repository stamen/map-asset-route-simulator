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
  } from './stores';
  import { makeConfig } from './make-config';
  import { writeHash } from './query';
  import { DEFAULT_ROUTELINE_PROPERTIES } from './constants';

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

  let routeLine = null;
  routeLineLayerStore.subscribe(value => {
    const nextValue = { layout: value.layout, paint: value.paint };
    if (
      JSON.stringify(DEFAULT_ROUTELINE_PROPERTIES) !== JSON.stringify(nextValue)
    ) {
      routeLine = nextValue;
    } else {
      routeLine = null;
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
  // fullScreenLoadingStore.subscribe(value => (fullScreenLoading = value));

  $: {
    if (mapState || locations || routeLine || styleUrl) {
      writeHash({ locations, routeLine, styleUrl, deviceSize, ...mapState });
    }
  }
</script>

<svelte:head>
  <base href="process.env.BASE_PATH" />
</svelte:head>
<main>
  <ControlPanel />
  <DisplayArea />
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
