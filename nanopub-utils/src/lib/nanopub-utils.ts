// List available at https://monitor.np.trustyuri.net
export const grlcNpApiUrls = [
  'https://grlc.nps.knowledgepixels.com/api/local/local/',
  'https://grlc.services.np.trustyuri.net/api/local/local/'
  //  'http://grlc.nanopubs.lod.labs.vu.nl/api/local/local/',
  //  'http://grlc.np.dumontierlab.com/api/local/local/'
]

export interface NpStatus {
  type: string
  html: string
  latestUris?: Array<string>
}

/**
 * Get update status for a nanopub URI in one of the APIs
 */
export const getUpdateStatus = async (npUri: string): Promise<NpStatus> => {
  if (npUri.startsWith('https://')) {
    // Quick fix as the URIs use http in the triplestore, but users might use the https version of the URI
    npUri = npUri.replace('https://', 'http://')
  }
  const shuffledApiUrls = [...grlcNpApiUrls].sort(() => 0.5 - Math.random())
  return getUpdateStatusX(npUri, shuffledApiUrls)
}

/**
 * Get update status for a nanopub URI from a specific API
 */
const getUpdateStatusX = async (npUri: string, apiUrls: any): Promise<NpStatus> => {
  if (apiUrls.length == 0) return {type: 'error', html: 'An error has occurred while checking for updates.'}
  if (!npUri) return {type: 'error', html: 'No URI provided, cannot retrieve the Nanopub status.'}
  const apiUrl = apiUrls.shift()
  const requestUrl = `${apiUrl}get_latest_version?np=${npUri}`
  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: 'application/json'
      }
    })
    const r = await response.json()
    const bindings = r['results']['bindings']
    if (bindings.length == 1 && bindings[0]['latest']['value'] === npUri) {
      return {type: 'latest', latestUris: [npUri], html: 'This is the latest version.'}
    } else if (bindings.length == 0) {
      return {type: 'retracted', html: 'This nanopublication has been <strong>retracted</strong>.'}
    } else {
      const latestUris: string[] = []
      for (const b of bindings) {
        latestUris.push(b['latest']['value'])
      }
      const l = latestUris.at(0)
      if (latestUris.length == 1) {
        return {
          type: 'newer-version',
          latestUris: latestUris,
          html:
            'This nanopublication has a <strong>newer version</strong>: <code><a href="' + l + '">' + l + '</a></code>'
        }
      } else {
        return {
          type: 'newer-version',
          latestUris: latestUris,
          html:
            'This nanopublication has <strong>several newer versions</strong>: <code><a href="' +
            l +
            '">' +
            l +
            '</a></code> (and others)'
        }
      }
    }
  } catch (error) {
    console.log(error)
    return getUpdateStatusX(npUri, apiUrls)
  }
}

/**
 * Get the latest nanopub published
 */
export const getLatestNp = (callback: CallableFunction) => {
  fetch('https://server.np.trustyuri.net/nanopubs.txt')
    .then(response => response.text())
    .then(data => {
      const lines = data.split(/\n/)
      callback(lines[lines.length - 2].trim())
    })
}

/**
 * Check if an URI is a Trusty URI
 */
export const isTrustyUri = (uri: string): boolean => {
  return /.*[^A-Za-z0-9_\-](RA[A-Za-z0-9_\-]{43})/.test(uri)
}

/**
 * Get the artifact code from a Trusty URI
 */
export const getArtifactCode = (uri: string): string | null => {
  if (isTrustyUri(uri)) return uri.replace(/^.*[^A-Za-z0-9_\-](RA[A-Za-z0-9_\-]{43})$/, '$1')
  return null
}

/**
 * Get the short artifact code from a Trusty URI
 */
export const getShortCode = (uri: string): string | null => {
  const ac = getArtifactCode(uri)
  if (ac == null) return null
  return ac.substring(0, 10)
}

// TODO: not working yet, asking for json does not send json back
export const getJson = async (url: string): Promise<any> => {
  const response = await fetch(url, {
    headers: {Accept: 'application/json'}
  })
  console.log(await response.text())
  return await response.json()
  // const request = new XMLHttpRequest()
  // request.open('GET', url, true)
  // request.responseType = 'json'
  // request.onload = function () {
  //   const status = request.status
  //   if (status === 200) {
  //     console.log(request.response)
  //     // callback(null, request.response)
  //   } else {
  //     // callback(status, request.response)
  //     console.log(request.response)
  //   }
  // }
  // request.send()
}

// export const populate = (elementId, apiUrl, template) => {
//   getJson(apiUrl, function (error, response) {
//     if (error == null) {
//       document.getElementById(elementId).innerHTML = json2html.render(response, template);
//     } else {
//       document.getElementById(elementId).innerHTML =
//         '<li><em>error: something went wrong with calling the API</en></li>';
//     }
//   });
// };
