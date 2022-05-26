<script>
  import { loadFigmassets } from 'figmasset';
  import throttle from 'lodash.throttle';
  import {
    config as configStore,
    route as routeStore,
    mapState as mapStateStore,
  } from '../stores';
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import 'mapbox-gl/dist/mapbox-gl.css';

  const ROUTE_LINE_SOURCE_ID = 'route-line';
  const ROUTE_LINE_LAYER_ID = 'route-line';
  const MAP_ASSET_ICONS = ['destination-pin', 'puck'];

  export let id;
  export let url;

  let mapboxGlAccessToken;
  let figmaLink;
  configStore.subscribe(value => ({ mapboxGlAccessToken, figmaLink } = value));

  let directionsApiResponse;
  routeStore.subscribe(value => ({ response: directionsApiResponse } = value));

  let mapState;
  mapStateStore.subscribe(value => (mapState = value));

  mapboxgl.accessToken = mapboxGlAccessToken;

  let map;
  let addedMapAssetImages = [];

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

    // Styledata isn't a completely reliable event
    map.once('styledata', () => {
      const loading = () => {
        if (!map.isStyleLoaded()) {
          setTimeout(loading, 150);
        } else {
          addRouteLine();
        }
      };
      loading();
    });

    map.on('move', () => {
      throttledSetMapState();
    });

    if (figmaLink) {
      handleFigma();
    }
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  const handleFigma = () => {
    // TODO make keys optional, don't need to provide both or any icons if they don't want
    let args = {
      ...figmaLink,
      // We need to transform this because our config requires more specificity
      // Frames can be named anything, but icons in the frames need specific names
      frameNames: [
        ...new Set(
          MAP_ASSET_ICONS.map(frame => figmaLink[frame]).filter(Boolean)
        ),
      ],
      scales: [figmaLink.scale],
    };
    delete args.destinationPin;
    delete args.puck;
    delete args.scale;
    const iconPromise = loadFigmassets(args);

    iconPromise.then(iconsObj => {
      const checkForNames = MAP_ASSET_ICONS.some(icon =>
        Object.keys(iconsObj).includes(icon)
      );
      if (!checkForNames)
        throw new Error(
          `Icons in frames need to be named ${MAP_ASSET_ICONS.join(
            ', '
          )}. Found ${Object.keys(iconsObj).join(
            ', '
          )}. Please check icon names in your Figma file.`
        );
      MAP_ASSET_ICONS.forEach(name => {
        const v = iconsObj[name];
        if (!v) return;
        // We only allow one scale in our config, so there is only one @ key (eg `@1x`)
        const scaleKey = Object.keys(v).find(k => k.includes('@'));
        const url = v[scaleKey];

        map.loadImage(url, (error, image) => {
          if (error) throw error;

          addedMapAssetImages = addedMapAssetImages.concat([name]);
          map.addImage(name, image);
        });
      });
    });
  };

  const addMapAssetImages = (iconName, coords) => {
    map.addSource(iconName, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords,
        },
      },
    });

    map.addLayer({
      id: iconName,
      type: 'symbol',
      source: iconName,
      layout: {
        'icon-image': iconName,
      },
    });
  };

  const addRouteLine = () => {
    if (!directionsApiResponse) return;
    const { routes } = directionsApiResponse;
    // Ignore alternative routes if there are any
    const route = routes[0];
    const { geometry } = route;

    const sourceLoaded = !!map.getSource(ROUTE_LINE_SOURCE_ID);
    if (!sourceLoaded) {
      map.addSource(ROUTE_LINE_SOURCE_ID, { type: 'geojson', data: geometry });
      // TODO make sure this layer name doesn't exist
      // TODO decide if we want to allow empty layer in style or just add our own
      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: 'line',
        source: ROUTE_LINE_SOURCE_ID,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': 'blue',
          'line-width': 8,
        },
      });
    } else {
      map.getSource(ROUTE_LINE_SOURCE_ID).setData(geometry);
    }

    const { coordinates } = geometry;

    const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);

    for (const coord of coordinates) {
      bounds.extend(coord);
    }

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
    addRouteLine();
  }
</script>

<div id="map-viewer" class="map" />

<style>
  .map {
    height: 100%;
    width: 100%;
  }
</style>
