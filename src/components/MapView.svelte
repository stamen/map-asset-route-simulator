<script>
  import { config as configStore } from '../stores';
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import 'mapbox-gl/dist/mapbox-gl.css';

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

  mapboxgl.accessToken = mapboxGlAccessToken;

  let map;

  onMount(() => {
    map = new mapboxgl.Map({
      container: 'map-viewer',
      style: 'mapbox://styles/mapbox/streets-v11',
      preserveDrawingBuffer: true,
    });
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<div id="map-viewer" class="map" />

<style>
  .map {
    height: 100%;
    width: 100%;
  }
</style>
