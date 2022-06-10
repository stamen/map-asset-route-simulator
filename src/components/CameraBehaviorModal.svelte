<script>
  import { Modal, NumberInput, Slider, Toggle } from 'carbon-components-svelte';
  import { config as configStore } from '../stores';
  import ManeuverConfiguration from './ManeuverConfiguration.svelte';
  import {
    PITCH_MIN,
    PITCH_MAX,
    ZOOM_MIN,
    ZOOM_MAX,
    SPEED_MIN,
    SPEED_MAX,
    NUMBER_INPUT_STEPS,
  } from '../constants';

  // Required
  let durationMultiplier;
  // Required
  let routingOptions;
  // Optional
  let speedOptions;
  // Optional
  let maneuverOptions;
  configStore.subscribe(
    value =>
      ({ durationMultiplier, routingOptions, maneuverOptions, speedOptions } =
        value)
  );

  let open = true;

  let speedOptionsToggle = speedOptions !== undefined;

  const defaultSpeedOptions = {
    threshold: 0,
    leadDistance: 100,
    zoom: routingOptions.zoom,
    pitch: routingOptions.pitch,
  };

  const setRoutingOptions = (property, value) => {
    const step = NUMBER_INPUT_STEPS[property] ?? 0.1;
    const decimal = `${step}`.split('.')[1]?.length ?? 0;
    const nextRoutingOptions = {
      ...routingOptions,
      [property]: Number(value.toFixed(decimal)),
    };
    const isCurrent = Object.entries(nextRoutingOptions).every(kv => {
      const [k, v] = kv;
      return routingOptions[k] === v;
    });
    if (!isCurrent) {
      configStore.update(v => ({ ...v, routingOptions: nextRoutingOptions }));
    }
  };

  const setSpeedOptions = (property, value) => {
    const step = NUMBER_INPUT_STEPS[property] ?? 0.1;
    const decimal = `${step}`.split('.')[1]?.length ?? 0;
    const nextSpeedOptions = {
      ...speedOptions,
      [property]: Number(value.toFixed(decimal)),
    };
    const isCurrent = Object.entries(nextSpeedOptions).every(kv => {
      const [k, v] = kv;
      return speedOptions[k] === v;
    });
    const isDefault = Object.entries(nextSpeedOptions).every(kv => {
      const [k, v] = kv;
      return defaultSpeedOptions[k] === v;
    });
    if (isCurrent) return;
    configStore.update(v => {
      if (isDefault) {
        delete v.speedOptions;
        return v;
      }
      return { ...v, speedOptions: nextSpeedOptions };
    });
  };

  const setDurationMultiplier = value => {
    configStore.update(v => ({ ...v, durationMultiplier: value }));
  };

  const toggleSpeedOptions = value => {
    speedOptionsToggle = value;
    if (!speedOptionsToggle) {
      speedOptions = defaultSpeedOptions;
    }
  };

  const handleSetManeuverOptions = e => {
    const options = e.detail;
    configStore.update(v => ({ ...v, maneuverOptions: options }));
  };
</script>

<button on:click={() => (open = true)}>Adjust camera behavior</button>

<Modal bind:open modalHeading="Camera behavior" passiveModal>
  <div class="modal-container">
    <div class="options">
      <div class="option">
        <div class="number-input-container">
          <Slider
            min={1}
            max={1000}
            value={durationMultiplier}
            labelText="Duration multiplier"
            on:change={e => setDurationMultiplier(e.detail)}
          />
        </div>
      </div>
      <div class="option">
        Routing options:
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="Maneuver lead distance"
            value={routingOptions.leadDistance}
            min={0}
            max={500}
            step={1}
            on:change={e => setRoutingOptions('leadDistance', e.detail)}
          />
        </div>
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="pitch"
            value={routingOptions.pitch}
            min={PITCH_MIN}
            max={PITCH_MAX}
            step={NUMBER_INPUT_STEPS['pitch']}
            on:change={e => setRoutingOptions('pitch', e.detail)}
          />
        </div>
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="zoom"
            value={routingOptions.zoom}
            step={NUMBER_INPUT_STEPS['zoom']}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            on:change={e => setRoutingOptions('zoom', e.detail)}
          />
        </div>
      </div>
      <div class="option">
        <div class="label-toggle">
          <span>Speed options:</span>
          <div class="toggle-container">
            <Toggle
              labelA=""
              labelB=""
              size="sm"
              toggled={speedOptionsToggle}
              on:toggle={e => toggleSpeedOptions(e.detail.toggled)}
            />
          </div>
        </div>
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="Maneuver lead distance"
            value={speedOptions.leadDistance ?? routingOptions.leadDistance}
            min={0}
            max={500}
            step={1}
            disabled={!speedOptionsToggle}
            on:change={e => setSpeedOptions('leadDistance', e.detail)}
          />
        </div>
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="threshold (meters/second)"
            value={speedOptions.speed ?? 0}
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={NUMBER_INPUT_STEPS['pitch']}
            disabled={!speedOptionsToggle}
            on:change={val => setSpeedOptions('speed', val.detail)}
          />
        </div>
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="pitch"
            value={speedOptions.pitch ?? routingOptions.pitch}
            min={PITCH_MIN}
            max={PITCH_MAX}
            step={NUMBER_INPUT_STEPS['pitch']}
            disabled={!speedOptionsToggle}
            on:change={val => setSpeedOptions('pitch', val.detail)}
          />
        </div>
        <div class="number-input-container">
          <NumberInput
            size="sm"
            label="zoom"
            value={speedOptions.zoom ?? routingOptions.zoom}
            step={NUMBER_INPUT_STEPS['zoom']}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            disabled={!speedOptionsToggle}
            on:change={val => setSpeedOptions('zoom', val.detail)}
          />
        </div>
      </div>
    </div>
    <!-- Maneuvers side we will break this out into its own component -->
    <div class="options">
      <ManeuverConfiguration
        {maneuverOptions}
        defaultPitch={routingOptions.pitch}
        defaultZoom={routingOptions.zoom}
        on:setManeuverOptions={handleSetManeuverOptions}
      />
    </div>
  </div>
</Modal>

<style>
  .modal-container {
    display: flex;
    justify-content: space-between;
    height: 600px;
  }

  .options {
    display: flex;
    flex-direction: column;
    width: 300px;
    height: 100%;
  }

  .option {
    margin-bottom: 24px;
  }

  .number-input-container {
    width: 100%;
    margin-top: 6px;
  }

  .label-toggle {
    display: flex;
    justify-content: space-between;
  }

  .toggle-container {
    /* This is ugly because these carbon components require labels, we should replace them probably */
    margin-top: -16px;
    height: 16px;
    width: 32px;
    display: flex;
  }

  :global(.bx--slider) {
    position: relative;
    width: 80%;
    min-width: 144px;
    max-width: 144px;
    padding: 1rem 0;
    margin: 0 1rem;
    cursor: pointer;
  }
</style>
