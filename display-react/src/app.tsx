import * as React from 'react'
import ReactDOM from 'react-dom'
import '@nanopub/display'

export default function App() {
    return <div>
      <h1>Nanopub Display React development</h1>
      <nanopub-display url="https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" />
    </div>
}

ReactDOM.render(<App />, document.querySelector('#root'))
