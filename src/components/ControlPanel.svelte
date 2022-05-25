<script>
  import Directions from './Directions.svelte';
</script>

<div class="panel"><Directions /></div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 360px;
    left: 0;
    border-right: 1px solid #666;
  }
</style>
