import mapboxgl from 'mapbox-gl';
import maplibregl from 'maplibre-gl';
import { validate } from '@mapbox/mapbox-gl-style-spec';
import {
  mapAssets as mapAssetsStore,
  routeLineLayer as routeLineLayerStore,
  mapStyle as mapStyleStore,
} from './stores';
import {
  PUCK,
  ROUTE_LINE_SOURCE_ID,
  ROUTE_LINE_LAYER_ID_PREFIX,
  TEMPORARY_MARKER,
} from './constants';
import * as turf from '@turf/turf';

let mapAssets = {};
mapAssetsStore.subscribe(value => (mapAssets = value));

let routeLineBuffer;
mapStyleStore.subscribe(value => {
  routeLineBuffer = value?.routeLineBuffer;
});

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

export const setTemporaryMarker = (map, points) => {
  const data = {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: p,
      },
    })),
  };

  const hasSource = map.getSource(TEMPORARY_MARKER);
  if (!hasSource) {
    map.addSource(TEMPORARY_MARKER, {
      type: 'geojson',
      data: data,
    });
  } else {
    map.getSource(TEMPORARY_MARKER).setData(data);
  }

  const hasLayer = map.getLayer(TEMPORARY_MARKER);
  if (!hasLayer) {
    map.addLayer({
      id: TEMPORARY_MARKER,
      type: 'circle',
      source: TEMPORARY_MARKER,
      paint: {
        'circle-color': 'red',
        'circle-radius': 5,
      },
    });
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
  const hasLayer = map.getLayer(markerId);
  if (hasLayer) {
    map.removeLayer(markerId);
  }
  const hasSource = map.getSource(markerId);
  if (hasSource) {
    map.removeSource(markerId);
  }
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

  // if buffer, we want to add buffer to relevant layers
  if (routeLineBuffer) {
    let updatedLayers = [];
    let stylesheet = map.getStyle();

    for (const buffer of routeLineBuffer) {
      const { padding, layers, type } = buffer;
      const polygonBuffer = turf.buffer(highResGeom, padding, {
        units: 'meters',
      });

      const setting = type === 'include' ? [true, false] : [false, true];
      const withinExp = ['case', ['within', polygonBuffer], ...setting];

      const nextLayers = layers.map(layer => {
        let l = stylesheet.layers.find(v => v.id === layer);
        l = JSON.parse(JSON.stringify(l));

        // Set the filter to the original if available
        if (
          !!stylesheet?.metadata?.['stamen:routeLineBufferOriginalFilter']?.[
            l.id
          ]
        ) {
          l.filter =
            stylesheet.metadata['stamen:routeLineBufferOriginalFilter'][l.id];
        } else {
          // Add to new relevant layers
          if (!stylesheet.metadata) {
            stylesheet.metadata = {
              'stamen:routeLineBufferOriginalFilter': {},
            };
          }
          if (
            !stylesheet?.metadata?.['stamen:routeLineBufferOriginalFilter']?.[
              l.id
            ]
          ) {
            stylesheet.metadata['stamen:routeLineBufferOriginalFilter'][l.id] =
              JSON.parse(JSON.stringify(l.filter));
          }
        }

        let existingFilter = JSON.parse(JSON.stringify(l?.filter));

        if (existingFilter && existingFilter[0] !== 'all') {
          existingFilter = ['all', existingFilter];
        }

        if (!existingFilter) {
          existingFilter = ['all'];
        }

        existingFilter = existingFilter.concat([withinExp]);

        l.filter = existingFilter;

        return l;
      });

      updatedLayers = updatedLayers.concat(nextLayers);
    }

    stylesheet = {
      ...stylesheet,
      layers: stylesheet.layers.map(l => {
        const updatedLayer = updatedLayers.find(v => v.id === l.id);
        if (updatedLayer) return updatedLayer;
        return l;
      }),
    };

    map.setStyle(stylesheet);
  }

  map.getSource(ROUTE_LINE_SOURCE_ID).setData(highResGeom);

  const renderer = mapRenderer === 'maplibre-gl' ? maplibregl : mapboxgl;

  if (fitToBounds) {
    let bounds = new renderer.LngLatBounds(
      coordinates[0],
      coordinates[coordinates.length - 1]
    );

    for (const coord of coordinates) {
      bounds.extend(coord);
    }

    if (mapRenderer === 'maplibre-gl') {
      const { _sw, _ne } = bounds;
      bounds = [
        [_sw.lng, _sw.lat],
        [_ne.lng, _ne.lat],
      ];
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
