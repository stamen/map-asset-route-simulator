<script>
  import _ from 'lodash';
  import DisplayArea from './components/DisplayArea.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import RightPanel from './components/RightPanel.svelte';
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
    routingOptions as routingOptionsStore,
    routeLineBuffer as routeLineBufferStore,
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

  let durationMultiplier = null;
  let routingOptions = null;
  let speedOptions = null;
  let maneuverOptions = null;

  // Flag the first time we load from the store because at that point, the store
  // will only contain data derived from the hash. We need to combine it with the
  // values from the config for the store to be correct
  let setRoutingOptionsOnLoad = true;
  routingOptionsStore.subscribe(value => {
    durationMultiplier = null;
    routingOptions = null;
    speedOptions = null;
    maneuverOptions = null;

    // Set the routingOptions store on load
    if (setRoutingOptionsOnLoad) {
      setRoutingOptionsOnLoad = false;

      const trimmedConfig = _.cloneDeep({
        durationMultiplier: config.durationMultiplier ?? {},
        routingOptions: config.routingOptions ?? {},
        speedOptions: config.speedOptions ?? {},
        maneuverOptions: config.maneuverOptions ?? {},
      });
      // Override default routing options in config with options from hash
      let cameraBehavior = _.assign(trimmedConfig, value);

      routingOptionsStore.set(cameraBehavior);
    }
    // For setting the hash based on the store value
    else {
      const isEmptyObj = v => _.isObject(v) && !Object.keys(v).length;
      if (value.durationMultiplier !== config.durationMultiplier) {
        durationMultiplier = value.durationMultiplier ?? null;
      }

      if (!_.isEqual(value?.routingOptions, config.routingOptions)) {
        routingOptions = value.routingOptions;
      }

      if (!_.isEqual(value?.speedOptions, config.speedOptions)) {
        // In the store, we make empty values empty objects, but if there's no config for that thing,
        // treat the same and don't create a hash
        const noHash = isEmptyObj(value.speedOptions) && !config.speedOptions;
        speedOptions = noHash ? null : value.speedOptions;
      }
      if (!_.isEqual(value?.maneuverOptions, config.maneuverOptions)) {
        const noHash =
          isEmptyObj(value.maneuverOptions) && !config.maneuverOptions;
        maneuverOptions = noHash ? null : value.maneuverOptions;
      }
    }
  });

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

  let routeLineBuffer = null;
  routeLineBufferStore.subscribe(v => {
    if (!!v.state) {
      routeLineBuffer = v;
    } else {
      routeLineBuffer = null;
    }
  });

  let styleUrl = null;
  mapStyleStore.subscribe(value => {
    styleUrl = !!value ? value : null;
  });

  let deviceSize = null;
  deviceSizeStore.subscribe(value => {
    deviceSize = value ?? null;
  });

  let fullScreenLoading = { loading: false };
  fullScreenLoadingStore.subscribe(value => (fullScreenLoading = value));

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
      maneuverOptions ||
      routeLineBuffer
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
        routeLineBuffer,
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
  <RightPanel {routeFlag} />
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
