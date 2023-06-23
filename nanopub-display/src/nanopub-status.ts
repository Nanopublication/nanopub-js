import {LitElement, html, css} from 'lit'
import {customElement, property, state} from 'lit/decorators.js'
import {getUpdateStatus, NpStatus} from '@nanopub/utils'

/**
 * A component to display the status of a Nanopublication.
 */
@customElement('nanopub-status')
export class NanopubStatus extends LitElement {
  static override styles = css`
    :host {
      font-family: sans-serif;
      font-size: small;
    }
  `

  /**
   * The URL of the nanopub to get status from
   */
  @property({type: String})
  url = ''

  /**
   * Latest versions retrieved from the grlc API for the nanopub
   */
  @state()
  status?: NpStatus

  /**
   * Run when the component is initialized to get the nanopub status
   */
  override async connectedCallback() {
    super.connectedCallback()
    if (this.url.startsWith('https://purl.org/np/')) {
      this.url = this.url.replace('https://purl.org/np/', 'http://purl.org/np/')
    }

    this.status = await getUpdateStatus(this.url)
  }

  override render() {
    return html` <p>${!this.status ? html`<em>Checking for updates...</em>` : html`${this.status.html}`}</p> `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nanopub-status': NanopubStatus
  }
}
