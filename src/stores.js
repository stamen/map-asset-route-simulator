import { readHash } from './query';
import { writable } from 'svelte/store';
import { ROUTE_LINE_LAYER_ID, ROUTE_LINE_SOURCE_ID } from './constants';

const hashObj = readHash(window.location.hash);

export const config = writable({});

const routeKeys = ['locations'];
const initialRoute = Object.keys(hashObj).reduce((acc, key) => {
  if (routeKeys.includes(key)) {
    acc[key] = hashObj[key];
  }
  return acc;
}, {});
export const route = writable(initialRoute);

const mapStateKeys = ['bearing', 'center', 'pitch', 'zoom'];
const initialMapState = Object.keys(hashObj).reduce((acc, key) => {
  if (mapStateKeys.includes(key)) {
    acc[key] = hashObj[key];
  }
  return acc;
}, {});
export const mapState = writable(initialMapState);

export const map = writable({});

export const mapAssets = writable({ puck: null, 'destination-pin': null });

let layoutAndPaint = {
  layout: hashObj?.routeLine?.layout ?? {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: hashObj?.routeLine?.paint ?? {
    'line-color': 'blue',
    'line-width': 8,
  },
};
// TODO decide if we want to pull this from style instead
export const routeLineLayer = writable({
  id: ROUTE_LINE_LAYER_ID,
  type: 'line',
  source: ROUTE_LINE_SOURCE_ID,
  ...layoutAndPaint,
});
