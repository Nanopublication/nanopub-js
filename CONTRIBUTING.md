[![Run tests and update docs](https://github.com/Nanopublication/nanopub-js/actions/workflows/build.yml/badge.svg)](https://github.com/Nanopublication/nanopub-js/actions/workflows/build.yml)

This document contains details on the workflow used to develop the component if you want to improve it, and contribute.

If you have a question or a suggestion, you are encouraged to share it in the [GitHub issues](https://github.com/Nanopublication/nanopub-js/issues), after checking if it has already been mentioned.

## ℹ️ Introduction

This repository contains multiple libraries (aka. "monorepo"), we use `nx` to manage the different libraries as whole.

We recommend to **run the `yarn` commands directly from the root of the project** to run them for all libraries at the same time, and make sure libraries dependencies are updating properly (e.g. `display` depends on `utils`).

You can also run the commands directly in the folder of a specific library if you just want to work with this one.

Checkout the `scripts` in each `package.json` to better understand which commands can be run in their respective folder.

## 📥️ Install for development

Clone the repository:

```bash
git clone https://github.com/Nanopublication/nanopub-js
cd nanopub-js
```

Install dependencies:

```bash
yarn plugin import workspace-tools
yarn
```

> If you use VS Code, we highly recommend the [lit-plugin extension](https://marketplace.visualstudio.com/items?itemName=runem.lit-plugin), which enables some extremely useful features for lit-html templates.

## 🧑‍💻 Development

Start the component in development mode, it will automatically reload when the code is changed:

```bash
yarn dev
```

🛠️ Access the development page of `nanopub-utils` on http://localhost:3000

🧬 Access the development page of `nanopub-display` on http://localhost:3001

⚛️ Access the development page of `display-react` on http://localhost:3002 (to test `@nanopub/display` optimized for ReactJS)

## 📦️ Build

To build the JavaScript version of your component:

```bash
yarn build
```

> This sample uses the TypeScript compiler and [rollup](https://rollupjs.org) to produce JavaScript that runs in modern browsers.

## ☑️ Testing

Tests can be run with the `test` script:

```bash
yarn test
```

Alternatively the `test:prod` command will run your tests in Lit's production mode.

> This project uses modern-web.dev's [@web/test-runner](https://www.npmjs.com/package/@web/test-runner) for testing. See the [modern-web.dev testing documentation](https://modern-web.dev/docs/test-runner/overview) for more information.

## ✒️ Formatting

[Prettier](https://prettier.io/) is used for code formatting:

```bash
yarn fmt
```

> You can change the configuration in the `package.json`. Prettier has not been configured to run when committing files, but this can be added with Husky and `pretty-quick`. See the [prettier.io](https://prettier.io/) site for instructions.

## ✅ Linting

To check if the project does not break any linting rule run:

```bash
yarn lint
```

> Linting of TypeScript files is provided by [ESLint](eslint.org) and [TypeScript ESLint](https://github.com/typescript-eslint/typescript-eslint). In addition, [lit-analyzer](https://www.npmjs.com/package/lit-analyzer) is used to type-check and lint lit-html templates with the same engine and rules as lit-plugin.

## 📖 Documentation website

To build and run the documentation website, run:

```bash
yarn docs
```

To build the website for deployment, run:

```bash
yarn docs:build
```

## 🧹 Clean

To completely reset the caches of the different packages (requires to reinstall the workspace with `yarn`):

```bash
yarn clean
yarn
```

## 📬️ Publish

`@nanopub/display` depends on `@nanopub/utils`, so you will probably want to publish the 2 if you made changes in `utils` that are used in `display`

First make sure you are logged in with your NPM account:

```bash
npm login
```

You can run `yarn publish` from the root to publish all libraries:

```bash
yarn publish
```

## 🔗 More information

🔨 Built with [Lit](https://lit.dev/) and [N3.js](https://github.com/rdfjs/N3.js)

Vite TS starter: https://github.com/vitejs/vite/tree/main/packages/create-vite/template-lit-ts

Official lit TS starter: https://github.com/lit/lit-element-starter-ts

RDFJS components: https://github.com/zazuko/rdfjs-elements

Lit element React integration: https://github.com/lit/lit/tree/main/packages/labs/react
