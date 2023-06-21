export const grlcNpApiUrls = [
  'https://grlc.nps.petapico.org/api/local/local/',
  'https://grlc.services.np.trustyuri.net/api/local/local/',
  'http://grlc.nanopubs.lod.labs.vu.nl/api/local/local/',
  'http://grlc.np.dumontierlab.com/api/local/local/'
]

// TODO: handle when https://purl.org is used instead of http://purl.org?
export const getUpdateStatus = async (npUri: string) => {
  const shuffledApiUrls = [...grlcNpApiUrls].sort(() => 0.5 - Math.random())
  return getUpdateStatusX(npUri, shuffledApiUrls)
}

/**
 * Get update status for a nanopub URI in one of the APIs
 */
const getUpdateStatusX = async (npUri: string, apiUrls: any) => {
  if (apiUrls.length == 0) {
    return {error: 'An error has occurred while checking for updates.'}
  }
  const apiUrl = apiUrls.shift()
  const requestUrl = `${apiUrl}get_latest_version?np=${npUri}`
  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: 'application/json'
      }
    })
    const r = await response.json()
    return r['results']['bindings']
  } catch (error) {
    return getUpdateStatusX(npUri, apiUrls)
  }
}

export const getJson = (url: string, callback: any) => {
  const request = new XMLHttpRequest()
  request.open('GET', url, true)
  request.responseType = 'json'
  request.onload = function () {
    const status = request.status
    if (status === 200) {
      callback(null, request.response)
    } else {
      callback(status, request.response)
    }
  }
  request.send()
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

export const getLatestNp = callback => {
  fetch('https://server.np.trustyuri.net/nanopubs.txt')
    .then(response => response.text())
    .then(data => {
      const lines = data.split(/\n/)
      callback(lines[lines.length - 2].trim())
    })
}

export const isTrustyUri = (uri: string) => {
  return /.*[^A-Za-z0-9_\-](RA[A-Za-z0-9_\-]{43})/.test(uri)
}

export const getArtifactCode = (uri: string) => {
  if (isTrustyUri(uri)) return uri.replace(/^.*[^A-Za-z0-9_\-](RA[A-Za-z0-9_\-]{43})$/, '$1')
  return null
}

export const getShortCode = (uri: string) => {
  const ac = getArtifactCode(uri)
  if (ac == null) return null
  return ac.substring(0, 10)
}
