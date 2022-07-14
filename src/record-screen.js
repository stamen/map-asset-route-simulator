import loadEncoder from 'https://unpkg.com/mp4-h264@1.0.7/build/mp4-encoder.js';

let encoder;
let ptr;
let gl;
let width;
let height;

const setupRecording = async map => {
  const Encoder = await loadEncoder();

  gl = map.painter.context.gl;
  width = gl.drawingBufferWidth;
  height = gl.drawingBufferHeight;

  // Create a new encoder interface
  encoder = Encoder.create({
    width,
    height,
    fps: 30,
    kbps: 16000,
    rgbFlipY: true,
  });

  ptr = encoder.getRGBPointer();
};

const encodePixels = () => {
  const pixels = encoder.memory().subarray(ptr); // get a view into encoder memory
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); // read pixels into encoder
  encoder.encodeRGBPointer(); // encode the frame
};

const downloadMp4 = name => {
  const mp4 = encoder.end();
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([mp4], { type: 'video/mp4' }));
  anchor.download = name;
  anchor.click();
};

export { setupRecording, encodePixels, downloadMp4 };
