export const PUCK = 'puck';
export const DESTINATION_PIN = 'destination-pin';

export const TEMPORARY_MARKER = 'temporary-marker';

export const MAP_ASSET_ICONS = [DESTINATION_PIN, PUCK];

export const DEFAULT_GEOCODERS = [
  { id: 'a', center: null, locationText: '' },
  { id: 'b', center: null, locationText: '' },
];

export const ROUTE_LINE_SOURCE_ID = 'route-line-internal-mock-source';
export const ROUTE_LINE_LAYER_ID_PREFIX = 'route-line-internal-mock-layer';

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

export const MANEUVERS = [
  'turn',
  'new name',
  'depart',
  'arrive',
  'merge',
  'on ramp',
  'off ramp',
  'fork',
  'end of road',
  'continue',
  'roundabout',
  'rotary',
  'roundabout turn',
  'notification',
  'exit roundabout',
  'exit rotary',
];

export const PITCH_MIN = 0;
// TODO check this pitch max
export const PITCH_MAX = 85;
export const ZOOM_MIN = 0;
export const ZOOM_MAX = 24;
export const SPEED_MIN = 0;
export const SPEED_MAX = 30;

export const NUMBER_INPUT_STEPS = {
  speed: 0.1,
  pitch: 1,
  zoom: 0.1,
};
