import { apply_color_margin, initSync } from './wasm_glue.js';

const context: Worker = self as unknown as Worker;
let ready = false;

context.onmessage = (event: MessageEvent) => {
  try {
    if (event.data.type === 'init') {
      initSync(event.data.wasmBinary);
      ready = true;
      context.postMessage({ type: 'ready' });
      return;
    }
    if (event.data.type === 'cluster') {
      if (!ready) throw new Error('Texture-atlas clusterizer worker is not initialized.');
      const cluster = apply_color_margin(new Uint8Array(event.data.cluster), event.data.width, event.data.height, event.data.padding, event.data.scaleFix);
      context.postMessage({ type: 'result', id: event.data.id, cluster }, [cluster.buffer]);
    }
  } catch (error) {
    context.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
