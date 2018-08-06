const path = require('path')
const debug = require('debug')
const { shouldOk, shouldNotIntercept } = require('./utils')
const { fy, boxlog } = require('./logger')
const storage = require('./storage')

const logger = debug('prm:-request')

module.exports = function createHandler (params) {
  const { reqSet, workDir, mockList, okList, ci, verbose, skipQueryParams, skipPostParams } = params

  logger('Creating request handler')

  return function handleRequest(interceptedRequest) {
    const url = interceptedRequest.url()
    const method = interceptedRequest.method()
    const postData = interceptedRequest.postData()
    const reqParams = { url, method, postData }

    logger(`» Intercepted request with method "${method}" and url "${url}"`)

    if (verbose) {
      console.log(`Request handling for:\n${fy(reqParams)}`)
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

    const fn = storage.name(url, method, postData, workDir, skipQueryParams, skipPostParams)

    params._onReqStarted()
    reqSet.add(fn)
    debug('prm:connections:add')(path.basename(fn), Array.from(reqSet).map((f) => path.basename(f)))

    logger(`» Trying to read from file ${fn}`)

    storage
      .read(fn)
      .then((data) => {
        const body = data.substring(data.indexOf('\n\n') + 2)

        logger(`« Successfully red from file. Body starts with ${body.substr(0, 100)}`)

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
        logger(`« Failed to read: ${e.fn}`)

        if (ci) {
          logger(`« Mock not found in CI mode! Rejecting. "${e.fn}" ${url}`)

          params._onReqsReject('MONOFO')
        } else {
          logger('« About to interceptedRequest.continue...')
          interceptedRequest.continue()
        }
      })
  }
}
