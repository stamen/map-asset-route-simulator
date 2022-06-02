import * as turf from '@turf/turf';
import * as geolib from 'geolib';
import mapboxgl from 'mapbox-gl';
import { config as configStore, mapAssets as mapAssetsStore } from './stores';
import { PUCK, DESTINATION_PIN } from './constants';
import {
  setPuckLocation,
  setMarkerLayer,
  removeMarkerLayer,
} from './add-map-assets';

let mapAssets = {};
mapAssetsStore.subscribe(value => (mapAssets = value));

let routingOptions;
configStore.subscribe(value => ({ routingOptions } = value));

const LOOK_AHEAD_DISTANCE = 1;
const DURATION_MULTIPLIER = 25;
const CAMERA_ALTITUDE = 1000;

// Calculates the distance for the camera to be away from the puck based on pitch and altitude
const getPovDistance = (pitch, altitude) => {
  const tangent = Math.tan((pitch * Math.PI) / 180);
  const opposite = altitude;
  const adjacent = tangent * opposite;
  return adjacent * -1;
};

let povDistance;

// Calculates the point distance on a 360 degree circle between two bearings based on direction being turned
const calculatePointDistance = (before, after, isClockwise) => {
  let leftDistance = (a, b) => {
    let val = a + (360 - b);
    return val > 360 ? val - 360 : val;
  };

  let rightDistance = (a, b) => {
    let val = b + (360 - a);
    return val > 360 ? val - 360 : val;
  };

  let distance = !isClockwise
    ? leftDistance(before, after)
    : rightDistance(before, after);

  return distance;
};

// Calculates the next bearing based on direction and phase of maneuver
const calculateBearing = (before, after, isClockwise, phase) => {
  let distance = calculatePointDistance(before, after, isClockwise);

  let bearing = !isClockwise
    ? before - distance * phase
    : before + distance * phase;

  if (bearing > 360) {
    bearing = bearing - 360;
  }
  if (bearing < 0) {
    bearing = 360 + bearing;
  }
  if (bearing === 360) {
    bearing = 0;
  }

  return bearing;
};

// Smooths the bearing when camera is following route
const smoothBearing = (bearing, nextBearing) => {
  const leftDistance = calculatePointDistance(bearing, nextBearing, false);
  const rightDistance = calculatePointDistance(bearing, nextBearing, true);

  let isClockwise = rightDistance < leftDistance ? true : false;

  // TODO Revisit the hardcoded 0.25
  const smoothed = calculateBearing(bearing, nextBearing, isClockwise, 0.25);

  return smoothed;
};

// Gets the POV point and lookAt point for the camera
const getPovAndLookAtPoint = (point, bearing) => {
  const lookAtPoint = geolib.computeDestinationPoint(
    point,
    LOOK_AHEAD_DISTANCE,
    bearing
  );

  const povPoint = geolib.computeDestinationPoint(point, povDistance, bearing);

  return { pov: povPoint, lookAt: lookAtPoint };
};

// Handles maneuvers separately from following the route with a pause
const handleManeuver = (map, maneuver, bearingBefore) => {
  return new Promise(resolve => {
    let { bearing_after, location, modifier, type } = maneuver;

    let start;
    let bearing = bearingBefore;

    // This is to prevent stopping on the route during slight turns like on or off ramps
    if (!type.includes('turn')) return resolve(bearing);

    const isClockwise = modifier.includes('left') ? false : true;

    const animationDuration =
      (calculatePointDistance(bearingBefore, bearing_after, isClockwise) *
        DURATION_MULTIPLIER) /
      5;

    function frame(time) {
      if (!start) start = time;
      const phase = (time - start) / animationDuration;

      if (phase > 1) {
        return resolve(bearing);
      }

      const camera = map.getFreeCameraOptions();

      const maneuverPoint = {
        longitude: location[0],
        latitude: location[1],
      };

      bearing = calculateBearing(
        bearingBefore,
        bearing_after,
        isClockwise,
        phase
      );

      const { pov, lookAt } = getPovAndLookAtPoint(maneuverPoint, bearing);

      camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
        {
          lng: pov.longitude,
          lat: pov.latitude,
        },
        CAMERA_ALTITUDE
      );

      // tell the camera to look at a point along the route
      camera.lookAtPoint({
        lng: lookAt.longitude,
        lat: lookAt.latitude,
      });

      map.setFreeCameraOptions(camera);

      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  });
};

