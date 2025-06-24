// Replace with your Mapbox GL token
const mapboxGlAccessToken = 'pk.123abc';

//   List of devices with names and dimensions
// const devices = [
//   {
//     id: 'google-pixel',
//     name: 'Google Pixel',
//     height: 732,
//     width: 412,
//   },
//   {
//     id: 'iphone-13',
//     name: 'iPhone 13',
//     height: 844,
//     width: 390,
//   },
// ];

// List of Mapbox GL styles to use with urls
// const styles = [
//   {
//     id: 'mapbox-streets',
//     name: 'Mapbox Streets',
//     type: 'mapbox-gl',
//     url: 'mapbox://styles/mapbox/streets-v11',
//   },
//   {
//     id: 'mapbox-outdoors',
//     name: 'Mapbox Outdoors',
//     type: 'mapbox-gl',
//     url: 'mapbox://styles/mapbox/outdoors-v11',
//   },
//   {
//     id: 'mapbox-light',
//     name: 'Mapbox Light',
//     type: 'mapbox-gl',
//     url: 'mapbox://styles/mapbox/light-v10',
//   },
//   {
//     id: 'mapbox-dark',
//     name: 'Mapbox Dark',
//     type: 'mapbox-gl',
//     url: 'mapbox://styles/mapbox/dark-v10',
//   },
// ];

// See https://github.com/stamen/figmasset for more details
// Our config varies from the Figmasset config because we only allow one scale and we specify the assets we need to bring in by frame name
// const figmaLink = {
//   // Frame names for specific assets
//   'destination-pin': 'frame-name',
//   puck: 'frame-name',
//   fileKey: '123abc',
//   personalAccessToken: '112233aabbcc',
//   scale: 1,
// };

// For close to real time you would use 1000 to multiply the miliseconds but that is very slow
// const durationMultiplier = 50;

// Standard routing options along the route
// const routingOptions = {
//   leadDistance: 125,
//   pitch: 60,
//   zoom: 16
// };

// See https://docs.mapbox.com/api/navigation/directions/#maneuver-types for types
// Options for easing into a maneuver with a different camera position
// const maneuverOptions = {
//   turn: {
//     pitch: 45,
//     zoom: 18,
//   },
//   arrive: {
//     pitch: 0
//   },
// };

// Options for changing our routing options based on a target speed
// Can only use one speed here for now
// const speedOptions = {
//   leadDistance: 225,
//   // meters per second
//   speed: 15,
//   zoom: 15,
// };

// Options for including and excluding symbol layers from a buffer around the route line
// const routeLineBuffer = [
//   {
//     padding: 100,
//     layers: ['poi-label'],
//     type: 'exclude',
//   },
// ];

export {
  mapboxGlAccessToken,
  //   devices,
  //   styles,
  //   figmaLink,
  //   durationMultiplier,
  //   routingOptions,
  //   maneuverOptions,
  //   speedOptions,
  //   routeLineBuffer
};
