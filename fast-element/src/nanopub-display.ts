import {attr, html, css, customElement, observable, when, FASTElement} from '@microsoft/fast-element';
import {Parser, Quad} from 'n3';

import {NanopubWriter} from './n3-writer';

const template = html<NanopubDisplay>`
  <div
    class="nanopub"
  >
    ${when(x => x.prefixes, () => {
      return html` @prefix ${Object.keys(x => x.prefixes)[0]} <<a
          href="${x => x.prefixes[Object.keys(x => x.prefixes)[0]]}"
          target="_blank"
          rel="noopener noreferrer"
          >${x => x.prefixes[Object.keys(x => x.prefixes)[0]]}</a
        >> .
        ${x => !x.disableDisplayButton
          ? html`<div class="display-checklist" tabindex="100">
              <span
                class="anchor-display-checklist"
                @click="${() => x => x._openDisplayOptions()}"
                @touchstart="${() => x => x._openDisplayOptions()}"
              >
                ${displayIcon} ${x => x.showDisplayOptions ? html`Select the sections to display` : html``}
              </span>
              ${x => x.showDisplayOptions
                ? html`<div class="display-checklist-wrapper">
                    <ul class="items" id="display-checklist-items">
                      <li id="displayPrefixes" @click=${(e: any) => x => x._switchDisplay(e.target.id)}>
                        <label
                          ><input
                            type="checkbox"
                            value="displayPrefixes"
                            .checked=${x => x.displayPrefixes}
                            @click=${(e: any) => x => x._switchDisplay(e.target.value)}
                          />
                          Display prefixes
                        </label>
                      </li>
                      <li id="displayHead" @click=${(e: any) => x => x._switchDisplay(e.target.id)}>
                        <label
                          ><input
                            type="checkbox"
                            value="displayHead"
                            .checked=${x => x.displayHead}
                            @click=${(e: any) => x => x._switchDisplay(e.target.value)}
                          />
                          Display Head graph
                        </label>
                      </li>
                      <li id="displayAssertion" @click=${(e: any) => x => x._switchDisplay(e.target.id)}>
                        <label
                          ><input
                            type="checkbox"
                            value="displayAssertion"
                            .checked=${x => x.displayAssertion}
                            @click=${(e: any) => x => x._switchDisplay(e.target.value)}
                          />
                          Display Assertion graph
                        </label>
                      </li>
                      <li id="displayProvenance" @click=${(e: any) => x => x._switchDisplay(e.target.id)}>
                        <label
                          ><input
                            type="checkbox"
                            value="displayProvenance"
                            .checked=${x => x.displayProvenance}
                            @click=${(e: any) => x => x._switchDisplay(e.target.value)}
                          />
                          Display Provenance graph
                        </label>
                      </li>
                      <li id="displayPubinfo" @click=${(e: any) => x => x._switchDisplay(e.target.id)}>
                        <label
                          ><input
                            type="checkbox"
                            value="displayPubinfo"
                            .checked=${x => x.displayPubinfo}
                            @click=${(e: any) => x => x._switchDisplay(e.target.value)}
                          />
                          Display PubInfo graph
                        </label>
                      </li>
                    </ul>
                  </div>`
                : html``}
            </div>`
          : html``}
        ${x => !x.disableDisplayStatus && x.url
          ? html`<nanopub-status-icon url=${x => x.url} style="margin-right: 14px; margin-top: 1px;" />`
          : html``}
        <br />

        <div id="nanopub-prefixes">
          ${Object.keys(x => x.prefixes).map((prefix, i) => {
            if (i === 0) {
              return html``
            }
            return html`
              @prefix ${prefix} <<a href="${x => x.prefixes[prefix]}" target="_blank" rel="noopener noreferrer"
                >${x => x.prefixes[prefix]}</a
              >> .
              <br />
            `
          })}
        </div>`
    })}
    ${x => x.html_rdf ? html`${x => x.html_rdf}` : x => x.error ? html`${x => x.error}` : html`Loading...`}
  </div>
`;

const npColor = {
  head: css`#e8e8e8`,
  assertion: css`#99ccff`,
  provenance: css`#f3a08c`,
  pubinfo: css`#ffff66`,
  error: css`#f88b80`,
  grey: css`#d1d1d1`
}


