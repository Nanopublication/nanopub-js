import { fileURLToPath } from 'node:url';

// No resolve.fallback or ProvidePlugin: the package has to work without polyfill setup
export default {
  mode: 'production',
  target: 'web',
  entry: './consumer.js',
  output: {
    path: fileURLToPath(new URL('./out/webpack/', import.meta.url)),
    filename: 'main.js',
    clean: true,
  },
};
