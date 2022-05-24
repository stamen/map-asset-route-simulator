<script>
  import DisplayArea from './components/DisplayArea.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import {
    config as configStore,
    route as routeStore,
    mapState as mapStateStore,
  } from './stores';
  import { makeConfig } from './make-config';
  import { writeHash } from './query';

  export let localConfig;
  const config = makeConfig(localConfig);
  configStore.set(config);

  let mapState;
  mapStateStore.subscribe(value => {
    if (value && Object.keys(value).length) {
      mapState = value;
    } else {
      mapStateStore.set(config.mapState);
    }
  });

  let locationA;
  let locationB;
  routeStore.subscribe(value => {
    const { locationA: locA, locationB: locB } = value;
    locationA = locA || null;
    locationB = locB || null;
  });

  $: {
    if (mapState) {
      writeHash({ locationA, locationB, ...mapState });
    }
  }
</script>

<svelte:head>
  <base href="process.env.BASE_PATH" />
</svelte:head>
<main>
  <ControlPanel />
  <DisplayArea />
</main>

<style>
  main {
    display: flex;
    height: 100%;
  }
</style>
