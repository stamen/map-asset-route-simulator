import * as turf from '@turf/turf';
import {
  mapAssets as mapAssetsStore,
  routingOptions as routingOptionsStore,
} from './stores';
import { PUCK, DESTINATION_PIN } from './constants';
import { setPuckLocation, setMarkerLayer } from './mapbox-gl-utils';

let currentSteps;

let mapAssets = {};
mapAssetsStore.subscribe(value => (mapAssets = value));

let routingOptions;
let maneuverOptions;
let speedOptions;
let durationMultiplier;
routingOptionsStore.subscribe(
  value =>
    ({ routingOptions, maneuverOptions, speedOptions, durationMultiplier } =
      value)
);

// Scale a number within a range to a number in a different range
const scale = (number, inMin, inMax, outMin, outMax) => {
  return ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

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

// Normalizes a bearing >360 or <0 to within a 360 degree range
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
  const phase = scale(threshhold - distance, 0, threshhold, 0.05, 0.5);

  const smoothed = calculateBearing(bearing, nextBearing, isClockwise, phase);

  return smoothed;
};

// Handles maneuvers separately from following the route
// This adjusts the bearing of the map based on the turn's direction
const handleManeuver = (map, maneuver, bearingBefore) => {
  return new Promise(resolve => {
    let { bearing_after, location, modifier } = maneuver;

    let start;
    let bearing = bearingBefore;

    if (!modifier || !bearing_after) return resolve(bearing);

    const clockwiseDistance = calculatePointDistance(
      bearingBefore,
      bearing_after,
      true
    );

    const counterClockwiseDistance = calculatePointDistance(
      bearingBefore,
      bearing_after,
      false
    );

    // Always choose the shortest distance between the two to get the correct direction
    const isClockwise =
      clockwiseDistance < counterClockwiseDistance ? true : false;

    const pointDistance = isClockwise
      ? clockwiseDistance
      : counterClockwiseDistance;

    // The 5 here is arbitrary, but feels about right since maneuvers don't have a duration and
    // point distance is not the same as meters travelled
    const animationDuration = (pointDistance * durationMultiplier) / 10;

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

      setPuckLocation(map, location, bearing);

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
// Before and after objects contain pitch and zoom
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
    const { steps, distance, duration, coordinates, maneuver, nextManeuver } =
      options;

    // In meters per second
    const speed = distance / duration;

    // If a segment moves faster, use the speedOptions
    let segmentRoutingOptions =
      speedOptions?.speed && speedOptions?.speed < speed
        ? { ...routingOptions, ...speedOptions }
        : routingOptions;

    // If we've arrived, resolve early
    if (maneuver.type === 'arrive') {
      return resolve({ segmentComplete: true });
    }

    const currentBearing =
      map.getBearing() < 0 ? 360 + map.getBearing() : map.getBearing();
    // The maneuver in the step object is that which preceded the segment

    let bearing = await handleManeuver(map, maneuver, currentBearing);

    const targetRoute = coordinates;

    // multiplier is arbitrary. Duration is in seconds, but actual realistic timing is very slow
    const animationDuration = duration * durationMultiplier;
    // get the overall distance of each route so we can interpolate along them
    const routeDistance = turf.lineDistance(turf.lineString(targetRoute));

    let easeInPitch;
    let easeInZoom;
    let easeOutPitch;
    let easeOutZoom;

    let start;

    function frame(time) {
      // If we call a moment during a route, cancel the step
      if (JSON.stringify(steps) !== JSON.stringify(currentSteps)) {
        return resolve({ segmentComplete: true });
      }

      if (!start) start = time;
      // phase determines how far through the animation we are
      const phase = (time - start) / animationDuration;

      const alongRoute = turf.along(
        turf.lineString(targetRoute),
        routeDistance * phase
      ).geometry.coordinates;

      const alongLookAhead = turf.along(
        turf.lineString(targetRoute),
        routeDistance * Math.min(phase + 0.025, 1)
      ).geometry.coordinates;

      // phase is normalized between 0 and 1
      // when the animation is finished, reset start to loop the animation
      if (phase > 1) {
        return resolve({ segmentComplete: true });
      }

      let pitch;
      let zoom;

      // calculate the bearing based on the angle between the point we're at in the route and the look ahead point
      let nextBearing = normalizeBearing(
        turf.rhumbBearing(turf.point(alongRoute), turf.point(alongLookAhead))
      );
      bearing = smoothBearing(bearing, nextBearing);

      // Unsmoothed bearing for puck to more accurately reflect travel direction on route
      const puckRoute = targetRoute
        .slice(1)
        .concat([targetRoute[targetRoute.length - 1]]);
      const alongPuck = turf.along(
        turf.lineString(puckRoute),
        routeDistance * phase
      ).geometry.coordinates;
      const puckBearing = turf.rhumbBearing(
        turf.point(alongRoute),
        turf.point(alongPuck)
      );

      setPuckLocation(map, alongRoute, puckBearing);

      const distanceLeft = distance - distance * phase;

      const leadDistance = segmentRoutingOptions?.leadDistance;

      // ease into maneuver
      if (leadDistance && distanceLeft <= leadDistance) {
        if (!easeInPitch) easeInPitch = map.getPitch();
        if (!easeInZoom) easeInZoom = map.getZoom();

        const maneuverBehavior = maneuverOptions?.[nextManeuver?.type];

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
          // When there's not enough distance to cover on segment, we handle this faster
          Math.min(leadDistance, distance)
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
          Math.min(leadDistance, distance)
        );
        pitch = easedPosition.pitch;
        zoom = easedPosition.zoom;
      }
      // During a segment not near a maneuver
      else {
        pitch = segmentRoutingOptions.pitch;
        zoom = segmentRoutingOptions.zoom;
      }

      // We are using map.jumpTo since it requires less translation than using a camera object
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
const navigateSteps = async (map, steps) => {
  // Possible we want to reconsider using the lowResGeom
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const { distance, duration, geometry, maneuver } = step;
    const nextManeuver = steps?.[i + 1]?.maneuver;

    // If we call a moment during a route, cancel the route
    if (JSON.stringify(steps) !== JSON.stringify(currentSteps)) return;

    await navigate(map, {
      steps,
      duration,
      distance,
      coordinates: geometry.coordinates,
      maneuver,
      nextManeuver,
    });
  }

  return { routeComplete: true };
};

// Eases to the start of a route, then begins routing
const navigateRoute = async (map, route) => {
  const { coordinates, steps } = route;
  currentSteps = steps;

  if (!steps) return;

  return new Promise(res => {
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];

    const initialBearing = steps?.[0]?.maneuver?.bearing_after || 0;
    const includesArrive = steps[steps.length - 1]?.maneuver?.type === 'arrive';

    // Ease to the start of the route
    map.easeTo({
      center: start,
      speed: 0.2,
      curve: 1,
      duration: 1000,
      zoom: routingOptions.zoom,
      pitch: routingOptions.pitch,
      bearing: initialBearing,
    });

    map.once('moveend', () => {
      if (mapAssets[DESTINATION_PIN] && includesArrive) {
        setMarkerLayer(map, end, DESTINATION_PIN, {
          'icon-pitch-alignment': 'viewport',
          'icon-offset': [0, mapAssets[DESTINATION_PIN].height * -0.5],
        });
      }
      if (mapAssets[PUCK]) {
        setMarkerLayer(map, start, PUCK, {
          'icon-pitch-alignment': 'map',
          'icon-rotation-alignment': 'map',
        });
      }

      navigateSteps(map, steps).then(e => {
        res(e);
      });
    });
  });
};

export { navigateRoute };
