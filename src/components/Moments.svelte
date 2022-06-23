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
      const prevStep = allSteps?.[i - 1];
      const step = allSteps[i];
      const { geometry, duration, maneuver } = step;
      const options = { units: 'meters' };
      const length = turf.length(geometry, options);
      const slicedDistance = Math.min(tempLeadDistance, length);

      const prevGeom = prevStep?.geometry ?? {
        type: 'LineString',
        coordinates: [maneuver.location],
      };
      const prevLength = turf.length(prevGeom, options);

      let slicedStart = geometry;
      let slicedEnd = geometry;

      if (prevLength !== 0) {
        slicedStart = turf.lineSliceAlong(
          prevGeom,
          Math.max(0, prevLength - tempLeadDistance),
          prevLength,
          options
        )?.geometry;
      }
      if (slicedDistance !== 0) {
        slicedEnd = turf.lineSliceAlong(
          geometry,
          0,
          slicedDistance,
          options
        )?.geometry;
      }

      const slicedDuration =
        (Math.min(tempLeadDistance, length) / length) * duration;

      const stepOne = {
        geometry: slicedStart,
        distance: slicedDistance,
        duration: slicedDuration,
        maneuver: { bearing_after: maneuver.bearing_before },
      };
      const stepTwo = {
        geometry: slicedEnd,
        distance: slicedDistance,
        duration: slicedDuration,
        maneuver,
      };

      maneuverRoutes = maneuverRoutes.concat([
        { maneuver, steps: [stepOne, stepTwo], id: `${i}` },
      ]);
    }
  };

  $: if (route) {
    setManeuverRoutes(route);
  }

  const navigate = maneuverRoute => {
    const coords = maneuverRoute?.steps?.[0]?.geometry?.coordinates.concat(
      maneuverRoute?.steps?.[1]?.geometry?.coordinates
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
