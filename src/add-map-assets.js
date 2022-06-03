import { mapAssets as mapAssetsStore } from './stores';
import { PUCK } from './constants';

let mapAssets = {};
mapAssetsStore.subscribe(value => (mapAssets = value));

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

  console.log(pitchAlignment);

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
};

export const removeMarkerLayer = (map, markerId) => {
  map.removeLayer(markerId);
  map.removeSource(markerId);
};
