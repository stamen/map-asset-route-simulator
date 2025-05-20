import mapboxgl from 'mapbox-gl';
import maplibregl from 'maplibre-gl';
import { validate } from '@mapbox/mapbox-gl-style-spec';
import {
  mapAssets as mapAssetsStore,
  routeLineLayer as routeLineLayerStore,
} from './stores';
import {
  PUCK,
  ROUTE_LINE_SOURCE_ID,
  ROUTE_LINE_LAYER_ID_PREFIX,
} from './constants';

let mapAssets = {};
mapAssetsStore.subscribe(value => (mapAssets = value));

let routeLineLayers;
routeLineLayerStore.subscribe(value => (routeLineLayers = value));

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
export const setPuckLocation = (map, point, bearing) => {
  if (!mapAssets[PUCK]) return;

  const nextPuckLocation = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: point,
    },
  };

  map.getSource(PUCK) && map.getSource(PUCK).setData(nextPuckLocation);

  if (map.getLayer(PUCK)) {
    map.setLayoutProperty(PUCK, 'icon-rotate', bearing);
  }
};

export const setMarkerLayer = (map, point, markerId, layoutProperties) => {
  const asset = mapAssets[markerId];
  if (!mapAssets[markerId]) {
    console.warn(`${markerId} is not loaded.`);
    return;
  }

  const hasImage = map.hasImage(markerId);
  if (!hasImage) {
    const { url } = asset;
    map.loadImage(url, (error, image) => {
      if (error) throw error;
      map.addImage(markerId, image);
    });
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
        ...layoutProperties,
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

  if (!sourceLoaded) {
    map.addSource(ROUTE_LINE_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
  }

  // Check that the first route line layer is loaded
  const layerLoaded = !!map.getLayer(`${ROUTE_LINE_LAYER_ID_PREFIX}_0`);

  if (!layerLoaded) {
    let lowestSymbolLayerId = map
      .getStyle()
      .layers.find(l => l.type === 'symbol' && l?.layout?.['text-field'])?.id;

    // TODO make sure this layer name doesn't exist
    // TODO decide if we want to allow empty layer in style or just add our own
    routeLineLayers.forEach(layer => {
      const layerLoaded = !!map.getLayer(layer.id);
      !layerLoaded && map.addLayer(layer, lowestSymbolLayerId);
      lowestSymbolLayerId = layer.id;
    });
  }
};

export const updateRouteLine = (
  map,
  mapRenderer,
  route,
  options = { fitToBounds: true }
) => {
  if (!route) return;
  const { fitToBounds } = options;
  const { coordinates } = route;

  const highResGeom = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates,
    },
  };

  map.getSource(ROUTE_LINE_SOURCE_ID).setData(highResGeom);

  const renderer = mapRenderer === 'maplibre-gl' ? maplibregl : mapboxgl;

  if (fitToBounds) {
    const bounds = new renderer.LngLatBounds(
      coordinates[0],
      coordinates[coordinates.length - 1]
    );

    for (const coord of coordinates) {
      bounds.extend(coord);
    }

    map.setPitch(0);
    map.fitBounds(bounds, {
      padding: 20,
    });
  }
};

export const validateLayer = layer => {
  const style = {
    version: 8,
    sources: {
      [layer.source]: {
        data: {
          type: 'FeatureCollection',
          features: [],
        },
        type: 'geojson',
      },
    },
    layers: [layer],
  };
  return validate(JSON.stringify(style));
};
