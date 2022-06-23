<script>
  import { Accordion, AccordionItem } from 'carbon-components-svelte';
  import Directions from './Directions.svelte';
  import Moments from './Moments.svelte';
  import RouteLineEditor from './RouteLineEditor.svelte';
  import CameraBehaviorModal from './CameraBehaviorModal.svelte';
</script>

<div class="panel">
  <Accordion>
    <AccordionItem title="Route:" open>
      <div class="control"><Directions /></div>
      <div class="control mt24"><Moments /></div>
    </AccordionItem>
    <AccordionItem title="Route-line:" open>
      <div class="control"><RouteLineEditor /></div>
    </AccordionItem>
    <AccordionItem title="Camera behavior:" open>
      <div class="control"><CameraBehaviorModal /></div>
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

  .mt24 {
    margin-top: 24px;
  }
</style>
