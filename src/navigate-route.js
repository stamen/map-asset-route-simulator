import * as turf from '@turf/turf';
import * as geolib from 'geolib';
import mapboxgl from 'mapbox-gl';

const navigateRoute = (map, options) => {
  return new Promise((resolve, reject) => {
    const { distance, duration, coordinates, intersections } = options;
    const targetRoute = coordinates;
    const cameraRoute = coordinates;

    // TODO resolve actual timing
    // 10 multiplier is arbitrary. Duration is in seconds, but actual realistic timing is very slow
    const animationDuration = duration * 10;
    const cameraAltitude = 4000;
    // get the overall distance of each route so we can interpolate along them
    const routeDistance = turf.lineDistance(turf.lineString(targetRoute));
    const cameraRouteDistance = turf.lineDistance(turf.lineString(cameraRoute));

    let start;

    function frame(time) {
      if (!start) start = time;
      // phase determines how far through the animation we are
      const phase = (time - start) / animationDuration;

      // phase is normalized between 0 and 1
      // when the animation is finished, reset start to loop the animation
      if (phase > 1) {
        // We don't need to resolve anything, but this helps for documentation
        return resolve({ segmentComplete: true });
      }

      // use the phase to get a point that is the appropriate distance along the route
      // this approach syncs the camera and route positions ensuring they move
      // at roughly equal rates even if they don't contain the same number of points
      const alongRoute = turf.along(
        turf.lineString(targetRoute),
        routeDistance * phase
      ).geometry.coordinates;

      const alongCamera = turf.along(
        turf.lineString(cameraRoute),
        cameraRouteDistance * phase
      ).geometry.coordinates;

      const camera = map.getFreeCameraOptions();

      // Find any intersection for bearing
      const intersection = intersections.find(
        inter =>
          inter.location[0] === alongCamera[0] &&
          inter.location[1] === alongCamera[1]
      );

      const currentPoint = {
        longitude: alongRoute[0],
        latitude: alongRoute[1],
      };

      let lookAhead = currentPoint;

      if (intersection) {
        const { in: bearingIn, out: bearingOut, bearings } = intersection;
        const bearing = bearings[bearingOut];
        lookAhead = geolib.computeDestinationPoint(currentPoint, 100, bearing);
      }

      // set the position and altitude of the camera
      camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
        {
          lng: alongCamera[0],
          lat: alongCamera[1],
        },
        cameraAltitude
      );

      // tell the camera to look at a point along the route
      //   camera.lookAtPoint({
      //     lng: lookAhead.longitude, // alongRoute[0],
      //     lat: lookAhead.latitude, // alongRoute[1],
      //   });

      map.setFreeCameraOptions(camera);

      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  });
};

export { navigateRoute };
