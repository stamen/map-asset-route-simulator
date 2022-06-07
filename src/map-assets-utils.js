import mapboxgl from 'mapbox-gl';
import {
  mapAssets as mapAssetsStore,
  routeLineLayer as routeLineLayerStore,
} from './stores';
import { PUCK, ROUTE_LINE_SOURCE_ID, ROUTE_LINE_LAYER_ID } from './constants';

let mapAssets = {};
mapAssetsStore.subscribe(value => (mapAssets = value));

let routeLineLayer;
routeLineLayerStore.subscribe(value => (routeLineLayer = value));

export const waitForStyleUpdate = (map, cb) => {
  map.once('styledata', () => {
    const loading = () => {
      if (!map.isStyleLoaded()) {
        setTimeout(loading, 150);
      } else {
        cb();
      }
    };
    loading();
  });
};

// This function lets us continually feed in a new lat/lng to the source of puck to move it along the route
export const setPuckLocation = (map, point) => {
  if (!mapAssets[PUCK]) return;

  const nextPuckLocation = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: point,
    },
  };

  map.getSource(PUCK) && map.getSource(PUCK).setData(nextPuckLocation);
};

export const setMarkerLayer = (map, point, markerId, pitchAlignment) => {
  if (!mapAssets[markerId]) {
    console.warn(`${markerId} is not loaded.`);
    return;
  }
  const hasSource = map.getSource(markerId);
  if (!hasSource) {
    map.addSource(markerId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point,
        },
      },
    });
  }

  const hasLayer = map.getLayer(markerId);

  if (!hasLayer) {
    map.addLayer({
      id: markerId,
      type: 'symbol',
      source: markerId,
      layout: {
        'icon-image': markerId,
        'icon-allow-overlap': true,
        'icon-pitch-alignment': pitchAlignment,
      },
    });
  }
};

export const removeMarkerLayer = (map, markerId) => {
  map.removeLayer(markerId);
  map.removeSource(markerId);
};

export const addRouteLine = map => {
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
    const lowestSymbolLayerId = map
      .getStyle()
      .layers.find(l => l.type === 'symbol' && l?.layout?.['text-field'])?.id;

    // TODO make sure this layer name doesn't exist
    // TODO decide if we want to allow empty layer in style or just add our own
    map.addLayer(routeLineLayer, lowestSymbolLayerId);
  }
};

export const createGeojsonSource = directionsApiResponse => {
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

  return { highResGeom, lowResGeom };
};

export const updateRouteLine = (map, directionsApiResponse) => {
  if (!directionsApiResponse) return;
  const { highResGeom, lowResGeom } = createGeojsonSource(
    directionsApiResponse
  );

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
