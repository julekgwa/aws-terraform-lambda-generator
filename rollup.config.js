import resolve from '@rollup/plugin-node-resolve'

import external from 'rollup-plugin-peer-deps-external'
import { terser } from 'rollup-plugin-terser'

export default [
  {
    input: './src/index.js',
    output: [
      {
        file: 'dist/index.js',
        format: 'es'
      }
    ],
    plugins: [
      external(),
      resolve(),
      terser()
    ],
    external: ['execa', 'arg', 'pkg-install', 'listr2', 'enquirer']
  }
]
