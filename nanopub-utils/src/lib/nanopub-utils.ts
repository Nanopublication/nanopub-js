// List available at https://monitor.np.trustyuri.net
export const queryApiUrls = [
  'https://query.petapico.org/api/',
  'https://query.knowledgepixels.com/api/',
  'https://query.np.trustyuri.net/api/'
]

export interface NpStatus {
  type: string
  html: string
  latestUris?: Array<string>
  retractions?: Array<string>
}

/**
 * Get update status for a nanopub URI in one of the APIs
 */
export const getUpdateStatus = async (npUri: string): Promise<NpStatus> => {
  if (npUri.startsWith('https://')) {
    // Quick fix as the URIs use http in the triplestore, but users might use the https version of the URI
    npUri = npUri.replace('https://', 'http://')
  }
  const shuffledApiUrls = [...queryApiUrls].sort(() => 0.5 - Math.random())
  return getUpdateStatusX(npUri, shuffledApiUrls)
}

/**
 * Get update status for a nanopub URI from a specific API
 */
const getUpdateStatusX = async (npUri: string, apiUrls: any): Promise<NpStatus> => {
  if (apiUrls.length == 0) return {type: 'error', html: 'An error has occurred while checking for updates.'}
  if (!npUri) return {type: 'error', html: 'No URI provided, cannot retrieve the Nanopub status.'}
  const apiUrl = apiUrls.shift()
  const requestUrl = `${apiUrl}RA3qSfVzcnAeMOODdpgCg4e-bX6KjZYZ2JQXDsSwluMaI/get-newer-versions-of-np?np=${npUri}`
  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: 'application/json'
      }
    })
    const r = await response.json()
    const bindings = r['results']['bindings']
    const latest: string[] = []
    const retractions: string[] = []
    bindings.forEach((b) => {
      if (!b['retractedBy'] && !b['supersededBy']) {
        latest.push(b['newerVersion']['value'])
      } else if (b['retractedBy'] && !b['supersededBy']) {
        retractions.push(b['retractedBy']['value'])
      }
    });
    if (latest.length == 0 && retractions.length == 0) {
      return {type: 'unpublished', html: '<em>This nanopublication doesn\'t seem to be properly published (yet). This can take a minute or two for new nanopublications.</em>'}
    } else if (latest.length == 1) {
      if (latest[0] === npUri) {
        return {type: 'latest', latestUris: [npUri], html: 'This is the latest version.'}
      } else {
        return {type: 'newer-version', latestUris: [npUri], html: 'This nanopublication has a <a href="' + latest[0] + '">newer version</a>.'}
      }
    } else if (latest.length > 1) {
      return {
        type: 'newer-version',
        latestUris: latest,
        html:
          'This nanopublication has <strong>several newer versions</strong>: <a href="' + latest.join('">latest</a>, <a href="') + '">latest</a>)'
      }
    } else {
      return {
        type: 'retracted',
        retractions: retractions,
        html:
          'This nanopublication has been <strong>retracted</strong>: <a href="' + retractions.join('">retraction</a>, <a href="') + '">retraction</a>'
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
