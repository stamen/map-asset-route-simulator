import { readHash } from './query';
import { writable } from 'svelte/store';
import {
  ROUTE_LINE_LAYER_ID,
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
export const map = writable({});

// Map asset store
export const mapAssets = writable({ puck: null, 'destination-pin': null });

// Map style store
export const mapStyle = writable(hashObj.styleUrl || '');

// Route line layer store
let layoutAndPaint = {
  layout: hashObj?.routeLine?.layout ?? DEFAULT_ROUTELINE_PROPERTIES.layout,
  paint: hashObj?.routeLine?.paint ?? DEFAULT_ROUTELINE_PROPERTIES.paint,
};
// TODO decide if we want to pull this from style instead
export const routeLineLayer = writable({
  id: ROUTE_LINE_LAYER_ID,
  type: 'line',
  source: ROUTE_LINE_SOURCE_ID,
  ...layoutAndPaint,
});

export const deviceSize = writable(hashObj.deviceSize || null);

export const fullScreenLoading = writable({ loading: false });
