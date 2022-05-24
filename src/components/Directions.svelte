<script>
  import { onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js';
  import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
  import { fetchDirections } from '../fetch-directions';
  import { config as configStore, route as routeStore } from '../stores';

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

  // TODO allow adding a geocoder
  let geocoders = [
    { id: 'a', center: null, locationText: '' },
    { id: 'b', center: null, locationText: '' },
  ];

  routeStore.subscribe(value => {
    if (value && value.hasOwnProperty('locations')) {
      geocoders = value.locations;
    }
  });

  const hasMinimumLocations = () => {
    return geocoders.map(g => g.center).filter(Boolean).length >= 2;
  };

  const submitRequest = async () => {
    const centers = geocoders.map(g => g.center).filter(Boolean);
    const response = await fetchDirections(...centers);
    // TODO handle bad response
    if (response) {
      routeStore.set({
        locations: geocoders,
        response,
      });
    }
  };

  const handleGeocoderResult = value => {
    const { place_name: placeName } = value;
    const center = {
      lat: value.center[1],
      lng: value.center[0],
    };
    return { center, placeName };
  };

  const mountGeocoder = id => {
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxGlAccessToken,
      mapboxgl: mapboxgl,
    });

    geocoder.addTo(`#${id}`);

    const geocoderObj = geocoders.find(g => g.id === id);

    geocoder.on('result', e => {
      const { center, placeName } = handleGeocoderResult(e.result);
      geocoderObj.center = center;
      geocoderObj.locationText = placeName;
    });
    geocoder.on('clear', e => {
      geocoderObj.center = null;
      geocoderObj.locationText = '';
    });
  };

  const setFocusedClass = id => {
    const el = document.getElementById(id);
    el.classList.remove('unfocused-input');
    el.classList.add('focused-input');
  };

  const removeFocusedClass = id => {
    const el = document.getElementById(id);
    el.classList.remove('focused-input');
    el.classList.add('unfocused-input');
  };

  onMount(() => {
    geocoders.forEach(g => mountGeocoder(g.id));

    const inputs = document.getElementsByClassName(
      'mapboxgl-ctrl-geocoder--input'
    );

    [...inputs].forEach((input, i) => {
      input.value = geocoders[i].locationText;
      input.addEventListener('focusin', () => setFocusedClass(geocoders[i].id));
      input.addEventListener('focusout', () =>
        removeFocusedClass(geocoders[i].id)
      );
    });

    // Submit a directions require on initial mount if possible
    if (hasMinimumLocations()) {
      submitRequest();
    }
  });
</script>

<div class="directions">
  {#each geocoders as geocoderObj}
    <div class="search-container">
      <span class="label">{geocoderObj.id.toUpperCase()}:</span>
      <div class="geocoder-container">
        <div id={geocoderObj.id} class="geocoder unfocused-input" />
      </div>
    </div>
  {/each}
  <button
    class="button"
    disabled={!hasMinimumLocations()}
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

  .search-container {
    margin-left: 12px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
  }

  .geocoder-container {
    display: flex;
    position: relative;
    width: 180px;
    height: 36px;
  }

  .geocoder {
    position: absolute;
  }

  .unfocused-input {
    z-index: 0;
  }

  :global(.focused-input) {
    z-index: 1000;
  }

  .label {
    display: flex;
    font-weight: bold;
    font-size: 18px;
    margin-right: 12px;
  }
</style>