// Navigates a route step with options passed from the step object
const navigate = (map, options) => {
  return new Promise(async resolve => {
    const { duration, coordinates, maneuver } = options;

    if (maneuver.type === 'arrive') {
      return resolve({ segmentComplete: true });
    }

    const currentBearing =
      map.getBearing() < 0 ? 360 + map.getBearing() : map.getBearing();
    let bearing = await handleManeuver(map, maneuver, currentBearing);

    const targetRoute = coordinates;
    const lookAheadIndex = 1;
    const lookAheadRoute = coordinates
      .slice(lookAheadIndex)
      .concat(Array(lookAheadIndex).fill(coordinates[coordinates.length - 1]));

    // multiplier is arbitrary. Duration is in seconds, but actual realistic timing is very slow
    const animationDuration = duration * DURATION_MULTIPLIER;
    // get the overall distance of each route so we can interpolate along them
    const routeDistance = turf.lineDistance(turf.lineString(targetRoute));
    const lookAheadDistance = turf.lineDistance(
      turf.lineString(lookAheadRoute)
    );

    let start;

    function frame(time) {
      if (!start) start = time;
      // phase determines how far through the animation we are
      const phase = (time - start) / animationDuration;

      const alongRoute = turf.along(
        turf.lineString(targetRoute),
        routeDistance * phase
      ).geometry.coordinates;

      const alongLookAhead = turf.along(
        turf.lineString(lookAheadRoute),
        lookAheadDistance * phase
      ).geometry.coordinates;

      // phase is normalized between 0 and 1
      // when the animation is finished, reset start to loop the animation
      if (phase > 1) {
        return resolve({ segmentComplete: true });
      }

      const camera = map.getFreeCameraOptions();

      let lookAheadPoint = {
        longitude: alongLookAhead[0],
        latitude: alongLookAhead[1],
      };

      const routePoint = {
        longitude: alongRoute[0],
        latitude: alongRoute[1],
      };

      setPuckLocation(map, alongRoute);

      // calculate the bearing based on the angle between the point we're at in the route and the look ahead point
      let nextBearing = geolib.getRhumbLineBearing(routePoint, lookAheadPoint);

      bearing = smoothBearing(bearing, nextBearing);

      const { pov, lookAt } = getPovAndLookAtPoint(routePoint, bearing);

      camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
        {
          lng: pov.longitude,
          lat: pov.latitude,
        },
        CAMERA_ALTITUDE
      );

      // tell the camera to look at a point along the route
      camera.lookAtPoint({
        lng: lookAt.longitude,
        lat: lookAt.latitude,
      });

      map.setFreeCameraOptions(camera);

      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  });
};

// Cycles through all steps in a route to navigate piece by piece with appropriate speed
const navigateSteps = async (map, route) => {
  // Possible we want to reconsider using the lowResGeom
  for (const leg of route.legs) {
    for (let i = 0; i < leg.steps.length; i++) {
      const step = leg.steps[i];
      const { duration, geometry, maneuver, intersections } = step;

      await navigate(map, {
        duration,
        coordinates: geometry.coordinates,
        maneuver,
        intersections,
      });
    }
  }

  // For now remove map assets on move
  map.once('move', () => {
    if (map.getLayer(DESTINATION_PIN)) {
      removeMarkerLayer(map, DESTINATION_PIN);
    }
    if (map.getLayer(PUCK)) {
      removeMarkerLayer(map, PUCK);
    }
  });
  return { routeComplete: true };
};

// Eases to the start of a route, then begins routing
const navigateRoute = (map, route) => {
  const { pitch } = routingOptions;
  povDistance = getPovDistance(pitch, CAMERA_ALTITUDE);
  return new Promise(res => {
    const fullCoords = route?.geometry?.coordinates;
    const start = fullCoords[0];
    const end = fullCoords[fullCoords.length - 1];

    if (mapAssets[DESTINATION_PIN]) {
      setMarkerLayer(map, end, DESTINATION_PIN);
    }
    if (mapAssets[PUCK]) {
      setMarkerLayer(map, start, PUCK);
    }

    const initialBearing =
      route?.legs?.[0]?.steps?.[0]?.maneuver?.bearing_after || 0;

    // Ease to the start of the route
    map.easeTo({
      center: start,
      zoom: 16,
      speed: 0.2,
      curve: 1,
      duration: 1000,
      pitch: 60,
      bearing: initialBearing,
    });

    map.once('moveend', () => {
      navigateSteps(map, route).then(e => {
        res(e);
      });
    });
  });
};

export { navigateRoute };
