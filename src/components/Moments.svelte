<script>
  import * as turf from '@turf/turf';
  import { Dropdown } from 'carbon-components-svelte';
  import {
    route as routeStore,
    map as mapStore,
    config as configStore,
  } from '../stores';
  import { navigateRoute } from '../navigate-route';
  import { setupRecording, encodePixels, downloadMp4 } from '../record-screen';

  export let routeFlag;
  export let setRouteFlag;

  let recordFlag = false;

  let route = null;
  routeStore.subscribe(value => {
    if (value && value?.response) {
      route = value?.response;
    } else {
      route = null;
    }
  });
  let map;
  mapStore.subscribe(value => (map = value));
  let routingOptions;
  let speedOptions;
  configStore.subscribe(value => ({ routingOptions, speedOptions } = value));

  let maneuverRoutes = [];

  let maneuverDropdownItems = [];

  let selectedId;

  // Slices up the geometries to just show a maneuver with its lead time
  const setManeuverRoutes = route => {
    const allSteps = route.steps;

    for (let i = 0; i < allSteps.length; i++) {
      const options = { units: 'meters' };

      // For each maneuver, we need the lead time from the previous step as well as
      // The maneuver and step following
      const prevStep = allSteps?.[i - 1];
      const step = allSteps[i];

      const { distance, geometry, duration, maneuver } = step;

      const prevGeom = prevStep?.geometry;

      const prevLength = prevGeom && turf.length(prevGeom, options);
      const length = turf.length(geometry, options);

      const prevSpeed = prevStep && prevStep?.distance / prevStep?.duration;
      const speed = distance / duration;

      const prevLeadDistance =
        prevSpeed && prevSpeed >= speedOptions?.speed
          ? speedOptions?.leadDistance
          : routingOptions?.leadDistance;
      const leadDistance =
        speed && speed >= speedOptions?.speed
          ? speedOptions?.leadDistance
          : routingOptions?.leadDistance;

      let slicedStart = prevGeom;
      let slicedEnd = geometry;

      let slicedDistanceStart =
        prevLength && Math.min(prevLeadDistance, prevLength);
      let slicedDistanceEnd = Math.min(leadDistance, length);

      if (prevLength) {
        slicedStart = turf.lineSliceAlong(
          prevGeom,
          Math.max(0, prevLength - prevLeadDistance),
          prevLength,
          options
        )?.geometry;
      }
      if (slicedDistanceEnd) {
        slicedEnd = turf.lineSliceAlong(
          geometry,
          0,
          slicedDistanceEnd,
          options
        )?.geometry;
      }

      let slicedDurationStart =
        (Math.min(prevLeadDistance, prevLength) / prevLength) *
          prevStep?.duration ?? 0;

      let slicedDurationEnd =
        (Math.min(leadDistance, length) / length) * duration;

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

  $: {
    if (route) {
      setManeuverRoutes(route);
    } else {
      maneuverRoutes = [];
    }
  }

  $: if (!routeFlag) {
    recordFlag = false;
  }

  const navigate = async maneuverRoute => {
    const maneuverRouteSteps = maneuverRoute?.steps || [];
    const coords = maneuverRouteSteps.reduce(
      (acc, step) => acc.concat(step?.geometry?.coordinates || []),
      []
    );
    const navRoute = { coordinates: coords, steps: maneuverRoute.steps };

    setRouteFlag(true);
    await navigateRoute(map, navRoute);
    setRouteFlag(false);
  };

  $: {
    maneuverDropdownItems = maneuverRoutes.map(item => {
      const { type, instruction } = item.maneuver;
      const text = `${type}: ${instruction}`;
      return { id: item.id, text };
    });
  }

  const selectManeuver = value => {
    selectedId = value;
  };

  const runManeuverRoute = async () => {
    const maneuverRoute = maneuverRoutes.find(item => item.id === selectedId);
    await navigate(maneuverRoute);
  };

  const record = async () => {
    const { maneuver } = maneuverRoutes.find(item => item.id === selectedId);
    let fileName = maneuver?.instruction || maneuver?.type;
    fileName = fileName.toLowerCase().replaceAll(' ', '-');
    recordFlag = true;
    await setupRecording(map);
    map.on('render', encodePixels);
    await runManeuverRoute();
    map.off('render', encodePixels);
    downloadMp4(fileName);
    recordFlag = false;
  };
</script>

<div class="container">
  <div class="dropdown-container">
    <Dropdown
      titleText="Moments"
      {selectedId}
      label="Select a maneuver"
      items={maneuverDropdownItems}
      disabled={!maneuverRoutes.length}
      on:select={e => selectManeuver(e.detail.selectedId)}
    />
  </div>
  <button
    class="primary-button"
    disabled={!selectedId || !maneuverRoutes.length}
    on:click={runManeuverRoute}>Submit</button
  >
  <button
    class="primary-button"
    disabled={!selectedId || !maneuverRoutes.length}
    on:click={record}>Record</button
  >
</div>
{#if recordFlag}
  <div class="record" />
{/if}

<style>
  .record {
    position: absolute;
    top: 0;
    right: 0;
    margin-top: 12px;
    margin-right: 12px;
    border-radius: 50%;
    height: 18px;
    width: 18px;
    background-color: red;
  }

  .container {
    width: 240px;
  }

  .dropdown-container {
    margin-bottom: 12px;
  }

  .primary-button {
    width: 240px;
    height: 36px;
    margin-bottom: 3px;
  }
</style>
