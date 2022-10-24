<script>
  export let height;
  export let width;
  export let children;
  export let childProps;
</script>

<div class="outline" style={`height:${height + 40}px; width:${width + 40}px`}>
  <div class="layout" style={`height:${height}px; width:${width}px`}>
    <svelte:component this={children} {...childProps} {height} />
  </div>
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .outline {
    border-radius: 30px;
    border: 20px solid black;
    z-index: 1000;
    /* pointer-events: none; */
    position: relative;
  }
</style>
