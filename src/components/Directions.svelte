<script>
  import { onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js';
  import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
  import { fetchDirections } from '../fetch-directions';
  import { config as configStore, route as routeStore } from '../stores';

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

  let geocoderA;
  let geocoderB;

  let centerA = null;
  let centerB = null;

  const handleGeocoderResult = value => {
    const center = {
      lat: value.center[1],
      lng: value.center[0],
    };
    return center;
  };

  const submitRequest = async () => {
    const response = await fetchDirections(centerA, centerB);
    if (response) {
      routeStore.set({ locA: centerA, locB: centerB, response });
    }
  };

  onMount(() => {
    geocoderA = new MapboxGeocoder({
      accessToken: mapboxGlAccessToken,
      mapboxgl: mapboxgl,
    });
    geocoderB = new MapboxGeocoder({
      accessToken: mapboxGlAccessToken,
      mapboxgl: mapboxgl,
    });

    geocoderA.addTo('#geocoderA');
    geocoderB.addTo('#geocoderB');

    geocoderA.on('clear', e => {
      centerA = null;
    });
    geocoderA.on('result', e => {
      centerA = handleGeocoderResult(e.result);
    });
    geocoderB.on('result', e => {
      centerB = handleGeocoderResult(e.result);
    });
    geocoderB.on('clear', e => {
      centerB = null;
    });
  });
</script>

<div class="directions">
  <div class="geocoder-container">
    <span class="label">A:</span>
    <div class="geocoder">
      <div id="geocoderA" />
    </div>
  </div>
  <div class="geocoder-container">
    <span class="label">B:</span>
    <div class="geocoder">
      <div id="geocoderB" />
    </div>
  </div>
  <button
    class="button"
    disabled={!centerA || !centerB}
    on:click={submitRequest}>Submit</button
  >
</div>

<style>
  :global(.suggestions) {
    position: absolute !important;
    z-index: 1000px !important;
  }

  #geocoderA {
    position: absolute;
  }

  #geocoderB {
    position: absolute;
    z-index: 0;
  }

  .directions {
    margin-top: 12px;
    width: 100%;
  }

  .button {
    margin-left: 42px;
    width: 240px;
    height: 36px;
  }

  .geocoder-container {
    margin-left: 12px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
  }

  .geocoder {
    display: flex;
    position: relative;
    width: 180px;
    height: 36px;
  }

  .label {
    display: flex;
    font-weight: bold;
    font-size: 18px;
    margin-right: 12px;
  }
</style>
