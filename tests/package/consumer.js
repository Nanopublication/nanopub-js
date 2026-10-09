// Bundler consumer, built by both Vite and webpack with their default
// configuration: the browser build and its dependencies resolve without
// polyfill setup.
import * as lib from '@nanopub/nanopub-js';
import * as constants from '@nanopub/nanopub-js/constants';
import { expose } from './checks.js';

expose(lib, constants);
