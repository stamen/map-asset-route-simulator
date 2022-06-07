<script>
  import throttle from 'lodash.throttle';
  import {
    config as configStore,
    route as routeStore,
    mapState as mapStateStore,
    map as mapStore,
    mapAssets as mapAssetsStore,
  } from '../stores';
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import 'mapbox-gl/dist/mapbox-gl.css';
  import { addFigmaImages } from '../add-figma-images';
  import {
    waitForStyleUpdate,
    addRouteLine,
    updateRouteLine,
  } from '../add-map-assets';

  export let id;
  export let url;

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

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
      const callback = () => {
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

  $: {
    if (map && url) {
      map.setStyle(url);
      const callback = () => {
        addRouteLine(map);
        updateRouteLine(map, directionsApiResponse);
      };
      waitForStyleUpdate(map, callback);
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
    updateRouteLine(map, directionsApiResponse);
  }
</script>

<div id="map-viewer" class="map" />

<style>
  .map {
    height: 100%;
    width: 100%;
  }
</style>
