import { readHash } from './query';
import { writable } from 'svelte/store';

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
