const path = require('path')
const debug = require('debug')
const { shouldOk, shouldNotIntercept } = require('./utils')
const { fy } = require('./logger')
const storage = require('./storage')

const logger = debug('prm:-request')

module.exports = function createHandler (params) {
  const { reqSet, workDir, mockList, okList, ci, verbose, cacheRequests,
    queryParams, skipQueryParams, skipPostParams, mockMiss, responseHeaders } = params

  logger('Creating request handler')

  return function handleRequest(interceptedRequest) {
    const url = interceptedRequest.url()
    const method = interceptedRequest.method()
    const postData = interceptedRequest.postData()
    const headers = interceptedRequest.headers()
    const reqParams = { url, method, postData }

    if (cacheRequests) {
      logger(`» Cached request with method "${method}" and url "${url}"`)
      params._onSetReqCache(interceptedRequest)
    }

    logger(`» Intercepted request with method "${method}" and url "${url}"`)

    if (verbose) {
      console.log(`Request handling for:\n${fy(reqParams)}`)
      console.log(`Request headers :\n${fy(headers)}`)
      console.log('handleRequest', interceptedRequest)
      console.log('decodeURIComponent(postData)', decodeURIComponent(postData))
      console.log('encodeURIComponent(postData)', encodeURIComponent(postData))
    }

    if (shouldNotIntercept(mockList, okList, url)) {
      logger('» shouldNotIntercept. Skipping. interceptedRequest.continue().')

      interceptedRequest.continue()

      return
    }

    // Just say OK, dont save the mock
    if (shouldOk(mockList, okList, url)) {
      logger('» shouldOk. Skipping. Responding with 200-OK')

      interceptedRequest.respond({
        headers: responseHeaders,
        body: 'OK',
        status: '200',
      })

      return
    }

    const mock_params = {
      url,
      method,
      headers,
      postData,
      queryParams,
      skipQueryParams,
      skipPostParams,
      verbose,
      workDir,
    }

    const fn = storage.name(mock_params)

    params._onReqStarted()
    reqSet.add(fn)
    debug('prm:connections:add')(path.basename(fn), Array.from(reqSet).map((f) => path.basename(f)))

    logger(`» Trying to read from file ${fn}`)

    storage
      .read(fn)
      .then((data) => {
        const r_data = data.replace(/(?:\r)/g, '')
        const body = r_data.substring(r_data.indexOf('\n\n') + 2)

        logger(`« Successfully read from file. Body starts with ${body.substr(0, 100)}`)

        interceptedRequest.respond({
          headers: responseHeaders,
          body,
        })
      })
      .catch((e) => {
        logger(`« Failed to read: ${e.fn}`)

        if (ci) {
          if (mockMiss === 'throw') {
            console.error(`« Mock not found in CI mode! Rejecting. "${e.fn}" ${url}`)

            params._onReqsReject('MONOFO')
          } else if (typeof mockMiss === 'number') {
            interceptedRequest.respond({
              code: mockMiss,
              body: 'OK',
            })
          } else if (typeof mockMiss === 'function') {
            mockMiss((response) => {
              interceptedRequest.respond(response)
            })
          } else {
            params._onReqsReject(`Wrong mockMiss value. Check mocker.start() params and read the docks.`)
          }
        } else {
          logger('« About to interceptedRequest.continue...')
          interceptedRequest.continue()
        }
      })
  }
}
