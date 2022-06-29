<script>
  import throttle from 'lodash.throttle';
  import {
    config as configStore,
    route as routeStore,
    mapState as mapStateStore,
    map as mapStore,
    mapAssets as mapAssetsStore,
    routeLineLayer as routeLineLayerStore,
    fullScreenLoading as fullScreenLoadingStore,
  } from '../stores';
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import 'mapbox-gl/dist/mapbox-gl.css';
  import { addFigmaImages } from '../add-figma-images';
  import {
    waitForStyleUpdate,
    addRouteLine,
    updateRouteLine,
  } from '../mapbox-gl-utils';
  import {
    ROUTE_LINE_LAYER_ID_PREFIX,
    ROUTE_LINE_SOURCE,
    ROUTE_LINE_SOURCE_ID,
  } from '../constants';

  export let id;
  export let url;

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

  let directionsApiResponse;
  routeStore.subscribe(value => ({ response: directionsApiResponse } = value));

  let mapState;
  mapStateStore.subscribe(value => (mapState = value));

  let routeLineLayers;
  routeLineLayerStore.subscribe(value => (routeLineLayers = value));

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
      const callback = () => {
        fullScreenLoadingStore.set({
          loading: true,
          helperText: 'Loading assets',
        });
        addFigmaImages(map)
          .then(addedIcons => {
            mapAssetsStore.update(store => {
              return Object.keys(store).reduce((acc, k) => {
                acc[k] = addedIcons.find(item => item.name === k) ?? null;
                return acc;
              }, {});
            });
            fullScreenLoadingStore.set({
              loading: false,
            });
          })
          .catch(err => {
            fullScreenLoadingStore.set({
              loading: false,
            });
            console.error(err);
          });
        addRouteLine(map);
        updateRouteLine(map, directionsApiResponse);
      };

      waitForStyleUpdate(map, callback);
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

  // Reactive block to handle a new style coming in
  $: {
    // url can be a url or a full stylesheet
    if (map && url) {
      if (typeof url === 'string') {
        map.setStyle(url);
        const callback = () => {
          addRouteLine(map);
          updateRouteLine(map, directionsApiResponse, {
            fitToBounds: false,
          });
        };
        waitForStyleUpdate(map, callback);
      } else {
        // If stylesheet, add layer and source manually
        // Usually because of polling from a local server
        const stylesheet = url;
        const hasRouteLine = stylesheet.layers.find(l =>
          l.id.includes(ROUTE_LINE_LAYER_ID_PREFIX)
        );
        // This isn't a very accurate way to determine placement, but will do for now
        const lowestSymbolLayerIndex =
          stylesheet.layers.findIndex(
            l => l.type === 'symbol' && l?.layout?.['text-field']
          ) || stylesheet.layers.length;
        !hasRouteLine &&
          stylesheet.layers.splice(
            lowestSymbolLayerIndex,
            0,
            ...routeLineLayers
          );
        const { coordinates } = directionsApiResponse;

        const highResGeom = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        };

        let source = geometries
          ? { type: 'geojson', data: highResGeom }
          : ROUTE_LINE_SOURCE;
        stylesheet.sources[ROUTE_LINE_SOURCE_ID] = source;
        map.setStyle(stylesheet);
      }
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
    updateRouteLine(map, directionsApiResponse, { fitToBounds: true });
  }
</script>

<div id="map-viewer" class="map" />

<style>
  .map {
    height: 100%;
    width: 100%;
  }
</style>
