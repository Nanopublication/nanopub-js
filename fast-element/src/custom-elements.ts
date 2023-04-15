// https://www.fast.design/docs/integrations/react#typescript-and-tsx-support

// TODO: current issue with react is that the connectedCallback tries to update the div
// before it has been set by react
import React from 'react';

export declare namespace JSX {
  interface IntrinsicElements {
    'nanopub-display': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      url?: string;
      rdf?: string;
    };
  }
}
