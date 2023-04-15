# 🧬 Web Components to display Nanopublications

[![Run tests and update docs](https://github.com/Nanopublication/nanopub-js/actions/workflows/build.yml/badge.svg)](https://github.com/Nanopublication/nanopub-js/actions/workflows/build.yml)

`nanopub-js` is a set of libraries to easily work with [Nanopublications](https://nanopub.net) in the browser with JavaScript. Packages are published under the `@nanopub` organization on [npm](https://www.npmjs.com)

This project is composed of multiple libraries that are still in development:

- [x] `@nanopub/utils`: Provide utilities to help fetch and load nanopubs, automatically extracting relevant information (e.g. URIs used for the different graphs)

- [x] `@nanopub/display`: Web components to help display the content of a nanopub, includes utilities to automatically generate CytoscapeJS configuration to visualize nanopubs as a network.

- [ ] `@nanopub/publish`: Utility to sign and publish nanopubs directly in the browser (not started yet).

If you want to improve those libraries, please refer to the [**contribute page**](/pages/CONTRIBUTING.html) which details how to use the library in development.

## 🧶 Design approach

- Care for web standards

- Use modern tools

- - Web components (Lit element)
  - TypeScript
  - Vite, ESBuild, ESLint, Prettier
  - Comprehensive documentation with typedoc

- Separated libraries depending on the developer's needs:

- - Do you need to sign and publish?
  - Just query the Nanopub network?
  - Or display the content of nanopubs?

- A single “monorepo” for easier development and maintenance

- Limit the amount of dependencies, without reinventing the wheel

## 🛠️ Which framework to choose for Web Components?

You are encouraged to let us know in the [GitHub issues](https://github.com/Nanopublication/nanopub-js/issues), if you have any preference or advices regarding the choice of web component framework!

🔥 **Lit element** from Google (current choice)

​	✅ Most popular and mature

​	⚠️ Visual components library not updated yet

⚡️ **Fast element** from Microsoft

​	✅ Visual components library up-to-date and following standard guidelines 

​	✅ Working on a standard design system

​	⚠️ Syntax a bit more verbose than Lit (personal opinion)

✒️ **Stencil** from Ionics

​	✅ Similar to Lit and Fast

​	✅ Good documentation

🔗 **Svelte**

​	⚠️ New approach to web development

​	✅ Loved by developers

​	✅ Ranks better in benchmarks
