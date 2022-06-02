<script>
  import { onMount, tick } from 'svelte';
  import { faXmark } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa/src/fa.svelte';
  import mapboxgl from 'mapbox-gl';
  import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js';
  import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
  import { fetchDirections } from '../fetch-directions';
  import {
    config as configStore,
    route as routeStore,
    map as mapStore,
  } from '../stores';
  import { navigateRoute } from '../navigate-route';
  import {
    DEFAULT_GEOCODERS,
    ROUTE_LINE_LAYER_ID,
    ROUTE_LINE_SOURCE_ID,
  } from '../constants';

  let mapboxGlAccessToken;
  configStore.subscribe(value => ({ mapboxGlAccessToken } = value));

  let disableSubmit = false;

  let routeFlag = false;

  let geocoders = DEFAULT_GEOCODERS;

  routeStore.subscribe(value => {
    if (value && value.hasOwnProperty('locations')) {
      geocoders = value.locations;
    }
  });

  let map;
  mapStore.subscribe(value => (map = value));

  let route;

  const hasMinimumLocations = () => {
    return geocoders.map(g => g.center).filter(Boolean).length >= 2;
  };

  $: {
    if (geocoders) {
      disableSubmit = !hasMinimumLocations();
    }
  }

  const submitRequest = async () => {
    const centers = geocoders
      .map(g => (g.center ? g.center : removeStop(g.id)))
      .filter(Boolean);
    const response = await fetchDirections(...centers);
    // TODO handle bad response
    if (response) {
      route = response?.routes?.[0];
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

    geocoder.on('result', e => {
      const { center, placeName } = handleGeocoderResult(e.result);
      geocoders = geocoders.map(g =>
        g.id === id ? { ...g, center, locationText: placeName } : g
      );
    });
    geocoder.on('clear', e => {
      geocoders = geocoders.map(g =>
        g.id === id ? { ...g, center: null, locationText: '' } : g
      );
    });
  };

  const setFocusedClass = id => {
    const el = document.getElementById(id);
    el.classList.remove('unfocused-input');
    el.classList.add('focused-input');

    const otherInputs = geocoders.filter(g => g.id !== id).map(g => g.id);

    otherInputs.forEach(geocoderId => {
      removeFocusedClass(geocoderId);
    });
  };

  const removeFocusedClass = id => {
    const el = document.getElementById(id);
    el.classList.remove('focused-input');
    el.classList.add('unfocused-input');
  };

  const setGeocoderText = () => {
    const inputs = document.getElementsByClassName(
      'mapboxgl-ctrl-geocoder--input'
    );

    [...inputs].forEach((input, i) => {
      input.value = geocoders[i].locationText;
      input.addEventListener('focusin', () => setFocusedClass(geocoders[i].id));
    });
  };

  onMount(() => {
    geocoders.forEach(g => mountGeocoder(g.id));

    setGeocoderText();

    // Submit a directions require on initial mount if possible
    if (hasMinimumLocations()) {
      submitRequest();
    }
  });

  const addStop = async () => {
    const id = String.fromCharCode(geocoders.length + 1 + 64).toLowerCase();
    geocoders = geocoders.concat([{ id, center: null, locationText: '' }]);
    // Tick waits for the state changes to apply and the component to render
    await tick();
    mountGeocoder(id);
  };

  const removeStop = id => {
    geocoders = geocoders.filter(g => g.id !== id);
  };

  const clearRoute = async () => {
    geocoders = DEFAULT_GEOCODERS;
    await tick();
    setGeocoderText();
    routeStore.set({
      locations: geocoders,
      response: null,
    });
    map.removeLayer(ROUTE_LINE_LAYER_ID);
    map.removeSource(ROUTE_LINE_SOURCE_ID);
  };

  const runRoute = async () => {
    routeFlag = true;
    await navigateRoute(map, route);
    routeFlag = false;
  };
</script>

<div class="directions">
  {#each geocoders as geocoderObj, i}
    <div class="stop">
      <div class="search-container">
        <span class="label">{geocoderObj.id.toUpperCase()}:</span>
        <div class="geocoder-container">
          <div id={geocoderObj.id} class="geocoder unfocused-input" />
        </div>
      </div>
      {#if i >= 2}
        <button
          class="remove-stop"
          disabled={routeFlag}
          on:click={() => removeStop(geocoderObj.id)}
          ><Fa icon={faXmark} /></button
        >
      {/if}
    </div>
  {/each}
  <div class="button-margin">
    <button
      class="secondary-button"
      disabled={geocoders.length >= 4 || routeFlag}
      title={geocoders.length >= 4 ? 'maximum of 4 stops allowed' : ''}
      on:click={addStop}>Add stop</button
    >
    <button
      class="secondary-button"
      disabled={routeFlag}
      title={geocoders.length >= 4 ? 'maximum of 4 stops allowed' : ''}
      on:click={clearRoute}>Clear route</button
    >
  </div>
  <button
    class="primary-button button-margin"
    disabled={disableSubmit || routeFlag}
    on:click={submitRequest}>Submit</button
  >
  <button
    class="primary-button button-margin"
    disabled={routeFlag || !route}
    on:click={runRoute}>Run route</button
  >
</div>

<style>
  :global(.suggestions) {
    position: absolute !important;
    z-index: 1000px !important;
  }

  .directions {
    margin-top: 12px;
    width: 100%;
  }

  .button-margin {
    margin-left: 42px;
    margin-bottom: 3px;
  }

  .primary-button {
    width: 240px;
    height: 36px;
  }

  .secondary-button {
    width: 120px;
    height: 36px;
  }

  .stop {
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .search-container {
    margin-left: 12px;
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

  :global(.focused-input > .mapboxgl-ctrl-geocoder .suggestions) {
    z-index: 1000;
  }

  .label {
    display: flex;
    font-weight: bold;
    font-size: 18px;
    margin-right: 12px;
  }

  .remove-stop {
    display: flex;
    margin-right: 12px;
    width: 24px;
    height: 24px;
    justify-content: center;
    align-items: center;
  }
</style>
