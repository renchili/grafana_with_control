import fs from 'node:fs';
import path from 'node:path';
import { rollup, watch as rollupWatch } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const watchMode = process.argv.includes('--watch');
const today = new Date().toISOString().slice(0, 10);
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version ?? '0.1.0';

const external = [
  '@grafana/data',
  '@grafana/runtime',
  '@grafana/ui',
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react-router-dom',
  'react-router',
];

function ensureDist() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
}

function writePluginJson() {
  const pluginJsonPath = path.join(srcDir, 'plugin.json');
  const pluginJson = fs
    .readFileSync(pluginJsonPath, 'utf8')
    .replace(/%VERSION%/g, version)
    .replace(/%TODAY%/g, today);

  fs.writeFileSync(path.join(distDir, 'plugin.json'), pluginJson);
}

const inputOptions = {
  input: path.join(srcDir, 'module.ts'),
  external,
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(watchMode ? 'development' : 'production'),
      },
    }),
    resolve({ browser: true, extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] }),
    commonjs(),
    json(),
    typescript({
      tsconfig: path.join(rootDir, 'tsconfig.json'),
      sourceMap: true,
      inlineSources: watchMode,
    }),
  ],
};

const outputOptions = {
  file: path.join(distDir, 'module.js'),
  format: 'system',
  sourcemap: true,
};

async function buildOnce() {
  ensureDist();
  writePluginJson();
  const bundle = await rollup(inputOptions);
  await bundle.write(outputOptions);
  await bundle.close();
  console.log(`[build-plugin] wrote ${path.relative(rootDir, outputOptions.file)}`);
}

async function main() {
  if (watchMode) {
    ensureDist();
    writePluginJson();
    const watcher = rollupWatch({
      ...inputOptions,
      output: [outputOptions],
      watch: { clearScreen: false },
    });

    watcher.on('event', (event) => {
      if (event.code === 'START') {
        console.log('[build-plugin] watch build started');
      } else if (event.code === 'END') {
        console.log('[build-plugin] watch build finished');
        writePluginJson();
      } else if (event.code === 'ERROR') {
        console.error('[build-plugin] watch build failed');
        console.error(event.error);
      }
    });
    return;
  }

  await buildOnce();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
