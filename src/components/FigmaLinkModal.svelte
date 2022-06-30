<script>
  import { tick } from 'svelte';
  import { Modal, Toggle, TextInput } from 'carbon-components-svelte';
  import {
    config as configStore,
    fullScreenLoading as fullScreenLoadingStore,
    map as mapStore,
    mapAssets as mapAssetsStore,
  } from '../stores';
  import { addFigmaImages } from '../add-figma-images';
  import { MAP_ASSET_ICONS } from '../constants';

  let figmaLink;
  configStore.subscribe(value => ({ figmaLink } = value));

  let map;
  mapStore.subscribe(value => (map = value));

  let open = false;
  let useDefaultAssets = false;

  let fileKey = figmaLink?.fileKey ?? null;
  let personalAccessToken = figmaLink?.personalAccessToken ?? null;
  let puckFrame = figmaLink?.puck ?? null;
  let destinationPinFrame = figmaLink?.['destination-pin'] ?? null;

  let disableSubmit = false;

  const addImages = () => {
    fullScreenLoadingStore.set({
      loading: true,
      helperText: 'Loading assets',
    });
    addFigmaImages(map)
      .then(addedIcons => {
        mapAssetsStore.update(store => {
          return Object.keys(store).reduce((acc, k) => {
            acc[k] = addedIcons.find(item => item.name === k) ?? null;
            return acc;
          }, {});
        });
        fullScreenLoadingStore.set({
          loading: false,
        });
      })
      .catch(err => {
        fullScreenLoadingStore.set({
          loading: false,
        });
        console.error(err);
      });
  };

  const removeImage = async id => {
    const loading = cb => {
      if (map.hasImage(id)) {
        map.removeImage(id);
        setTimeout(() => loading(cb), 150);
      } else {
        cb();
      }
    };
    return new Promise(res => loading(res));
  };

  const addDefaultImages = async () => {
    const icons = [
      { name: 'puck', path: '/assets/puck.png' },
      { name: 'destination-pint', path: '/assets/destination-pin.png' },
    ];
    for (const icon of icons) {
      await removeImage(icon.name);
      map.loadImage(icon.path, (error, image) => {
        if (error) reject(error);

        map.addImage(icon.name, image);
        mapAssetsStore.update(store => {
          return {
            ...store,
            [icon.name]: {
              name: icon.name,
              url: icon.path,
              width: image.width,
              height: image.height,
            },
          };
        });
      });
    }
  };

  const isFilledOut = () => {
    return (
      !!fileKey && !!personalAccessToken && !!puckFrame && !!destinationPinFrame
    );
  };

  const toggleDefaultAssets = async value => {
    useDefaultAssets = value;
    if (useDefaultAssets) {
      addDefaultImages();
    } else {
      for (const icon of MAP_ASSET_ICONS) {
        await removeImage(icon);
      }

      if (isFilledOut) {
        onSubmit();
      }
    }
  };

  const getNextFigmaLink = () => {
    return {
      'destination-pin': destinationPinFrame,
      puck: puckFrame,
      fileKey: fileKey,
      personalAccessToken: personalAccessToken,
      scale: 1,
    };
  };

  const onSubmit = () => {
    if (!isFilledOut()) {
      return;
    }
    const nextFigmaLink = getNextFigmaLink();

    configStore.update(value => ({ ...value, figmaLink: nextFigmaLink }));
    tick();
    addImages();
  };

  const isChanged = () => {
    const nextFigmaLink = getNextFigmaLink();
    return Object.entries(nextFigmaLink).some(kv => {
      const [k, v] = kv;
      return figmaLink?.[k] !== v;
    });
  };

  $: if (fileKey && personalAccessToken && puckFrame && destinationPinFrame) {
    disableSubmit = !isChanged();
  }
</script>

<div>
  <button class="primary-button" on:click={() => (open = true)}
    >Figma link</button
  >
</div>

<Modal bind:open modalHeading="Figma link" size="sm" passiveModal>
  <div class="modal-container">
    <div class="default-toggle-container">
      Use default map assets
      <div class="default-toggle mb12">
        <div class="toggle-container">
          <Toggle
            labelA=""
            labelB=""
            size="sm"
            toggled={useDefaultAssets}
            on:toggle={e => toggleDefaultAssets(e.detail.toggled)}
          />
        </div>
      </div>
    </div>
    <div class="mb12">
      Note: Figma link set via modal is not persisted via url. To persist on
      refresh, it must be set in the config to protect your private keys.
    </div>
    <div class="mb12">
      <TextInput
        labelText="Personal access token:"
        on:input={e => (personalAccessToken = e.detail)}
        value={personalAccessToken}
        disabled={useDefaultAssets}
      />
    </div>
    <div class="mb12">
      <TextInput
        labelText="File key:"
        on:input={e => (fileKey = e.detail)}
        value={fileKey}
        disabled={useDefaultAssets}
      />
    </div>
    <div class="mb12">
      <TextInput
        labelText="puck frame:"
        helperText="Icon within frame must be named `puck`"
        on:input={e => (puckFrame = e.detail)}
        value={puckFrame}
        disabled={useDefaultAssets}
      />
    </div>
    <div class="mb12">
      <TextInput
        labelText="destination-pin frame:"
        helperText="Icon within frame must be named `destination-pin`"
        on:input={e => (destinationPinFrame = e.detail)}
        value={destinationPinFrame}
        disabled={useDefaultAssets}
      />
    </div>
    <div class="submit-button-container">
      <button
        class="primary-button"
        on:click={() => {
          onSubmit();
          open = false;
        }}
        disabled={useDefaultAssets || disableSubmit}>Submit</button
      >
    </div>
  </div>
</Modal>

<style>
  .modal-container {
    display: flex;
    flex-direction: column;
    margin-top: 12px;
  }

  .mb12 {
    margin-bottom: 12px;
  }

  .submit-button-container {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .primary-button {
    margin-top: 12px;
    width: 240px;
    height: 36px;
  }

  .toggle-container {
    position: absolute;
    /* Accounts for label space that we don't use */
    top: -16px;
  }

  .default-toggle {
    height: 16px;
    position: relative;
    background-color: thistle;
    margin-left: 12px;
  }

  .default-toggle-container {
    display: flex;
  }
</style>
