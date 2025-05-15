<script>
  import {
    config as configStore,
    mapStyle as mapStyleStore,
    deviceSize as deviceSizeStore,
  } from '../stores';
  import DeviceLayout from './DeviceLayout.svelte';
  import MapboxGlMapView from './MapboxGlMapView.svelte';

  const INITIAL_DEVICE_INDEX = 0;
  const INITIAL_STYLE_INDEX = 0;

  let devices;
  let styles;

  configStore.subscribe(value => {
    ({ devices } = value);
    ({ styles } = value);
  });

  let width = devices[INITIAL_DEVICE_INDEX].width;
  let height = devices[INITIAL_DEVICE_INDEX].height;

  deviceSizeStore.subscribe(value => {
    if (value) {
      width = value.width;
      height = value.height;
    }
  });

  let style = styles[INITIAL_STYLE_INDEX];

  mapStyleStore.subscribe(value => {
    if (value) {
      style = value;
    }
  });
</script>

<div class="display-area">
  <div class="device-container">
    <DeviceLayout
      {height}
      {width}
      children={MapboxGlMapView}
      childProps={style}
    />
  </div>
</div>

<style>
  .display-area {
    display: flex;
    height: 100%;
    flex-grow: 1;
    align-items: center;
    justify-content: center;
  }

  .device-container {
    /* Accounts for space at the top taken by dropdowns */
    margin-top: 120px;
  }
</style>
