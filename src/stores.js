import { readHash } from './query';
import { writable } from 'svelte/store';
import {
  ROUTE_LINE_LAYER_ID_PREFIX,
  ROUTE_LINE_SOURCE_ID,
  DEFAULT_ROUTELINE_PROPERTIES,
} from './constants';

const hashObj = readHash(window.location.hash);

// Config store
export const config = writable({});

// Route store
const routeKeys = ['locations'];
const initialRoute = Object.keys(hashObj).reduce((acc, key) => {
  if (routeKeys.includes(key)) {
    acc[key] = hashObj[key];
  }
  return acc;
}, {});
export const route = writable(initialRoute);

// MapState store
const mapStateKeys = ['bearing', 'center', 'pitch', 'zoom'];
const initialMapState = Object.keys(hashObj).reduce((acc, key) => {
  if (mapStateKeys.includes(key)) {
    acc[key] = hashObj[key];
  }
  return acc;
}, {});
export const mapState = writable(initialMapState);

// Map store
export const map = writable(null);

// Map asset store
export const mapAssets = writable({ puck: null, 'destination-pin': null });

// Map style store
export const mapStyle = writable(hashObj.styleUrl || '');

// Holds map style object
export const mapStyleObj = writable(null);

// Route line layer store
const routelines = hashObj?.routeLines
  ? hashObj?.routeLines.map((line, i) => {
      let layoutAndPaint = {
        layout: line?.layout,
        paint: line?.paint,
      };
      return {
        id: `${ROUTE_LINE_LAYER_ID_PREFIX}_${i}`,
        type: 'line',
        source: ROUTE_LINE_SOURCE_ID,
        ...layoutAndPaint,
      };
    })
  : [
      {
        id: `${ROUTE_LINE_LAYER_ID_PREFIX}_0`,
        type: 'line',
        source: ROUTE_LINE_SOURCE_ID,
        ...DEFAULT_ROUTELINE_PROPERTIES,
      },
    ];
// TODO decide if we want to pull this from style instead
export const routeLineLayer = writable(routelines);

export const deviceSize = writable(hashObj.deviceSize || null);

export const fullScreenLoading = writable({ loading: false });

// Routing options store
const routingOptionsKeys = [
  'durationMultiplier',
  'routingOptions',
  'speedOptions',
  'maneuverOptions',
];
let initialRoutingOptions = Object.keys(hashObj).reduce((acc, key) => {
  if (routingOptionsKeys.includes(key)) {
    acc[key] = hashObj[key];
  }
  return acc;
}, {});

export const routingOptions = writable(initialRoutingOptions);
