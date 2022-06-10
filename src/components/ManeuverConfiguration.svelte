<script>
  import { createEventDispatcher } from 'svelte';
  import { faPlus, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa/src/fa.svelte';
  import { NumberInput, Dropdown } from 'carbon-components-svelte';
  import {
    MANEUVERS,
    PITCH_MIN,
    PITCH_MAX,
    ZOOM_MIN,
    ZOOM_MAX,
    NUMBER_INPUT_STEPS,
  } from '../constants';

  const dispatch = createEventDispatcher();

  // Optional
  export let maneuverOptions;
  export let defaultZoom;
  export let defaultPitch;

  let editMode = false;
  let editManeuver;

  const defaultOptions = {
    zoom: defaultZoom,
    pitch: defaultPitch,
  };
  let editOptions = defaultOptions;

  const maneuverDropdownItems = MANEUVERS.map(name => ({
    id: name,
    text: name,
  }));

  const getSetManeuvers = () => {
    const maneuvers = Object.keys(maneuverOptions)
      .filter(k => MANEUVERS.includes(k))
      .map(k => ({ name: k, options: maneuverOptions[k] }));
    return maneuvers;
  };

  let setManeuvers = getSetManeuvers();

  $: if (maneuverOptions) {
    setManeuvers = getSetManeuvers();
  }

  const isEditConfigDefault = () => {
    const isDefault = Object.entries(editOptions).every(kv => {
      const [k, v] = kv;
      return defaultOptions[k] === v;
    });
    return isDefault;
  };

  let editConfigIsDefault = isEditConfigDefault();

  $: if (editOptions) {
    editConfigIsDefault = isEditConfigDefault();
  }

  const selectAddManeuver = selectedId => {
    editManeuver = selectedId;
    editOptions = { ...editOptions, ...(maneuverOptions[editManeuver] ?? {}) };
  };

  const cancelEditMode = () => {
    editOptions = defaultOptions;
    editMode = false;
    editManeuver = undefined;
  };

  const setProperty = (property, value) => {
    const step = NUMBER_INPUT_STEPS[property] ?? 0.1;
    const decimal = `${step}`.split('.')[1]?.length ?? 0;
    editOptions[property] = Number(value.toFixed(decimal));
  };

  const submitEditOptions = () => {
    if (!editConfigIsDefault) {
      const nextManeuverOptions = {
        ...maneuverOptions,
        [editManeuver]: editOptions,
      };

      dispatch('setManeuverOptions', nextManeuverOptions);
    }

    cancelEditMode();
  };

  const editExistingManeuver = id => {
    editMode = true;
    selectAddManeuver(id);
  };

  const removeManeuver = id => {
    const nextManeuverOptions = maneuverOptions;
    delete nextManeuverOptions[id];
    dispatch('setManeuverOptions', nextManeuverOptions);
  };
</script>

<div class="options">
  <div class="option">
    Maneuver options: <div>
      <button
        class="button"
        disabled={editMode}
        on:click={() => (editMode = true)}
        ><Fa icon={faPlus} /> Add a maneuver config</button
      >
    </div>
  </div>
  {#if editMode}
    <div class="option add-maneuver">
      <Dropdown
        titleText="Maneuvers"
        items={maneuverDropdownItems}
        label="Select a maneuver"
        selectedId={editManeuver}
        on:select={e => selectAddManeuver(e.detail.selectedId)}
      />
      {#if editMode && editManeuver}
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="pitch"
            value={editOptions.pitch}
            step={NUMBER_INPUT_STEPS['pitch']}
            min={PITCH_MIN}
            max={PITCH_MAX}
            on:change={e => setProperty('pitch', e.detail)}
          />
        </div>
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="zoom"
            value={editOptions.zoom}
            step={NUMBER_INPUT_STEPS['zoom']}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            on:change={e => setProperty('zoom', e.detail)}
          />
        </div>
        <div class="button-container">
          <button
            class="button"
            on:click={submitEditOptions}
            disabled={editConfigIsDefault}
            title={editConfigIsDefault
              ? 'Settings must be different from the default'
              : ''}>Submit</button
          ><button on:click={cancelEditMode} class="button">Cancel</button>
        </div>
      {/if}
    </div>
  {/if}
  Configured maneuvers:
  <div class="maneuver-list">
    <div class="scroll-window">
      {#if !setManeuvers.length}
        <div class="message-container">
          <div class="message">Configured maneuvers will appear here</div>
        </div>
      {/if}
      {#each setManeuvers as maneuverObj}
        <div class="set-maneuver">
          <div class="maneuver-actions">
            <button
              class="action-button"
              on:click={() => editExistingManeuver(maneuverObj.name)}
              ><Fa icon={faPencil} /></button
            >
            <button
              class="action-button"
              on:click={() => removeManeuver(maneuverObj.name)}
              ><Fa icon={faTrash} /></button
            >
          </div>
          <div class="bold">{maneuverObj.name}</div>
          <div>
            Pitch: <span class="code"
              >{maneuverObj.options.pitch ?? defaultPitch}</span
            >
          </div>
          <div>
            Zoom: <span class="code"
              >{maneuverObj.options.zoom ?? defaultZoom}</span
            >
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .options {
    display: flex;
    flex-direction: column;
    width: 300px;
    height: 100%;
  }

  .option {
    margin-bottom: 24px;
  }

  .bold {
    font-weight: bold;
  }

  .code {
    font-family: 'Courier New', Courier, monospace;
  }

  .maneuver-list {
    flex-grow: 1;
    height: 0px;
  }

  .set-maneuver {
    background-color: #f4f4f4;
    padding: 6px;
    margin-bottom: 6px;
    position: relative;
  }

  .scroll-window {
    padding: 12px;
    height: 100%;
    overflow: scroll;
    border: 1px solid lightgray;
  }

  .number-input-container {
    width: 100%;
    margin-top: 6px;
    display: flex;
  }

  .add-maneuver {
    border-left: 1px solid lightgray;
    padding-left: 6px;
  }

  .button-container {
    margin-top: 12px;
    width: 100%;
    height: 30px;
    display: flex;
    justify-content: center;
  }

  .button {
    height: 30px;
    margin-right: 6px;
  }

  .maneuver-actions {
    position: absolute;
    top: 6px;
    right: 6px;
  }

  .action-button {
    padding: 6px;
    margin-left: 3px;
  }

  .message-container {
    display: flex;
    height: 100%;
    justify-content: center;
    align-items: center;
  }

  .message {
    font-weight: bold;
    font-size: 36px;
    color: #f4f4f4;
    text-align: center;
  }
</style>
