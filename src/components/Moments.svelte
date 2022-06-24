<script>
  import * as turf from '@turf/turf';
  import { Dropdown } from 'carbon-components-svelte';
  import {
    route as routeStore,
    map as mapStore,
    fullScreenLoading as fullScreenLoadingStore,
  } from '../stores';
  import { navigateRoute } from '../navigate-route';

  let route;
  routeStore.subscribe(value => {
    if (value && value?.response) {
      route = value?.response?.routes?.[0];
    }
  });
  let map;
  mapStore.subscribe(value => (map = value));

  let fullScreenLoading = { loading: false };
  fullScreenLoadingStore.subscribe(value => (fullScreenLoading = value));

  const tempLeadDistance = 125;

  let maneuverRoutes = [];

  let maneuverDropdownItems = [];

  let selectedId;

  // Slices up the geometries to just show a maneuver with its lead time
  const setManeuverRoutes = route => {
    // We might want some kind of getter for this as opposed to doing this everywhere
    const legs = route.legs.reduce((acc, leg) => acc.concat(leg), []);
    const allSteps = legs
      .map(l => l.steps)
      .reduce((acc, steps) => acc.concat(steps), []);

    for (let i = 0; i < allSteps.length; i++) {
      const options = { units: 'meters' };

      const prevStep = allSteps?.[i - 1];
      const step = allSteps[i];

      const { geometry, duration, maneuver } = step;

      const prevGeom = prevStep?.geometry;

      const prevLength = prevGeom && turf.length(prevGeom, options);
      const length = turf.length(geometry, options);

      let slicedDistanceStart;
      let slicedDistanceEnd = Math.min(tempLeadDistance, length);

      let slicedStart = prevGeom;
      let slicedEnd = geometry;

      if (prevLength !== 0 && prevGeom) {
        slicedDistanceStart = Math.min(tempLeadDistance, prevLength);

        slicedStart = turf.lineSliceAlong(
          prevGeom,
          Math.max(0, prevLength - tempLeadDistance),
          prevLength,
          options
        )?.geometry;
      }
      if (slicedDistanceEnd !== 0) {
        slicedEnd = turf.lineSliceAlong(
          geometry,
          0,
          slicedDistanceEnd,
          options
        )?.geometry;
      }

      let slicedDurationStart =
        (Math.min(tempLeadDistance, prevLength) / prevLength) *
          prevStep?.duration ?? 0;

      let slicedDurationEnd =
        (Math.min(tempLeadDistance, length) / length) * duration;

      const stepOne = {
        geometry: slicedStart,
        distance: slicedDistanceStart,
        duration: slicedDurationStart,
        maneuver: { bearing_after: maneuver.bearing_before },
      };
      const stepTwo = {
        geometry: slicedEnd,
        distance: slicedDistanceEnd,
        duration: slicedDurationEnd,
        maneuver,
      };

      maneuverRoutes = maneuverRoutes.concat([
        {
          maneuver,
          // Departure doesn't have a before geometry so doesn't get a step one
          steps: slicedStart ? [stepOne, stepTwo] : [stepTwo],
          id: `${i}`,
        },
      ]);
    }
  };

  $: if (route) {
    setManeuverRoutes(route);
  }

  const navigate = maneuverRoute => {
    const maneuverRouteSteps = maneuverRoute?.steps || [];
    const coords = maneuverRouteSteps.reduce(
      (acc, step) => acc.concat(step?.geometry?.coordinates || []),
      []
    );
    const geometry = {
      ...maneuverRoute?.geometry,
      coordinates: coords,
    };

    const navRoute = { geometry, legs: [{ steps: maneuverRoute.steps }] };

    navigateRoute(map, navRoute);
  };

  $: if (maneuverRoutes.length) {
    maneuverDropdownItems = maneuverRoutes.map(item => {
      const { type, instruction } = item.maneuver;
      const text = `${type}: ${instruction}`;
      return { id: item.id, text };
    });
  }

  const selectManeuver = value => {
    selectedId = value;
  };

  const runManeuverRoute = () => {
    const maneuverRoute = maneuverRoutes.find(item => item.id === selectedId);
    navigate(maneuverRoute);
  };
</script>

<div class="container">
  <Dropdown
    titleText="Moments"
    {selectedId}
    label="Select a maneuver"
    items={maneuverDropdownItems}
    on:select={e => selectManeuver(e.detail.selectedId)}
  />
  <button
    class="primary-button"
    disabled={!selectedId}
    on:click={runManeuverRoute}>Submit</button
  >
</div>

<style>
  .container {
    width: 240px;
  }

  .primary-button {
    width: 240px;
    height: 36px;
    margin-top: 12px;
  }
</style>
