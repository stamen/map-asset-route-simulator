<script>
  import { createEventDispatcher } from 'svelte';
  import { faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa/src/fa.svelte';
  import 'codemirror/mode/javascript/javascript';
  import CodeMirror from '@joshnuss/svelte-codemirror';
  import { map as mapStore } from '../stores';
  import { validateLayer } from '../mapbox-gl-utils';

  const dispatch = createEventDispatcher();

  export let routeLineLayer;
  export let index;
  let code;
  let editor;
  let errors = [];
  let map;

  const setCodeFromLayer = layer => {
    const exposedLayer = {
      layout: layer.layout || {},
      paint: layer.paint || {},
    };
    code = JSON.stringify(exposedLayer, null, 2);
  };

  $: if (routeLineLayer) {
    setCodeFromLayer(routeLineLayer);
  }

  mapStore.subscribe(value => (map = value));

  const options = {
    mode: 'javascript',
    lineNumbers: false,
    smartIndent: true,
  };

  const parseValidationErrors = errors => {
    let nextErrors = errors.map(e => {
      let nextMessage = e.message;
      let [layerInfo, msg] = nextMessage.split(':');
      layerInfo = layerInfo.split('.').slice(1).join('.');
      return `${layerInfo}: ${msg}`;
    });
    return nextErrors;
  };

  $: {
    let layerJson = code;
    try {
      layerJson = { ...routeLineLayer, ...JSON.parse(code) };
      const validationErrors = validateLayer(layerJson);
      errors = parseValidationErrors(validationErrors);
    } catch (e) {
      errors = ['JSON is invalid'];
    }
  }

  $: {
    if (
      !errors.length &&
      map &&
      code !==
        JSON.stringify(
          {
            layout: routeLineLayer.layout || {},
            paint: routeLineLayer.paint || {},
          },
          null,
          2
        )
    ) {
      const nextRouteLine = { ...routeLineLayer, ...JSON.parse(code) };
      dispatch('setRouteLine', { index, layer: nextRouteLine });
    }
  }

  $: {
    if (editor) {
      editor.on('blur', () => {
        if (errors.length) {
          setCodeFromLayer(routeLineLayer);
        }
      });
    }
  }
</script>

<div>
  <div class="container">
    <CodeMirror bind:editor {options} class="editor" bind:value={code} />
    <div
      class="icon"
      title={errors.length ? 'Layer is invalid' : 'Valid layer'}
    >
      <Fa
        size="2x"
        icon={errors.length ? faXmark : faCheck}
        color={errors.length ? 'red' : 'green'}
      />
    </div>
  </div>
  {#each errors as error}
    <div class="error">{error}</div>
  {/each}
</div>

<style>
  :global(.editor) {
    font-size: 12px;
    height: 240px;
  }

  :global(.CodeMirror) {
    max-height: 240px !important;
  }

  .container {
    width: 240px;
    height: 240px;
    position: relative;
  }

  .icon {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 12px;
    background-color: white;
  }

  .error {
    background-color: rgb(255, 130, 130);
    padding: 6px;
    color: white;
    max-width: 240px;
  }
</style>
