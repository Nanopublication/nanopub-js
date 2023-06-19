# 🧬 Web Components to display Nanopublications

[![Run tests and update docs](https://github.com/Nanopublication/nanopub-js/actions/workflows/build.yml/badge.svg)](https://github.com/Nanopublication/nanopub-js/actions/workflows/build.yml)

`nanopub-js` is a set of libraries to easily work with [Nanopublications](https://nanopub.net) in the browser with JavaScript. Packages are published under the `@nanopub` organization on [npm](https://www.npmjs.com)

This project is composed of multiple libraries that are still in development, if you want to improve those libraries, please refer to the [contribute page](/pages/CONTRIBUTING.html) which details how to use the library in development.

## [🛠️ @nanopub/utils](https://nanopublication.github.io/nanopub-js/modules/_nanopub_utils.html)

Provide utilities to help fetch and load nanopubs, automatically extracting relevant information (e.g. URIs used for the different graphs)

## [🧬 @nanopub/display](https://nanopublication.github.io/nanopub-js/modules/_nanopub_display.html)

Web components to help display the content of a nanopub, includes utilities to automatically generate CytoscapeJS configuration to visualize nanopubs as a network.

## 📋️ Notes

To do:

- [ ] Add testing for web components (using the Web Test Runner or Cypress)
- [ ] Develop `@nanopub/publish` to sign and publish nanopubs directly in the browser. ℹ️ We plan to work on it during the 2023 EU Biohackathon (30 oct - 3 nov) to build it with rust and web assembly.

### 🧶 Design approach

- Care for web standards

- Use modern tools

  - Web components (Lit element)
  - TypeScript
  - Vite, ESBuild, ESLint, Prettier
  - Comprehensive documentation generated with typedoc

- Separated libraries depending on the developer's needs:

  - Do you need to sign and publish?
  - Just query the Nanopub network?
  - Or display the content of nanopubs?

- A single “monorepo” for easier development and maintenance

- Limit the amount of dependencies, without reinventing the wheel

### 🛠️ Which framework to choose for Web Components?

We are still not fully set on which framework to use to develop the web components. You are encouraged to let us know in the [GitHub issues](https://github.com/Nanopublication/nanopub-js/issues), if you have any preference or advices regarding the choice of web component framework!

- 🔥 **Lit element** from Google (current choice)

  - ✅ Most popular and mature
  - ⚠️ Visual components library not updated yet
- ⚡️ **Fast element** from Microsoft

  - ✅ Visual components library up-to-date and following standard guidelines
  - ✅ Working on a standard design system
  - ⚠️ Syntax a bit more verbose than Lit (personal opinion)
- 🔗 **Svelte**
  - ⚠️ New approach to web development
  - ✅ Performant and developer friendly
- **🧊 SolidJS**
  - ✅ Performant and developer friendly
  - ✅ Does not introduce significant language changes or new type of files
