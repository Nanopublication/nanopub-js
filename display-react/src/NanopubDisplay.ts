import * as React from 'react'
import {createComponent} from '@lit-labs/react'
import {NanopubDisplay} from '@nanopub/display'
// import {NanopubDisplay as NanopubDisplayLit} from '@nanopub/display'

// https://www.npmjs.com/package/@lit-labs/react

export const NanopubDisplayReact = createComponent({
  tagName: 'nanopub-display',
  elementClass: NanopubDisplay,
  react: React,
  events: {
    onclick: 'click',
    ontouchstart: 'touchstart'
  }
})
