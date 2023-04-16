// import json2html from 'node-json2html';

export const grlcNpApiUrls = [
  'https://grlc.nps.petapico.org/api/local/local/',
  'https://grlc.services.np.trustyuri.net/api/local/local/'
]

export const getUpdateStatus = (npUri: string) => {
  // document.getElementById(elementId)!.innerHTML = '<em>Checking for updates...</em>';
  const shuffledApiUrls = [...grlcNpApiUrls].sort(() => 0.5 - Math.random())
  return getUpdateStatusX(npUri, shuffledApiUrls)
}

const getUpdateStatusX = (npUri: string, apiUrls) => {
  if (apiUrls.length == 0) {
    // const h: HTMLElement = document.getElementById(elementId) as HTMLInputElement;
    // h.innerHTML = '<em>An error has occurred while checking for updates.</en>';
    return {error: 'error'}
  }
  const apiUrl = apiUrls.shift()
  const requestUrl = apiUrl + '/get_latest_version?np=' + npUri
  const r = new XMLHttpRequest()
  r.open('GET', requestUrl, true)
  r.setRequestHeader('Accept', 'application/json')
  r.responseType = 'json'
  r.onload = function () {
    if (r.status == 200) {
      const bindings = r.response['results']['bindings']
      return bindings
      // if (bindings.length == 1 && bindings[0]['latest']['value'] === npUri) {
      //   h = 'This is the latest version.';
      // } else if (bindings.length == 0) {
      //   h = 'This nanopublication has been <strong>retracted</strong>.';
      // } else {
      //   h = 'This nanopublication has a <strong>newer version</strong>: ';
      //   if (bindings.length > 1) {
      //     h = 'This nanopublication has <strong>newer versions</strong>: ';
      //   }
      //   for (const b of bindings) {
      //     const l = b['latest']['value'];
      //     h += ' <code><a href="' + l + '">' + l + '</a></code>';
      //   }
      // }
      // document.getElementById(elementId)!.innerHTML = h;
    } else {
      return getUpdateStatusX(npUri, apiUrls)
    }
  }
  r.onerror = function () {
    return getUpdateStatusX(npUri, apiUrls)
  }
  return r.send()
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