const styles = css`
  :host {
    font-family: monaco, monospace;
    font-size: 11pt;
    color: #444;
    display: flex;
    height: 100%;
    width: 100%;
    word-break: break-all;
    margin-bottom: 8px;
  }
  a {
    color: #000;
    text-decoration: none;
  }
  a:hover {
    color: #666;
  }
  .nanopub {
    height: 100%;
    padding: 8px;
    border-radius: 8px;
    border: solid;
    border-width: 1px;
  }
  .nanopub-graph {
    padding: 8px;
    margin-top: 8px;
    border-radius: 8px;
  }
  #nanopub-prefixes {
    display: none;
  }
  #nanopub-head {
    display: none;
    background: ${npColor.head};
  }
  #nanopub-assertion {
    background: ${npColor.assertion};
  }
  #nanopub-provenance {
    background: ${npColor.provenance};
  }
  #nanopub-pubinfo {
    background: ${npColor.pubinfo};
  }
  .display-checklist {
    font-family: sans-serif;
    float: right;
    font-size: 9pt;
    background: ${npColor.head};
    border-radius: 7px;
    text-align: center;
  }
  .display-checklist .anchor-display-checklist {
    position: relative;
    display: inline-block;
    text-decoration: none;
    padding: 2px 6px;
    border-radius: 7px;
    cursor: pointer;
  }
  .display-checklist .anchor-display-checklist:hover {
    background: ${npColor.grey};
  }
  .display-checklist-wrapper {
    z-index: 1;
    position: absolute;
    margin-top: 1px;
  }
  .display-checklist ul.items {
    position: relative;
    min-width: 100px;
    text-align: left;
    width: max-content;
    padding: 2px;
    margin: 0;
    border: 1px solid #ccc;
    border-radius: 7px;
    background: #fff;
  }
  .display-checklist ul.items li {
    list-style: none;
    margin-right: 8px;
  }
  .display-checklist label,
  li,
  input[type='checkbox'] {
    cursor: pointer;
  }
`;

@customElement({
  name: 'nanopub-display',
  template,
  styles
  // shadowOptions: { delegatesFocus: true, mode: 'open' },
})
export class NanopubDisplay extends FASTElement {
  @attr url = '';
  @attr rdf = '';

  @attr  disableDisplayStatus = false
  /**
   * Display the prefixes section, or not
   */
  @attr  displayPrefixes = false
  /**
   * Display the Head graph section, or not
   */
  @attr  displayHead = false
  /**
   * Display the PubInfo graph section, or not
   */
  @attr  displayPubinfo = true
  /**
   * Display the Provenance graph section, or not
   */
  @attr  displayProvenance = true
  /**
   * Display the Assertion graph section, or not
   */
  @attr  displayAssertion = true

  /**
   * Hide the PubInfo graph by default
   */
  @attr  hidePubinfo = false
  /**
   * Hide the Provenance graph by default
   */
  @attr  hideProvenance = false
  /**
   * Hide the Assertion graph by default
   */
  @attr  hideAssertion = false

  /**
   * Disable the button to change which sections of the nanopub are displayed
   */
  @attr  disableDisplayButton = false

  /**
   * Boolean to know if the window to change which sections of the nanopub are displayed is opened
   */
  @observable showDisplayOptions = false
  /**
   * The HTML generated from the RDF to display the nanopub
   */
  @observable html_rdf?: any
  /**
   * A dictionary with the prefixes and namespaces used in the nanopub
   */
  @observable prefixes?: any

  /**
   * Error message to show if there is a problem displaying the nanopub
   */
  @observable error?: string

