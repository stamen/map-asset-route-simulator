import mapboxgl from 'mapbox-gl';
import loadEncoder from 'https://unpkg.com/mp4-h264@1.0.7/build/mp4-encoder.js';
import { simd } from 'https://unpkg.com/wasm-feature-detect?module';

// const recordScreen = async (map, animationFn) => {
//   const supportsSIMD = await simd();

//   // initialize H264 video encoder
//   const Encoder = await loadEncoder({ simd: supportsSIMD });

//   const gl = map.painter.context.gl;
//   const width = gl.drawingBufferWidth;
//   const height = gl.drawingBufferHeight;

//   const encoder = Encoder.create({
//     width,
//     height,
//     fps: 60,
//     kbps: 64000,
//     rgbFlipY: true,
//   });

//   // stub performance.now for deterministic rendering per-frame (only available in dev build)
//   let now = performance.now();
//   mapboxgl.setNow(now);

//   const ptr = encoder.getRGBPointer(); // keep a pointer to encoder WebAssembly heap memory

//   function frame() {
//     // increment stub time by 16.6ms (60 fps)
//     now += 1000 / 60;
//     mapboxgl.setNow(now);

//     const pixels = encoder.memory().subarray(ptr); // get a view into encoder memory
//     gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); // read pixels into encoder
//     encoder.encodeRGBPointer(); // encode the frame
//   }

//   map.on('render', frame); // set up frame-by-frame recording

//   await animationFn();

//   // stop recording
//   map.off('render', frame);
//   mapboxgl.restoreNow();

//   // download the encoded video file
//   const mp4 = encoder.end();
//   const anchor = document.createElement('a');
//   anchor.href = URL.createObjectURL(new Blob([mp4], { type: 'video/mp4' }));
//   anchor.download = 'mapbox-gl';
//   anchor.click();
// };

const recordScreen = async (map, animationFn) => {
  async function animate() {
    // do all the animations you need to record here
    map.easeTo({
      bearing: map.getBearing() - 20,
      duration: 3000,
    });
    // wait for animation to finish
    await map.once('moveend');
  }

  // don't forget to enable WebAssembly SIMD in chrome://flags for faster encoding
  const supportsSIMD = await simd();

  // initialize H264 video encoder
  const Encoder = await loadEncoder({ simd: supportsSIMD });

  const gl = map.painter.context.gl;
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;

  const encoder = Encoder.create({
    width,
    height,
    fps: 60,
    kbps: 64000,
    rgbFlipY: true,
  });

  // stub performance.now for deterministic rendering per-frame (only available in dev build)
  let now = performance.now();
  mapboxgl.setNow(now);

  const ptr = encoder.getRGBPointer(); // keep a pointer to encoder WebAssembly heap memory

  function frame() {
    // increment stub time by 16.6ms (60 fps)
    now += 1000 / 60;
    mapboxgl.setNow(now);

    const pixels = encoder.memory().subarray(ptr); // get a view into encoder memory
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); // read pixels into encoder
    encoder.encodeRGBPointer(); // encode the frame
  }

  map.on('render', frame); // set up frame-by-frame recording

  await animate(); // run all the animations

  // stop recording
  map.off('render', frame);
  mapboxgl.restoreNow();

  // download the encoded video file
  const mp4 = encoder.end();

  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([mp4], { type: 'video/mp4' }));
  anchor.download = 'mapbox-gl';
  anchor.click();
};

export { recordScreen };
