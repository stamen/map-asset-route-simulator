export const PUCK = 'puck';
export const DESTINATION_PIN = 'destination-pin';

export const MAP_ASSET_ICONS = [DESTINATION_PIN, PUCK];

export const DEFAULT_GEOCODERS = [
  { id: 'a', center: null, locationText: '' },
  { id: 'b', center: null, locationText: '' },
];

export const ROUTE_LINE_SOURCE_ID = 'route-line';
export const ROUTE_LINE_LAYER_ID = 'route-line';

export const ROUTE_LINE_SOURCE = {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [],
  },
};

export const DEFAULT_ROUTELINE_PROPERTIES = {
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': 'cyan',
    'line-width': [
      'interpolate',
      ['exponential', 1.5],
      ['zoom'],
      5,
      0.75,
      18,
      32,
    ],
  },
};
