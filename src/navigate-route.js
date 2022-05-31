import * as turf from '@turf/turf';
import * as geolib from 'geolib';
import mapboxgl from 'mapbox-gl';

const LOOK_AHEAD_DISTANCE = 1;
const DURATION_MULTIPLIER = 100;
const CAMERA_ALTITUDE = 500;
const POV_DISTANCE = CAMERA_ALTITUDE * -1.5;

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

const getPovAndLookAtPoint = (point, bearing) => {
  const lookAtPoint = geolib.computeDestinationPoint(
    point,
    LOOK_AHEAD_DISTANCE,
    bearing
  );

  const povPoint = geolib.computeDestinationPoint(point, POV_DISTANCE, bearing);

  return { pov: povPoint, lookAt: lookAtPoint };
};

const handleManeuver = (map, maneuver) => {
  return new Promise((resolve, reject) => {
    let { bearing_before, bearing_after, location, modifier, type } = maneuver;

    let start;
    let bearing = bearing_before;

    // This is to prevent stopping on the route during slight turns like on or off ramps
    if (!type.includes('turn')) return resolve(bearing);

    const isClockwise = modifier.includes('left') ? false : true;

    const animationDuration =
      (calculatePointDistance(bearing_before, bearing_after, isClockwise) *
        DURATION_MULTIPLIER) /
      10;

    function frame(time) {
      if (!start) start = time;
      const phase = (time - start) / animationDuration;

      if (phase > 1) {
        return resolve();
      }

      const camera = map.getFreeCameraOptions();

      const maneuverPoint = {
        longitude: location[0],
        latitude: location[1],
      };

      if (type !== 'arrive') {
        bearing = calculateBearing(
          bearing_before,
          bearing_after,
          isClockwise,
          phase
        );
      }

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

const navigate = (map, options) => {
  return new Promise((resolve, reject) => {
    const { duration, coordinates, maneuver, nextManeuver } = options;

    const targetRoute = coordinates;
    const lookAheadIndex = 1;
    const lookAheadRoute = coordinates
      .slice(lookAheadIndex)
      .concat(Array(lookAheadIndex).fill(coordinates[coordinates.length - 1]));

    // TODO resolve actual timing
    // 10 multiplier is arbitrary. Duration is in seconds, but actual realistic timing is very slow
    const animationDuration = duration * DURATION_MULTIPLIER;
    // get the overall distance of each route so we can interpolate along them
    const routeDistance = turf.lineDistance(turf.lineString(targetRoute));
    const lookAheadDistance = turf.lineDistance(
      turf.lineString(lookAheadRoute)
    );

    let start;
    let bearingBefore = maneuver.bearing_after;
    let bearing = bearingBefore;

    function frame(time) {
      if (!start) start = time;
      // phase determines how far through the animation we are
      const phase = (time - start) / animationDuration;

      // use the phase to get a point that is the appropriate distance along the route
      // this approach syncs the camera and route positions ensuring they move
      // at roughly equal rates even if they don't contain the same number of points
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
        if (!nextManeuver) return resolve({ segmentComplete: true });

        // We don't need to resolve anything, but this helps for documentation
        // handle maneuver
        return handleManeuver(map, nextManeuver).then(bearing => {
          return resolve({ segmentComplete: true });
        });
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

      // calculate the bearing based on the angle between the point we're at in the route and the look ahead point
      bearing = geolib.getRhumbLineBearing(routePoint, lookAheadPoint);

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

// Takes the low rest route geometry from overview and slices it to the length of the step geometry
// If this fails, we can simplify the geojson another way
const getCameraRoute = (routeCoords, lowResRouteCoords) => {
  let routeStart = routeCoords[0];
  let routeEnd = routeCoords[routeCoords.length - 1];
  routeStart = { longitude: routeStart[0], latitude: routeStart[1] };
  routeEnd = { longitude: routeEnd[0], latitude: routeEnd[1] };
  lowResRouteCoords = lowResRouteCoords.map(coord => ({
    longitude: coord[0],
    latitude: coord[1],
  }));
  const cameraRouteStart = geolib.findNearest(routeStart, lowResRouteCoords);
  const cameraRouteEnd = geolib.findNearest(routeEnd, lowResRouteCoords);

  const sliceStartIndex = lowResRouteCoords.findIndex(
    item => JSON.stringify(item) === JSON.stringify(cameraRouteStart)
  );
  const sliceEndIndex =
    lowResRouteCoords.findIndex(
      item => JSON.stringify(item) === JSON.stringify(cameraRouteEnd)
    ) + 1;

  const slicedRoute = lowResRouteCoords.slice(sliceStartIndex, sliceEndIndex);

  return slicedRoute.map(item => [item.longitude, item.latitude]);
};

const navigateRoute = async (map, route, lowResGeom) => {
  for (const leg of route.legs) {
    for (let i = 0; i < leg.steps.length; i++) {
      const step = leg.steps[i];
      const { duration, geometry, maneuver, intersections } = step;
      const nextManeuver = leg.steps?.[i + 1]?.maneuver || maneuver;

      const cameraRoute = getCameraRoute(
        geometry.coordinates,
        lowResGeom.coordinates
      );

      await navigate(map, {
        duration,
        coordinates: cameraRoute,
        maneuver,
        nextManeuver,
        intersections,
      });
    }
  }
};

export { navigateRoute };
