<script>
  import { createEventDispatcher } from 'svelte';
  import { NumberInput } from 'carbon-components-svelte';

  import {
    PITCH_MIN,
    PITCH_MAX,
    ZOOM_MIN,
    ZOOM_MAX,
    SPEED_MIN,
    SPEED_MAX,
    NUMBER_INPUT_STEPS,
  } from '../constants';

  export let disabled;

  const dispatch = createEventDispatcher();

  // These are the only supported properties
  const propertyDetails = {
    leadDistance: {
      label: 'Maneuver lead distance',
      min: 0,
      max: 1000,
    },
    speed: {
      label: 'Threshold (meters/second)',
      min: SPEED_MIN,
      max: SPEED_MAX,
    },
    pitch: {
      min: PITCH_MIN,
      max: PITCH_MAX,
    },
    zoom: {
      min: ZOOM_MIN,
      max: ZOOM_MAX,
    },
  };

  export let routingOptions;
  export let title;

  const setRoutingOptions = (property, value) => {
    dispatch('setProperty', { property, value });
  };
</script>

<div class="option">
  {title}:
  {#each Object.keys(propertyDetails) as property}
    {#if routingOptions[property] !== undefined}
      <div class="number-input-container">
        <NumberInput
          size="sm"
          label={propertyDetails?.[property]?.label ??
            property.charAt(0).toUpperCase() + property.slice(1)}
          value={routingOptions?.[property]}
          min={propertyDetails?.[property]?.min ?? 0}
          max={propertyDetails?.[property]?.max ?? 1000}
          step={NUMBER_INPUT_STEPS?.[property] ?? 1}
          {disabled}
          on:change={e => setRoutingOptions(property, e.detail)}
        />
      </div>
    {/if}
  {/each}
</div>

<style>
  .option {
    position: relative;
    margin-bottom: 24px;
  }

  .number-input-container {
    width: 100%;
    margin-top: 6px;
  }
</style>
