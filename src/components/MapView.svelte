<script>
  import { config as configStore } from '../stores';
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import 'mapbox-gl/dist/mapbox-gl.css';

  export let id;
  export let url;

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

  mapboxgl.accessToken = mapboxGlAccessToken;

  let map;

  onMount(() => {
    map = new mapboxgl.Map({
      id,
      container: 'map-viewer',
      style: url,
      preserveDrawingBuffer: true,
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
</script>

<div id="map-viewer" class="map" />

<style>
  .map {
    height: 100%;
    width: 100%;
  }
</style>
