<script>
  import DisplayArea from './components/DisplayArea.svelte';
  import ControlPanel from './components/ControlPanel.svelte';

  export let localConfig;
  console.log(localConfig);
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
