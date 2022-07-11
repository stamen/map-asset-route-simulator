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
  import { readHash, writeHash } from './query';
  import {
    DEFAULT_ROUTELINE_PROPERTIES,
    PUCK,
    DESTINATION_PIN,
  } from './constants';
  import { removeMarkerLayer } from './mapbox-gl-utils';

  export let localConfig;
  const initialConfig = makeConfig(localConfig);

  // Special handling to persist camera behavior (routing options) in URL
  // Default behavior is configured in the local.js file, but behavior can be changed
  const setConfigCameraOptionsFromHash = config => {
    let nextConfig = { ...config };

    const hashObj = readHash(window.location.hash);

    let hashRoutingOptions = {
      durationMultiplier: hashObj?.durationMultiplier,
      routingOptions: hashObj?.routingOptions,
      speedOptions: hashObj?.speedOptions,
      maneuverOptions: hashObj?.maneuverOptions,
    };

    for (const k in hashRoutingOptions) {
      if (!hashRoutingOptions[k]) continue;
      if (!Object.keys(hashRoutingOptions[k]).length && nextConfig[k]) {
        delete nextConfig[k];
      } else {
        nextConfig[k] = hashRoutingOptions[k];
      }
    }
    return nextConfig;
  };

  configStore.set(
    JSON.parse(JSON.stringify(setConfigCameraOptionsFromHash(initialConfig)))
  );

  let mapState;
  mapStateStore.subscribe(value => {
    if (value && Object.keys(value).length) {
      mapState = value;
    } else {
      mapStateStore.set(initialConfig.mapState);
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

  let durationMultiplier = null;
  let routingOptions = null;
  let speedOptions = null;
  let maneuverOptions = null;

  configStore.subscribe(value => {
    durationMultiplier = null;
    routingOptions = null;
    speedOptions = null;
    maneuverOptions = null;

    if (value === undefined) return;

    const objsAreEqual = (obj1, obj2) => {
      const obj1Keys = typeof obj1 === 'object' ? Object.keys(obj1) : [];
      const obj2Keys = typeof obj2 === 'object' ? Object.keys(obj2) : [];
      const keys = [...new Set(obj1Keys.concat(obj2Keys))];
      return keys.every(k => {
        if (typeof obj1?.[k] === 'object' || typeof obj2?.[k] === 'object') {
          return objsAreEqual(obj1?.[k], obj2?.[k]);
        }
        return obj1?.[k] === obj2?.[k];
      });
    };

    const doSetJsonValue = key => {
      const storeValue = value[key];
      if (!storeValue && !initialConfig[key]) return false;
      if (!storeValue && initialConfig[key]) return true;
      const isLocalConfig = objsAreEqual(storeValue, initialConfig[key]);
      return !isLocalConfig;
    };

    if (
      value.durationMultiplier &&
      initialConfig.durationMultiplier !== value.durationMultiplier
    ) {
      durationMultiplier = value.durationMultiplier;
    }

    if (doSetJsonValue('routingOptions')) {
      routingOptions = value.routingOptions ?? {};
    }

    if (doSetJsonValue('speedOptions')) {
      speedOptions = value.speedOptions ?? {};
    }

    if (doSetJsonValue('maneuverOptions')) {
      maneuverOptions = value.maneuverOptions ?? {};
    }
  });

  $: {
    if (
      mapState ||
      locations ||
      routeLines ||
      styleUrl ||
      deviceSize ||
      durationMultiplier ||
      routingOptions ||
      speedOptions ||
      maneuverOptions
    ) {
      writeHash({
        locations,
        routeLines,
        styleUrl,
        deviceSize,
        durationMultiplier,
        routingOptions,
        speedOptions,
        maneuverOptions,
        ...mapState,
      });
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
