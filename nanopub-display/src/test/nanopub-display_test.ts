import {NanopubDisplay} from '../nanopub-display'

import {fixture, assert} from '@open-wc/testing'
import {html} from 'lit/static-html.js'

suite('nanopub-display', () => {
  test('is defined', () => {
    const el = document.createElement('nanopub-display')
    assert.instanceOf(el, NanopubDisplay)
  })

  test('render and check loading with a nanopub URL', async () => {
    const el = await fixture(
      html`<nanopub-display url="https://w3id.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" />`
    )
    // console.log(assert.shadowDom);
    assert.shadowDom.equal(
      el,
      `
      <div
        class="nanopub"
        style="background-color:inherit;"
      >
        Loading...
      </div>
    `
    )
  })

  // test('render and wait', async () => {
  //   const el = await fixture(html`<nanopub-display url="https://w3id.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU"></nanopub-display>`);
  //   assert.shadowDom.equal(
  //     el,
  //     `
  //     <h1>Hello, World!</h1>
  //     <button part="button">Click Count: 0</button>
  //     <slot></slot>
  //   `
  //   );
  // });

  // test('styling applied', async () => {
  //   const el = (await fixture(html`<nanopub-display></nanopub-display>`)) as NanopubDisplay;
  //   await el.updateComplete;
  //   assert.equal(getComputedStyle(el).width, '100%');
  // });
})
