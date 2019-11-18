const path = require('path')
const url = require('url')
const debug = require('debug')
const { shouldOk, shouldNotIntercept, isPassableByDefault } = require('./utils')
const storage = require('./storage')

const logger = debug('prm:-request')

module.exports = function createHandler(params) {
  const {
    pageUrl,
    reqSet,
    workDir,
    mockList,
    okList,
    ci,
    verbose,
    cacheRequests,
    passList,
    queryParams,
    skipQueryParams,
    skipPostParams,
    mockMiss,
    responseHeaders,
  } = params

  logger('Creating request handler')

  return function handleRequest(interceptedRequest) {
    const url = interceptedRequest.url()
    const method = interceptedRequest.method()
    const postData = interceptedRequest.postData()
    const headers = interceptedRequest.headers()
    const reqParams = { url, method, postData }

    // https://github.com/Diokuz/puppeteer-request-mocker/pull/12
    if (cacheRequests) {
      logger(`» Cached request with method "${method}" and url "${url}"`)
      params._onSetReqCache(interceptedRequest)
    }

    logger(`» Intercepted request with method "${method}" and url "${url}"`)

    if (verbose) {
      console.log(`Request handling for:\n${reqParams}`)
      console.log(`Request headers :\n${headers}`)
      console.log('handleRequest', interceptedRequest)
      console.log('decodeURIComponent(postData)', decodeURIComponent(postData))
      console.log('encodeURIComponent(postData)', encodeURIComponent(postData))
    }

    // If url is not in mockList nor okList
    if (shouldNotIntercept(mockList, okList, url)) {
      logger('» shouldNotIntercept')
      let isPassable

      if (passList && passList.length) {
        isPassable = passList.find((passUrl) => url.startsWith(passUrl))
      } else {
        isPassable = isPassableByDefault(pageUrl, url, method)
      }

      if (!isPassable) {
        console.error(`Url ${url} is not from the options.passList, aborting request`)
        console.error(`pageUrl is "${pageUrl}", passList is "${passList}"`)
        interceptedRequest.abort('aborted')
      } else {
        logger(`» Url is from pass list, sending it to real server`)
        interceptedRequest.continue()
      }

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
    debug('prm:connections:add')(
      path.basename(fn),
      Array.from(reqSet).map((f) => path.basename(f))
    )

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
              body: 'Mock not found',
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
