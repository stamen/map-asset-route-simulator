<script>
  import {
    config as configStore,
    mapStyle as mapStyleStore,
    deviceSize as deviceSizeStore,
  } from '../stores';
  import { Dropdown, TextInput } from 'carbon-components-svelte';
  import { fetchStyle } from '../fetch-style';

  export let routeFlag;

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
  let selectedDevice = devices[INITIAL_DEVICE_INDEX]?.id ?? 'custom';

  let widthInput = null;
  let heightInput = null;

  deviceSizeStore.subscribe(value => {
    if (value) {
      width = value.width;
      height = value.height;
      selectedDevice = value.id;
      if (selectedDevice === 'custom') {
        widthInput = width;
        heightInput = height;
      }
    }
  });

  let textInput = '';
  let localUrl = '';
  let error;

  const deviceDropdownItems = devices
    .map(device => {
      return { id: device.id, text: device.name };
    })
    .concat([{ id: 'custom', text: 'Responsive' }]);

  const styleDropdownItems = styles
    .map(style => {
      return { id: style.id, text: style.name };
    })
    .concat([{ id: 'custom', text: 'Custom URL' }]);

  let selected = styleDropdownItems?.[INITIAL_STYLE_INDEX]?.id;

  let style = styles[INITIAL_STYLE_INDEX].url;

  const getStyleFromUrl = async url => {
    let nextUrl = url;
    if (url.includes('localhost')) {
      const [preface, address] = nextUrl.split('localhost');
      // Fetch doesn't accept localhost unless prefaced with http://
      // This adds the preface if not present
      if (!preface) {
        nextUrl = `http://localhost${address}`;
      }
    }
    try {
      const data = await fetchStyle(nextUrl);
      if (data && typeof data === 'object') {
        style = data;
        localUrl = nextUrl;
        poll(nextUrl);
        return { status: '200', url: nextUrl };
      }
    } catch (err) {
      error = new Error('Style was not found.');
      return { status: '404', url: nextUrl };
    }
  };

  const submitCustomUrl = async () => {
    await getStyleFromUrl(textInput);
  };

  mapStyleStore.subscribe(value => {
    if (value) {
      style = value;
      const currentStyle =
        styles.find(item => item.url == value)?.id ?? 'custom';
      selected = currentStyle;
      if (currentStyle === 'custom') {
        textInput = value;
        submitCustomUrl();
      }
    }
  });

  const poll = url => {
    const pollCondition = str =>
      str && str.includes('localhost') && localUrl === str;
    // Simple polling for any style on localhost
    // Check that should poll to set timer
    if (pollCondition(url)) {
      // Check poll condition again to cancel action for a url
      setTimeout(() => pollCondition(url) && getStyleFromUrl(url), 3000);
    }
  };

  const handleSetStyle = e => {
    const { selectedId } = e.detail;
    selected = selectedId;
    if (selectedId === 'custom') {
      textInput = style;
      error = '';
      return;
    }
    textInput = '';
    localUrl = '';
    error = '';
    const nextStyle = styles.find(s => s.id === selectedId);
    style = nextStyle.url;
  };

  const handleSetDeviceSize = e => {
    const { selectedId } = e.detail;
    selectedDevice = selectedId;
    if (selectedId === 'custom') {
      widthInput = width;
      heightInput = height;
      return;
    }
    widthInput = null;
    heightInput = null;
    const device = devices.find(d => d.id === selectedId);
    width = device.width;
    height = device.height;
    deviceSizeStore.set(device);
  };

  const submitCustomDeviceSize = () => {
    const device = {
      id: 'custom',
      width: Number(widthInput),
      height: Number(heightInput),
    };
    width = device.width;
    height = device.height;
    deviceSizeStore.set(device);
  };

  $: {
    if (style) {
      const url = typeof style === 'string' ? style : localUrl;
      mapStyleStore.set(url);
    }
  }
</script>

<div class="panel">
  <div class="dropdown-container">
    <div class="dropdown">
      <Dropdown
        titleText="Devices"
        selectedId={selectedDevice}
        items={deviceDropdownItems}
        disabled={routeFlag}
        on:select={handleSetDeviceSize}
      />
    </div>
    {#if selectedDevice === 'custom'}
      <div class="custom-url-container">
        <TextInput
          placeholder="Enter height..."
          on:input={e => (heightInput = e.detail)}
          value={heightInput ?? ''}
        />

        <TextInput
          placeholder="Enter width..."
          on:input={e => (widthInput = e.detail)}
          value={widthInput ?? ''}
        />
        <button
          class="submit-button"
          on:click={submitCustomDeviceSize}
          disabled={!widthInput || !heightInput}>Submit</button
        >
      </div>
    {/if}
    <div class="dropdown">
      <Dropdown
        titleText="Map styles"
        selectedId={selected}
        items={styleDropdownItems}
        disabled={routeFlag}
        on:select={handleSetStyle}
      />
    </div>
    {#if selected === 'custom'}
      <div class="custom-url-container">
        <div>
          <TextInput
            placeholder="Enter map style url..."
            disabled={routeFlag}
            on:input={e => (textInput = e.detail)}
            value={textInput}
            on:focus={() => (error = '')}
          />
        </div>
        <button class="submit-button" on:click={submitCustomUrl}>Submit</button>
      </div>
      {#if error}
        <div class="error">Style not found</div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 300px;
    left: 0;
    border-left: 1px solid #666;
    align-items: center;
    padding-bottom: 24px;
    overflow: scroll;
  }

  .dropdown-container {
    margin-top: 36px;
    height: 36px;
    width: 270px;
  }

  .dropdown {
    margin-bottom: 12px;
    width: 100%;
  }

  .custom-url-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 12px;
    gap: 3px;
  }

  .submit-button {
    height: 40px;
    width: 100%;
  }

  .error {
    background-color: rgb(255, 130, 130);
    color: white;
    padding: 6px;
  }
</style>
