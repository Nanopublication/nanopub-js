// Temporary fix for removing warning when using custom element
declare namespace JSX {
  interface NanopubDisplay {
    url?: string
    rdf?: string
  }
  interface IntrinsicElements {
    'nanopub-display': NanopubDisplay
  }
}
