const { shouldOk, shouldNotIntercept } = require('./utils')
const { fy, boxlog } = require('./logger')
const storage = require('./storage')

module.exports = function createHandler (params) {
  const { reqSet, workDir, mockList, okList, ci, verbose } = params

  return function handleRequest(interceptedRequest) {
    const url = interceptedRequest.url()
    const method = interceptedRequest.method()
    const postData = interceptedRequest.postData()
    const reqParams = { url, method, postData }

    if (verbose) {
      console.log(`Request handling for:\n${fy(reqParams)}`)
      console.log('handleRequest', interceptedRequest)
      console.log('decodeURIComponent(postData)', decodeURIComponent(postData))
      console.log('encodeURIComponent(postData)', encodeURIComponent(postData))
    }


    if (shouldNotIntercept(mockList, okList, url)) {
      if (verbose) {
        console.log(`shouldNotIntercept ${url}. interceptedRequest.continue()`)
      }

      interceptedRequest.continue()

      return
    }

    // Just say OK, dont save the mock
    if (shouldOk(mockList, okList, url)) {
      if (verbose) {
        console.log(`Responding with 200-OK for ${url}`)
      }

      interceptedRequest.respond({
        headers: {
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: 'OK',
        status: '200',
      })

      return
    }

    if (verbose) {
      console.log('Trying to read from file')
    }

    storage
      .read({
        url, method, postData, workDir,
        skipQueryParams: params.skipQueryParams,
        skipPostParams: params.skipPostParams,
        verbose,
      })
      .then((data) => {
        const body = data.substring(data.indexOf('\n\n') + 2)

        if (verbose) {
          console.log(`Responding with body:\n ${body}`)
        }

        interceptedRequest.respond({
          headers: {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body,
        })
      })
      .catch((e) => {
        if (verbose) {
          console.log(`Failed to read:\n ${fy(e)}`)
        }

        if (ci) {
          boxlog(`Mock "${e.names.absFileName}" not found!`)
          console.error(`Url "${url}" wasnt mocked!`)
          console.error(`Post body:\n${postData}\npostData.length: ${postData.length}`)

          throw new Error(`Mock "${e.names.absFileName}" not found!`)
        } else {
          reqSet.add(e.names.absFileName)

          interceptedRequest.continue()
        }
      })
  }
}
