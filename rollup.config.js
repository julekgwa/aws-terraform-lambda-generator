import resolve from '@rollup/plugin-node-resolve';

import external from 'rollup-plugin-peer-deps-external';
import {terser} from 'rollup-plugin-terser';

export default [
  {
    input: './out-tsc/index.js',
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
    external: ['execa', 'arg', 'listr2', 'enquirer', 'shelljs']
  }
];
