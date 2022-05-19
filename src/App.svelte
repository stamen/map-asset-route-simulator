<script>
  import DisplayArea from './components/DisplayArea.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import { config as configStore } from './stores';

  export let localConfig;
  const config = makeConfig(localConfig);

  configStore.set(config);
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
