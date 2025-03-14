Build:

    $ yarn build

HTML test code:

    <html lang="en">
      <head><script type="module" src="nanopub-utils/dist/index.min.js"></script></head>
      <body><h1>Check the console</h1></body>
      <script type="module">
        const {getUpdateStatus, Nanopub} = NanopubUtils
        console.log(await getUpdateStatus('https://w3id.org/np/RAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'))
        console.log(await getUpdateStatus('http://purl.org/np/RAQIX0i-LjZs1mRakp1Ee0wf7XcQmdhFQvrfOd7pjFiuw'))
        console.log(await getUpdateStatus('http://purl.org/np/RAnxJvccrJq_S63P6KP5ujwaLND5mV15iVke03AqVVF-o'))
        console.log(await getUpdateStatus('http://purl.org/np/RALS50Z57WzbjVsj2mZLAIX34_GicNnn2RMAlZd-yjpYo'))
      </script>
    </html>

