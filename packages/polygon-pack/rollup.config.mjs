import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
	input: {
		'nesting.worker': 'src/workers/nesting.worker.js'
	},
	output: {
		dir: '../../apps/desktop/src/renderer/public/workers',
		format: 'es',
		entryFileNames: '[name].js'
	},
	plugins: [nodeResolve({ browser: true }), commonjs()]
};
