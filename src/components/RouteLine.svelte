<script>
  import 'codemirror/mode/javascript/javascript';
  import CodeMirror from '@joshnuss/svelte-codemirror';
  import {
    routeLineLayer as routeLineLayerStore,
    map as mapStore,
  } from '../stores';
  import { validate } from '@mapbox/mapbox-gl-style-spec';

  let routeLineLayer;
  let code;
  let editor;
  let errors = [];
  let map;

  routeLineLayerStore.subscribe(value => {
    routeLineLayer = value;
    const exposedLayer = {
      layout: routeLineLayer.layout || {},
      paint: routeLineLayer.paint || {},
    };
    code = JSON.stringify(exposedLayer, null, 2);
  });

  mapStore.subscribe(value => (map = value));

  const options = {
    mode: 'javascript',
    lineNumbers: false,
    smartIndent: true,
  };

  const validateLayer = layer => {
    const style = {
      version: 8,
      sources: {
        [layer.source]: {
          data: {
            type: 'FeatureCollection',
            features: [],
          },
          type: 'geojson',
        },
      },
      layers: [layer],
    };
    return validate(JSON.stringify(style));
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

  const setMapStyle = layer => {
    const { id } = layer;
    const style = map.getStyle();
    const layerIndex = style.layers.findIndex(l => l.id === id);
    let nextLayers = style.layers;
    nextLayers.splice(layerIndex, 1, layer);
    const nextStyle = {
      ...style,
      layers: nextLayers,
    };
    map.setStyle(nextStyle);
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
      routeLineLayerStore.set(nextRouteLine);
      setMapStyle(nextRouteLine);
    }
  }
</script>

<div class="container">
  <CodeMirror bind:editor {options} class="editor" bind:value={code} />
</div>

<style>
  :global(.editor) {
    font-size: 14px;
    height: 240px;
  }

  .container {
    width: 240px;
    height: 240px;
  }

  :global(.CodeMirror) {
    max-height: 240px !important;
  }
</style>
