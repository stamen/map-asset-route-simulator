<script>
  import { Accordion, AccordionItem } from 'carbon-components-svelte';
  import Directions from './Directions.svelte';
  import Moments from './Moments.svelte';
  import RouteLines from './RouteLines.svelte';
  import CameraBehaviorModal from './CameraBehaviorModal.svelte';
  import FigmaLinkModal from './FigmaLinkModal.svelte';

  export let routeFlag;
  export let setRouteFlag;
</script>

<div class="panel">
  <Accordion>
    <AccordionItem title="Route:" open>
      <div class="control"><Directions {setRouteFlag} {routeFlag} /></div>
      <div class="control mt24"><Moments /></div>
    </AccordionItem>
    <AccordionItem title="Route-line:" open>
      <div class="control"><RouteLines /></div>
    </AccordionItem>
    <AccordionItem title="Camera behavior:" open>
      <div class="control"><CameraBehaviorModal /></div>
    </AccordionItem>
    <AccordionItem title="Map assets:" open
      ><div class="control"><FigmaLinkModal /></div></AccordionItem
    >
  </Accordion>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 360px;
    left: 0;
    border-right: 1px solid #666;
    align-items: center;
    padding-bottom: 24px;
    overflow: scroll;
  }

  .control {
    display: flex;
    justify-content: center;
    width: 330px;
  }

  .mt24 {
    margin-top: 24px;
  }
</style>
