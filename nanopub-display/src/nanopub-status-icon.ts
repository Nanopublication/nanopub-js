import {LitElement, html, css} from 'lit'
import {customElement, property, state} from 'lit/decorators.js'
import {getUpdateStatus, NpStatus} from '@nanopub/utils'

/**
 * A component to display the status of a Nanopublication.
 */
@customElement('nanopub-status-icon')
export class NanopubStatusIcon extends LitElement {
  static override styles = css`
    :host {
      font-family: sans-serif;
      display: flex;
      align-items: center;
      float: right;
      cursor: help;
    }
  `

  /**
   * The URL of the nanopub to get the status from
   */
  @property({type: String})
  url = ''

  /**
   * Latest versions retrieved via the Nanopub Query APIs
   */
  @state()
  status?: NpStatus

  /**
   * Run when the component is initialized to get the nanopub status
   */
  override async connectedCallback() {
    super.connectedCallback()

    if (this.url.endsWith('.trig')) {
      this.url = this.url.slice(0, -5)
    }

    this.status = await getUpdateStatus(this.url)
  }

  override render() {
    return html`
      ${!this.status
        ? html`<span title="Checking for updates...">⏳️</span>`
        : html`<span title="${this.status?.html}">${mapStatusIcons[this.status?.type]}</span>`}
    `
  }
}

const mapStatusIcons = {
  latest: '✅',
  retracted: '⚠️🗑️',
  'newer-version': '⚠️⏫',
  error: '❌'
}

declare global {
  interface HTMLElementTagNameMap {
    'nanopub-status-icon': NanopubStatusIcon
  }
}