  async connectedCallback() {
    super.connectedCallback();

    if (!this.url && !this.rdf) {
      this.error = `⚠️ No nanopublication has been provided, use the "url" or "rdf"
        attribute to provide the URL, or RDF in the TRiG format, of the nanopublication.`
    }

    if (!this.error && this.url && !this.rdf) {
      if (this.url.startsWith('https://purl.org/np/') && !this.url.endsWith('.trig')) {
        this.url = this.url + '.trig'
      }
      try {
        const response = await fetch(this.url)
        this.rdf = await response.text()
      } catch (error) {
        this.error = `⚠️ Issue fetching the nanopublication RDF at ${this.url}. ${error}`
      }
    }
    // TODO: extract URL from RDF if not provided, to get status

    // Parse the RDF with n3.js
    if (!this.error && this.rdf) {
      const parser = new Parser()
      const writer = new NanopubWriter(null, {format: 'application/trig'})
      const quadList: Quad[] = []
      parser.parse(this.rdf, (error: any, quad: Quad, prefixes: any): any => {
        if (error) {
          this.error = `⚠️ Issue parsing the nanopublication RDF with n3.js, make sure it is in the TRiG format. ${error}`
          return null
        }
        if (quad) {
          quadList.push(quad)
        } else {
          this.prefixes = {
            this: prefixes['this'],
            sub: prefixes['sub'],
            ...prefixes
          }
          writer.addPrefixes(this.prefixes, null)
          // Add the quads to the writer after the prefixes
          quadList.map((addQuad: Quad) => {
            writer.addQuad(addQuad)
          })
          writer.end((_error: any, result: string) => {
            // this.html_rdf = result
            this.html_rdf = html`${result}`
            setTimeout(() => {
              // Timeout 0 makes sure the div are loaded before updating the displayed sections
              // TODO: use lifecycle firstUpdated() or updated()? https://lit.dev/docs/components/lifecycle/#reactive-update-cycle
              this._applyDisplay('displayPrefixes')
              this._applyDisplay('displayHead')
              if (this.hidePubinfo) this.displayPubinfo = false
              this._applyDisplay('displayPubinfo')
              if (this.hideProvenance) this.displayProvenance = false
              this._applyDisplay('displayProvenance')
              if (this.hideAssertion) this.displayAssertion = false
              this._applyDisplay('displayAssertion')
            }, 0)
          })
        }
      })
    }
  }


  /**
   * Apply display described in the state to a nanopub section in the HTML
   */
  _applyDisplay(displayProp: string) {
    const displayLabel = displayProp.substring(7).toLowerCase()
    // const ele: HTMLElement | null = this.renderRoot.querySelector(`#nanopub-${displayLabel}`)
    const ele: HTMLElement | null = document.querySelector(`#nanopub-${displayLabel}`)
    if (ele) {
      ele.style.display = this[displayProp] ? 'inherit' : 'none'
    }
  }

  /**
   * Switch display of a nanopub section, called when checkbox clicked
   */
  _switchDisplay(displayProp: string) {
    this[displayProp] = !this[displayProp]
    this._applyDisplay(displayProp)
  }

  /**
   * Open the dropdown window to select which nanopub section to display
   */
  _openDisplayOptions() {
    this.showDisplayOptions = !this.showDisplayOptions
    if (window && this.showDisplayOptions) {
      setTimeout(() => {
        window.addEventListener('click', this._handleClickOut)
      }, 0)
    }
  }

  /**
   * Close the display selection dropdown window if click outside of it
   */
  _handleClickOut = (e: any) => {
    // const ele: HTMLElement | null = this.renderRoot.querySelector(`.display-checklist`)
    const ele: HTMLElement | null = document.querySelector(`.display-checklist`)
    if (window && !ele?.contains(e.originalTarget)) {
      this.showDisplayOptions = false
      window.removeEventListener('click', this._handleClickOut)
    }
  }

}

const displayIcon = html`<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 -80 1000 1000">
  <path
    d="M480.118 726Q551 726 600.5 676.382q49.5-49.617 49.5-120.5Q650 485 600.382 435.5q-49.617-49.5-120.5-49.5Q409 386 359.5 435.618q-49.5 49.617-49.5 120.5Q310 627 359.618 676.5q49.617 49.5 120.5 49.5Zm-.353-58Q433 668 400.5 635.265q-32.5-32.736-32.5-79.5Q368 509 400.735 476.5q32.736-32.5 79.5-32.5Q527 444 559.5 476.735q32.5 32.736 32.5 79.5Q592 603 559.265 635.5q-32.736 32.5-79.5 32.5ZM480 856q-146 0-264-83T40 556q58-134 176-217t264-83q146 0 264 83t176 217q-58 134-176 217t-264 83Zm0-300Zm-.169 240Q601 796 702.5 730.5 804 665 857 556q-53-109-154.331-174.5-101.332-65.5-222.5-65.5Q359 316 257.5 381.5 156 447 102 556q54 109 155.331 174.5 101.332 65.5 222.5 65.5Z"
  />
</svg>`

// declare global {
//   namespace JSX {
//     interface IntrinsicElements {
//       ['nanopub-display']: CustomElement<NanopubDisplay>;
//     }
//   }
// }
