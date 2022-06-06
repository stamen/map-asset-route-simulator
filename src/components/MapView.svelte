<script>
  import throttle from 'lodash.throttle';
  import {
    config as configStore,
    route as routeStore,
    mapState as mapStateStore,
    map as mapStore,
    mapAssets as mapAssetsStore,
    routeLineLayer as routeLineLayerStore,
  } from '../stores';
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import 'mapbox-gl/dist/mapbox-gl.css';
  import { addFigmaImages } from '../add-figma-images';
  import { ROUTE_LINE_SOURCE_ID, ROUTE_LINE_LAYER_ID } from '../constants';

  export let id;
  export let url;

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

  let routeLineLayoutPaint;
  routeLineLayerStore.subscribe(value => (routeLineLayoutPaint = value));

  let directionsApiResponse;
  routeStore.subscribe(value => ({ response: directionsApiResponse } = value));

  let mapState;
  mapStateStore.subscribe(value => (mapState = value));

  mapboxgl.accessToken = mapboxGlAccessToken;

  let map;

  const throttledSetMapState = throttle(() => {
    if (!map) return;
    const bearing = map.getBearing();
    const pitch = map.getPitch();
    const zoom = map.getZoom();
    const center = map.getCenter();
    const nextMapState = { bearing, center, pitch, zoom };
    mapStateStore.set(nextMapState);
  }, 250);

  onMount(() => {
    map = new mapboxgl.Map({
      id,
      container: 'map-viewer',
      style: url,
      preserveDrawingBuffer: true,
      ...mapState,
    });

    mapStore.set(map);

    // Styledata isn't a completely reliable event
    map.once('styledata', () => {
      const loading = () => {
        if (!map.isStyleLoaded()) {
          setTimeout(loading, 150);
        } else {
          addFigmaImages(map)
            .then(addedIcons => {
              mapAssetsStore.update(store => {
                return Object.keys(store).reduce((acc, k) => {
                  acc[k] = addedIcons.includes(k) ? true : false;
                  return acc;
                }, {});
              });
              console.log('Assets loaded');
            })
            .catch(err => {
              console.error(err);
            });
          addRouteLine();
          updateRouteLine();
        }
      };
      loading();
    });

    map.on('move', () => {
      throttledSetMapState();
    });
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  const addRouteLine = () => {
    const sourceLoaded = !!map.getSource(ROUTE_LINE_SOURCE_ID);
    const layerLoaded = !!map.getLayer(ROUTE_LINE_LAYER_ID);

    if (!sourceLoaded) {
      map.addSource(ROUTE_LINE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
    }

    if (!layerLoaded) {
      // TODO make sure this layer name doesn't exist
      // TODO decide if we want to allow empty layer in style or just add our own
      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: 'line',
        source: ROUTE_LINE_SOURCE_ID,
        ...routeLineLayoutPaint,
      });
    }
  };

  const updateRouteLine = () => {
    if (!directionsApiResponse) return;
    const { routes } = directionsApiResponse;
    // Ignore alternative routes if there are any
    const route = routes[0];
    // TODO: Do we care about the low res geometry?
    const { geometry: lowResGeom } = route;

    let features = route.legs.reduce((acc, leg) => {
      const steps = leg.steps.reduce(
        (acc, step) => acc.concat(step.geometry),
        []
      );
      acc = acc.concat(steps);
      return acc;
    }, []);

    features = features.map(f => ({ type: 'Feature', geometry: f }));

    const highResGeom = {
      type: 'FeatureCollection',
      features: features,
    };

    map.getSource(ROUTE_LINE_SOURCE_ID).setData(highResGeom);

    const { coordinates } = lowResGeom;

    const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);

    for (const coord of coordinates) {
      bounds.extend(coord);
    }

    map.setPitch(0);
    map.fitBounds(bounds, {
      padding: 20,
    });
  };

  $: {
    if (map && url) {
      map.setStyle(url);
    }
  }

  $: {
    if (map) {
      map.once('render', () => {
        const container = document.getElementById('map-viewer');
        if (container) {
          const resizeObserver = new ResizeObserver(() => {
            map.resize({ resize: true });
          });
          resizeObserver.observe(container);
        }
      });
    }
  }

  $: if (map && map.isStyleLoaded() && directionsApiResponse) {
    updateRouteLine();
  }
</script>

<div id="map-viewer" class="map" />

<style>
  .map {
    height: 100%;
    width: 100%;
  }
</style>
