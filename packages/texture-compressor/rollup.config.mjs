import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "src/index.ts",
    output: { file: "../../lib/texture-compressor.js", format: "esm", sourcemap: true },
    plugins: [typescript({ compilerOptions: { declaration: false, declarationDir: undefined } }), terser()]
  },
  {
    input: "src/worker.ts",
    output: { file: "../../lib/texture-compressor.worker.js", format: "esm", sourcemap: true },
    plugins: [typescript({ compilerOptions: { declaration: false, declarationDir: undefined } }), terser()]
  },
  {
    input: "src/index.ts",
    output: { file: "../../lib/texture-compressor.d.ts", format: "esm" },
    plugins: [dts()]
  }
];
