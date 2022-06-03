import * as turf from '@turf/turf';
import * as geolib from 'geolib';
import {
  config as configStore,
  map,
  mapAssets as mapAssetsStore,
} from './stores';
import { PUCK, DESTINATION_PIN } from './constants';
import {
  setPuckLocation,
  setMarkerLayer,
  removeMarkerLayer,
} from './add-map-assets';

let mapAssets = {};
mapAssetsStore.subscribe(value => (mapAssets = value));

let routingOptions;
let maneuverOptions;
let speedOptions;
let durationMultiplier;
configStore.subscribe(
  value =>
    ({ routingOptions, maneuverOptions, speedOptions, durationMultiplier } =
      value)
);

function scale(number, inMin, inMax, outMin, outMax) {
  return ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

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

const normalizeBearing = bearing => {
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

// Calculates the next bearing based on direction and phase of maneuver
const calculateBearing = (before, after, isClockwise, phase) => {
  let distance = calculatePointDistance(before, after, isClockwise);

  let bearing = !isClockwise
    ? before - distance * phase
    : before + distance * phase;

  return normalizeBearing(bearing);
};

// Smooths the bearing when camera is following route
const smoothBearing = (bearing, nextBearing) => {
  const leftDistance = calculatePointDistance(bearing, nextBearing, false);
  const rightDistance = calculatePointDistance(bearing, nextBearing, true);

  let isClockwise = rightDistance < leftDistance ? true : false;

  const threshhold = 5;

  let distance = isClockwise ? rightDistance : leftDistance;
  distance = Math.min(distance, threshhold);

  // as distance gets closer to 0, we want phase to increase
  const phase = scale(threshhold - distance, 0, threshhold, 0.05, 0.25);

  // TODO Revisit the hardcoded 0.25
  const smoothed = calculateBearing(bearing, nextBearing, isClockwise, phase);

  return smoothed;
};

// Handles maneuvers separately from following the route with a pause
const handleManeuver = (map, maneuver, bearingBefore) => {
  return new Promise(resolve => {
    let { bearing_after, location, modifier } = maneuver;

    let start;
    let bearing = bearingBefore;

    if (!modifier || !bearing_after || modifier.includes('straight'))
      return resolve(bearing);

    // TODO: modifier 'uturn' is unhandled and will always turn right
    const isClockwise = modifier.includes('left') ? false : true;

    const pointDistance = calculatePointDistance(
      bearingBefore,
      bearing_after,
      isClockwise
    );

    const animationDuration = (pointDistance * durationMultiplier) / 5;

    function frame(time) {
      if (!start) start = time;
      const phase = (time - start) / animationDuration;

      if (phase > 1) {
        return resolve(bearing);
      }

      bearing = calculateBearing(
        bearingBefore,
        bearing_after,
        isClockwise,
        phase
      );

      map.jumpTo({
        center: location,
        bearing,
      });

      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  });
};

// Eases the pitch and zoom using a phase based on lead distance
const easePitchAndZoom = (before, after, distanceToCover, maxDistance) => {
  const phase =
    1 - scale(Math.min(distanceToCover, maxDistance), 0, maxDistance, 0, 1);

  let pitch = before.pitch;
  let zoom = before.zoom;

  if (after.pitch !== undefined) {
    const pitchIsIncreasing = after.pitch > before.pitch;
    const minPitch = Math.min(before.pitch, after.pitch);
    const maxPitch = Math.max(before.pitch, after.pitch);

    pitch = pitchIsIncreasing
      ? scale(phase, 0, 1, minPitch, maxPitch)
      : scale(1 - phase, 0, 1, minPitch, maxPitch);
  }

  if (after.zoom !== undefined) {
    const zoomIsIncreasing = after.zoom > before.zoom;
    const minZoom = Math.min(before.zoom, after.zoom);
    const maxZoom = Math.max(before.zoom, after.zoom);

    zoom = zoomIsIncreasing
      ? scale(phase, 0, 1, minZoom, maxZoom)
      : scale(1 - phase, 0, 1, minZoom, maxZoom);
  }

  return { pitch, zoom };
};

// Navigates a route step with options passed from the step object
const navigate = (map, options) => {
  return new Promise(async resolve => {
    const { distance, duration, coordinates, maneuver, nextManeuver } = options;

    // In meters per second
    const speed = distance / duration;

    // If a segment moves faster, use the speedOptions
    let segmentRoutingOptions =
      speedOptions?.speed && speedOptions?.speed < speed
        ? { ...routingOptions, ...speedOptions }
        : routingOptions;

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
    const animationDuration = duration * durationMultiplier;
    // get the overall distance of each route so we can interpolate along them
    const routeDistance = turf.lineDistance(turf.lineString(targetRoute));
    const lookAheadDistance = turf.lineDistance(
      turf.lineString(lookAheadRoute)
    );

    let easeInPitch;
    let easeInZoom;
    let easeOutPitch;
    let easeOutZoom;

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

      let lookAheadPoint = {
        longitude: alongLookAhead[0],
        latitude: alongLookAhead[1],
      };

      const routePoint = {
        longitude: alongRoute[0],
        latitude: alongRoute[1],
      };

      setPuckLocation(map, alongRoute);

      let pitch;
      let zoom;

      // calculate the bearing based on the angle between the point we're at in the route and the look ahead point
      let nextBearing = geolib.getRhumbLineBearing(routePoint, lookAheadPoint);
      bearing = smoothBearing(bearing, nextBearing);

      const distanceLeft = distance - distance * phase;

      const leadDistance = maneuverOptions?.leadDistance;

      // ease into maneuver
      if (leadDistance && distanceLeft <= leadDistance) {
        if (!easeInPitch) easeInPitch = map.getPitch();
        if (!easeInZoom) easeInZoom = map.getZoom();

        const maneuverBehavior = maneuverOptions?.[nextManeuver.type];

        const easedPosition = easePitchAndZoom(
          {
            pitch: easeInPitch,
            zoom: easeInZoom,
          },
          {
            pitch:
              maneuverBehavior?.pitch !== undefined
                ? maneuverBehavior?.pitch
                : segmentRoutingOptions.pitch,
            zoom:
              maneuverBehavior?.zoom !== undefined
                ? maneuverBehavior?.zoom
                : segmentRoutingOptions.zoom,
          },
          distanceLeft,
          leadDistance
        );

        pitch = easedPosition.pitch;
        zoom = easedPosition.zoom;
      }
      // ease out of maneuver
      else if (leadDistance && distance * phase <= leadDistance) {
        if (!easeOutPitch) easeOutPitch = map.getPitch();
        if (!easeOutZoom) easeOutZoom = map.getZoom();

        const easedPosition = easePitchAndZoom(
          {
            pitch: easeOutPitch,
            zoom: easeOutZoom,
          },
          {
            pitch: segmentRoutingOptions.pitch,
            zoom: segmentRoutingOptions.zoom,
          },
          leadDistance - distance * phase,
          leadDistance
        );
        pitch = easedPosition.pitch;
        zoom = easedPosition.zoom;
      } else {
        pitch = segmentRoutingOptions.pitch;
        zoom = segmentRoutingOptions.zoom;
      }

      map.jumpTo({
        center: alongRoute,
        zoom,
        pitch,
        bearing,
      });

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
      const { distance, duration, geometry, maneuver, intersections } = step;
      const nextManeuver = leg.steps?.[i + 1]?.maneuver;

      await navigate(map, {
        duration,
        distance,
        coordinates: geometry.coordinates,
        maneuver,
        intersections,
        nextManeuver,
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
