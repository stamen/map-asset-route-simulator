// Importing global css to be bundled
import globalCss from './global.css';
import 'carbon-components-svelte/css/g10.css';
import App from './App.svelte';

const startApp = (target, props) =>
  new App({
    target,
    props,
  });

export { startApp };
