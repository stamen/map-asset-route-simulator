const mapboxGlAccessToken =
  'pk.eyJ1Ijoic3RhbWVuIiwiYSI6ImNreWM1emM2NjAyNTgyb25kc2o5ZG1iMmoifQ.o2QhFbe03ilcplg9sAhYZQ';

const devices = [
  {
    id: 'google-pixel',
    name: 'Google Pixel',
    height: 732,
    width: 412,
  },
  {
    id: 'iphone-13',
    name: 'iPhone 13',
    height: 844,
    width: 390,
  },
];

const styles = [
  {
    id: 'mapbox-streets',
    name: 'Mapbox Streets',
    type: 'mapbox-gl',
    url: 'mapbox://styles/mapbox/streets-v11',
  },
  {
    id: 'mapbox-outdoors',
    name: 'Mapbox Outdoors',
    type: 'mapbox-gl',
    url: 'mapbox://styles/mapbox/outdoors-v11',
  },
  {
    id: 'mapbox-light',
    name: 'Mapbox Light',
    type: 'mapbox-gl',
    url: 'mapbox://styles/mapbox/light-v10',
  },
  {
    id: 'mapbox-dark',
    name: 'Mapbox Dark',
    type: 'mapbox-gl',
    url: 'mapbox://styles/mapbox/dark-v10',
  },
];

const durationMultiplier = 50;

const routingOptions = {
  leadDistance: 125,
  pitch: 60,
  zoom: 15.5,
};

// See https://docs.mapbox.com/api/navigation/directions/#maneuver-types for types
const maneuverOptions = {
  turn: {
    pitch: 45,
    zoom: 16.5,
  },
  arrive: {
    pitch: 0,
    zoom: 16.5,
  },
};

const speedOptions = {
  leadDistance: 225,
  // meters per second
  speed: 17.5,
  zoom: 13.5,
};

export {
  mapboxGlAccessToken,
  devices,
  styles,
  durationMultiplier,
  routingOptions,
  maneuverOptions,
  speedOptions,
};
