// Node consumer: the default entry resolves to the node build, and the bundle
// and constants entries load too.
import * as lib from '@nanopub/nanopub-js';
import * as bundle from '@nanopub/nanopub-js/bundle';
import * as constants from '@nanopub/nanopub-js/constants';
import { checks } from './checks.js';

for (const [name, entry] of [['@nanopub/nanopub-js', lib], ['@nanopub/nanopub-js/bundle', bundle]]) {
  const { sourceUri } = await checks.smoke(entry, constants);
  console.log(`ok  node  ${name}  ${sourceUri}`);
}
