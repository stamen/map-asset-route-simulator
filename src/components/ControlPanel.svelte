<script>
  import { Accordion, AccordionItem } from 'carbon-components-svelte';
  import Directions from './Directions.svelte';
  import RouteLine from './RouteLine.svelte';
</script>

<div class="panel">
  <Accordion>
    <AccordionItem title="Route:" open>
      <div class="control"><Directions /></div>
    </AccordionItem>
    <AccordionItem title="Route-line:" open>
      <div class="control"><RouteLine /></div>
    </AccordionItem>
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
  }

  .control {
    display: flex;
    justify-content: center;
    width: 330px;
  }
</style>
