<script>
  import DeviceLayout from './DeviceLayout.svelte';
</script>

<div class="display-area">
  <DeviceLayout height={720} width={360} />
</div>

<style>
  .display-area {
    display: flex;
    height: 100%;
    flex-grow: 1;
    background-color: rgb(245, 245, 245);
    align-items: center;
    justify-content: center;
  }
</style>
