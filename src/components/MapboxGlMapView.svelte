<script>
  import _ from 'lodash';
  import {
    config as configStore,
    route as routeStore,
    mapState as mapStateStore,
    map as mapStore,
    mapAssets as mapAssetsStore,
    mapStyle as mapStyleStore,
    routeLineLayer as routeLineLayerStore,
    fullScreenLoading as fullScreenLoadingStore,
    focusedGeocoder as focusedGeocoderStore,
    lastClickedLocation as lastClickedLocationStore,
  } from '../stores';
  import { onMount, onDestroy } from 'svelte';
  import { addFigmaImages } from '../add-figma-images';
  import {
    waitForStyleUpdate,
    addRouteLine,
    updateRouteLine,
  } from '../mapbox-gl-utils';
  import {
    PUCK,
    DESTINATION_PIN,
    ROUTE_LINE_LAYER_ID_PREFIX,
    ROUTE_LINE_SOURCE,
    ROUTE_LINE_SOURCE_ID,
  } from '../constants';

  export let id;
  export let url;
  export let mapRenderer;

  let renderer;

  let routeLineBuffer;

  mapStyleStore.subscribe(value => {
    routeLineBuffer = value?.routeLineBuffer;
  });

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

  // Mapbox and MapLibre share a Map component since they are so similar and utilize the same methods
  const importRenderer = async () => {
    if (mapRenderer === 'maplibre-gl') {
      await import('maplibre-gl/dist/maplibre-gl.css');
      renderer = await import('maplibre-gl');
    } else {
      await import('mapbox-gl/dist/mapbox-gl.css');
      renderer = await import('mapbox-gl');
      renderer.accessToken = mapboxGlAccessToken;
    }
  };

  let directionsApiResponse;
  routeStore.subscribe(value => ({ response: directionsApiResponse } = value));

  let mapState;
  mapStateStore.subscribe(value => (mapState = value));

  let routeLineLayers;
  routeLineLayerStore.subscribe(value => (routeLineLayers = value));

  let mapAssets;
  mapAssetsStore.subscribe(value => (mapAssets = value));

  let map;

  const throttledSetMapState = _.throttle(() => {
    if (!map) return;
    const bearing = map.getBearing();
    const pitch = map.getPitch();
    const zoom = map.getZoom();
    const center = map.getCenter();
    const nextMapState = { bearing, center, pitch, zoom };
    mapStateStore.set(nextMapState);
  }, 250);

  focusedGeocoderStore.subscribe(value => {
    if (!map) return;
    if (value) {
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.getCanvas().style.cursor = 'pointer';
    }
  });

  onMount(async () => {
    await importRenderer();
    const glLibrary = renderer;

    map = new glLibrary.Map({
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
        addFigmaImages(map, mapRenderer)
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
        updateRouteLine(map, mapRenderer, directionsApiResponse);
      };

      waitForStyleUpdate(map, callback);
    });

    map.on('move', () => {
      throttledSetMapState();
    });

    map.on('click', e => {
      if ($focusedGeocoderStore) {
        lastClickedLocationStore.set(e.lngLat);
      }
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
      let puckLayer;
      let destinationPinLayer;
      let puckSource;
      let destinationPinSource;
      try {
        const { layers: jsonLayers, sources: jsonSources } = map.getStyle();
        puckLayer = jsonLayers.find(l => l.id === PUCK);
        destinationPinLayer = jsonLayers.find(l => l.id === DESTINATION_PIN);
        puckSource = jsonSources[PUCK];
        destinationPinSource = jsonSources[DESTINATION_PIN];
      } catch (err) {}

      if (typeof url === 'string') {
        map.setStyle(url);
        const callback = () => {
          addRouteLine(map);
          updateRouteLine(map, mapRenderer, directionsApiResponse, {
            fitToBounds: false,
          });
          if (destinationPinLayer && !map.getLayer(DESTINATION_PIN)) {
            map.addSource(DESTINATION_PIN, destinationPinSource);
            map.addLayer(destinationPinLayer);
          }
          if (puckLayer && !map.getLayer(PUCK)) {
            map.addSource(PUCK, puckSource);
            map.addLayer(puckLayer);
          }
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

        const hasDestinationPin = stylesheet.layers.find(
          l => l.id === DESTINATION_PIN
        );
        const hasPuck = stylesheet.layers.find(l => l.id === PUCK);

        if (destinationPinLayer && !hasDestinationPin) {
          stylesheet.sources[DESTINATION_PIN] = destinationPinSource;
          stylesheet.layers.push(destinationPinLayer);
        }
        if (puckLayer && !hasPuck) {
          stylesheet.sources[PUCK] = puckSource;
          stylesheet.layers.push(puckLayer);
        }

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
    updateRouteLine(map, mapRenderer, directionsApiResponse, {
      fitToBounds: true,
    });
  }

  $: if (map && map.isStyleLoaded() && routeLineBuffer) {
    updateRouteLine(map, mapRenderer, directionsApiResponse, {
      fitToBounds: false,
    });
  }
</script>

<div id="map-viewer" class="map" />

<style>
  .map {
    height: 100%;
    width: 100%;
  }
</style>
