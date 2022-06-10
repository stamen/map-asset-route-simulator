<script>
  import { Modal, NumberInput, Slider, Toggle } from 'carbon-components-svelte';
  import { config as configStore } from '../stores';
  import ManeuverConfiguration from './ManeuverConfiguration.svelte';
  import RoutingOptions from './RoutingOptions.svelte';
  import { NUMBER_INPUT_STEPS } from '../constants';

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

  const setRoutingOptions = ({ property, value }) => {
    // We only have to do this because of a weird bug in the number input
    // We should switch out our number inputs to a separate component system or build our own
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

  const setSpeedOptions = ({ property, value }) => {
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
      configStore.update(v => {
        delete v.speedOptions;
        return v;
      });
    }
  };

  const handleSetManeuverOptions = e => {
    const options = e.detail;
    configStore.update(v => ({ ...v, maneuverOptions: options }));
  };
</script>

<div>
  <div class="container">
    <div class="window">
      <div class="section">
        <span class="bold">Duration multiplier:</span>
        <span class="code">{durationMultiplier}</span>
      </div>
      <div class="section">
        <span class="bold">Routing options:</span>
        {#each Object.keys(routingOptions) as key}
          <div class="indent-1">
            {key}: <span class="code">{routingOptions[key]}</span>
          </div>
        {/each}
      </div>
      <div class="section">
        <span class="bold">Speed options:</span>
        {#each Object.keys(speedOptions) as key}
          <div class="indent-1">
            {key}: <span class="code">{speedOptions[key]}</span>
          </div>
        {/each}
      </div>
      <div class="section">
        <span class="bold">Maneuver options:</span>
        {#each Object.keys(maneuverOptions) as key}
          <div class="indent-1">
            {key}: {#each Object.keys(maneuverOptions[key]) as subKey}
              <div class="indent-2">
                {subKey}:
                <span class="code">{maneuverOptions[key][subKey]}</span>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>
  <button class="primary-button" on:click={() => (open = true)}
    >Adjust camera behavior</button
  >
</div>

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
        <RoutingOptions
          title="Routing options"
          {routingOptions}
          on:setProperty={e => setRoutingOptions(e.detail)}
        />
      </div>
      <div class="option">
        <RoutingOptions
          title="Speed options"
          routingOptions={{ ...routingOptions, ...speedOptions }}
          on:setProperty={e => setSpeedOptions(e.detail)}
        />
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
    </div>
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
  .container {
    max-height: 240px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .window {
    padding: 12px;
    overflow: scroll;
    border: 1px solid lightgray;
  }

  .primary-button {
    margin-top: 12px;
    width: 240px;
    height: 36px;
  }

  .bold {
    font-weight: bold;
  }

  .code {
    font-family: 'Courier New', Courier, monospace;
  }

  .indent-1 {
    margin-left: 6px;
  }

  .indent-2 {
    margin-left: 12px;
  }

  .section {
    margin-top: 6px;
    line-height: 18px;
  }

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
    position: relative;
    margin-bottom: 24px;
  }

  .number-input-container {
    width: 100%;
    margin-top: 6px;
  }

  .toggle-container {
    position: absolute;
    /* Accounts for label space that we don't use */
    top: -16;
    right: 0;
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
