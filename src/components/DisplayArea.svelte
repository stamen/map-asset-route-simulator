<script>
  import { config as configStore } from '../stores';
  import { Dropdown } from 'carbon-components-svelte';
  import DeviceLayout from './DeviceLayout.svelte';

  const INITIAL_DEVICE_INDEX = 0;

  let devices;
  let styles;
  configStore.subscribe(value => {
    ({ devices } = value);
    ({ styles } = value);
  });

  let width = devices[INITIAL_DEVICE_INDEX].width;
  let height = devices[INITIAL_DEVICE_INDEX].height;

  const deviceDropdownItems = devices.map(device => {
    return { id: device.id, text: device.name };
  });

  const styleDropdownItems = styles.map(style => {
    return { id: style.id, text: style.name };
  });

  const handleSetStyle = e => {
    const { selectedId } = e.detail;
    const style = styles.find(s => s.id === selectedId);
    console.log(style);
  };

  const handleSetDeviceSize = e => {
    const { selectedId } = e.detail;
    const device = devices.find(d => d.id === selectedId);
    width = device.width;
    height = device.height;
  };
</script>

<div class="display-area">
  <div class="dropdown-container" style={`width:${width}px; max-width:360px`}>
    <div class="dropdown">
      <Dropdown
        titleText="Devices"
        selectedId={deviceDropdownItems?.[INITIAL_DEVICE_INDEX]?.id}
        items={deviceDropdownItems}
        on:select={handleSetDeviceSize}
      />
    </div>
    <div class="dropdown">
      <Dropdown
        titleText="Map styles"
        selectedId={styleDropdownItems?.[INITIAL_DEVICE_INDEX]?.id}
        items={styleDropdownItems}
        on:select={handleSetStyle}
      />
    </div>
  </div>
  <DeviceLayout {height} {width} />
</div>

<style>
  .display-area {
    display: flex;
    height: 100%;
    flex-grow: 1;
    align-items: center;
    justify-content: center;
  }

  .dropdown-container {
    position: absolute;
    top: 36px;
  }

  .dropdown {
    margin-bottom: 12px;
  }
</style>
