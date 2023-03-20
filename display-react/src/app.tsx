import * as React from 'react'
import {createRoot} from 'react-dom/client'
import {NanopubDisplayReact} from './NanopubDisplay'
// import '@nanopub/display'
// import '../../nanopub-display/src/index'

export default function App() {
  return (
    <div>
      <h1>Nanopub Display React development</h1>
      <NanopubDisplayReact url="https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" />
      {/* <nanopub-display url="https://purl.org/np/RAHtkscyyyJDLvWRuINckQrn5rbHzQKvwakNVC3fmRzGU" /> */}
    </div>
  )
}

const root = createRoot(document.getElementById('root') as Element)
root.render(<App />)
