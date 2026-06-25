# Changelog

## [0.1.2](https://github.com/Nanopublication/nanopub-js/compare/v0.1.1...v0.1.2) (2026-06-25)


### Bug Fixes

* Fix swapped text-search endpoint UUIDs in NanopubClient ([ad4d3dc](https://github.com/Nanopublication/nanopub-js/commit/ad4d3dc))
* Handle hash-separator URIs and skip external trusty refs in normalization; remove incorrect escaping from literal normalization ([b1eaf9e](https://github.com/Nanopublication/nanopub-js/commit/b1eaf9e))
* Treat all `purl.org/nanopub/temp/` URIs as placeholders; detect pubinfo graph name dynamically from the Head declaration; stop auto-injecting `dct:creator` and `dct:created` ([49722f8](https://github.com/Nanopublication/nanopub-js/commit/49722f8))
* Compute the correct trusty hash for `~~~ARTIFACTCODE~~~` placeholders in custom-namespace URIs, matching the reference nanopub-java implementation ([5057525](https://github.com/Nanopublication/nanopub-js/commit/5057525))

## [0.1.1](https://github.com/Nanopublication/nanopub-js/compare/v0.1.0...v0.1.1) (2026-03-15)


### Features

* Add native sign and verify, removing the dependency on nanopub-rs ([8bc7bec](https://github.com/Nanopublication/nanopub-js/commit/8bc7bec))
* Add signature and trusty hash verification ([3fbcd2c](https://github.com/Nanopublication/nanopub-js/commit/3fbcd2c))
* Support custom URI signing and re-signing of existing trusty nanopubs ([320e982](https://github.com/Nanopublication/nanopub-js/commit/320e982))
* Support `~~~ARTIFACTCODE~~~` placeholder for custom URIs to avoid collisions ([deaac70](https://github.com/Nanopublication/nanopub-js/commit/deaac70))
* Add separate browser/node entry points to prevent node crypto bundling in the browser ([d5ab101](https://github.com/Nanopublication/nanopub-js/commit/d5ab101))
* Add `detectNanopubBaseUri()` to infer the nanopub base URI before falling back to the default ([09e7392](https://github.com/Nanopublication/nanopub-js/commit/09e7392))


### Bug Fixes

* Rewrite `normalizeDataset` ([5891916](https://github.com/Nanopublication/nanopub-js/commit/5891916))
* Strip stale signature quads on re-sign; skip re-signing when key and orcid are unchanged ([cd3c5cb](https://github.com/Nanopublication/nanopub-js/commit/cd3c5cb))
* Use `dct:creator` instead of `npx:signedBy` for the re-sign short-circuit check ([f96d793](https://github.com/Nanopublication/nanopub-js/commit/f96d793))
* Use the base URI as the trusty base ([1e75f66](https://github.com/Nanopublication/nanopub-js/commit/1e75f66))
* Properly use the `this` prefix in serialize ([e0963b3](https://github.com/Nanopublication/nanopub-js/commit/e0963b3))
* Handle trailing slash and `#` separators in URIs ([ea78c77](https://github.com/Nanopublication/nanopub-js/commit/ea78c77))
* Remove remaining references to nanopub-rs; update `Nanopub` naming ([3480f22](https://github.com/Nanopublication/nanopub-js/commit/3480f22))

## 0.1.0 (2026-01-15)


### Features

* Initial release of `@nanopub/nanopub-js`
* `Nanopub` class with creation from RDF strings and signing support ([a161ca2](https://github.com/Nanopublication/nanopub-js/commit/a161ca2))
* `fetchNanopub` and `querySparql` client functions ([e5a3238](https://github.com/Nanopublication/nanopub-js/commit/e5a3238))
* Search and convenience functions, plus `runTemplateQuery` ([dd96706](https://github.com/Nanopublication/nanopub-js/commit/dd96706))
* Serialization module with prefix handling ([393353b](https://github.com/Nanopublication/nanopub-js/commit/393353b))
* ESLint + Prettier configuration and test suite ([9e98f32](https://github.com/Nanopublication/nanopub-js/commit/9e98f32))
