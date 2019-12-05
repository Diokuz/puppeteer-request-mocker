const path = require('path')
const debug = require('debug')
const { shouldOk, shouldNotIntercept } = require('./utils')
const storage = require('./storage')

const logger = debug('prm:response')

module.exports = function createHandler(initialParams) {
  logger('Creating response handler')

  return function handlerResponse(interceptedResponse, extraParams = {}) {
    const params = { ...initialParams, ...extraParams }
    const {
      reqSet,
      workDir,
      mockList,
      okList,
      verbose,
      force,
      ci,
      queryParams,
      skipQueryParams,
      skipPostParams,
    } = params
    const request = interceptedResponse.request()
    const postData = request.postData() || ''
    const url = request.url()
    const method = request.method()
    const headers = request.headers()
    const resParams = { url, method, postData }

    logger(`» Intercepted response with method "${method}" and url "${url}"`)

    if (verbose) {
      console.log(`Response handling for:\n${resParams}`)
      console.log(`Request headers :\n${headers}`)
      console.log('decodeURIComponent(postData)', decodeURIComponent(postData))
      console.log('encodeURIComponent(postData)', encodeURIComponent(postData))
    }

    // If synthetic OK-response, no needs to write it to fs
    if (shouldNotIntercept(mockList, okList, url) || shouldOk(mockList, okList, url)) {
      logger('» shouldNotIntercept or shouldOk. Skipping.')

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

    logger(`» Preparing to write a new file (if it does not exist and it is not CI) ${fn}`)

    interceptedResponse
      .text()
      .then((text) => {
        logger(`« Response text starts with: ${text.substr(0, 100)}`)
        logger(`« Sending the response to storage.write`)

        if (ci) {
          reqSet.delete(fn)
          debug('prm:connections:delete')(
            path.basename(fn),
            Array.from(reqSet).map((f) => path.basename(f))
          )

          return
        }

        /*
         * Do not write in CI, because
         * 1) It is forbidden anyway (handle mock-miss in storage.read)
         * 2) Because it breaks mockMiss behavior
         */
        return storage
          .write({
            url,
            fn,
            body: `${method.toUpperCase()} ${url} ${postData}\n\n${text}`,
            ci,
          })
          .then((e) => {
            logger(`« Successfully exited from storage.write for file ${e.fn}`)

            reqSet.delete(e.fn)
            debug('prm:connections:delete')(
              path.basename(fn),
              Array.from(reqSet).map((f) => path.basename(f))
            )
          })
          .catch((err) => {
            debug('prm:connections:delete')('fail', path.basename(fn), err)
            console.error(`Fail to save the file because of `, err)
            params._onReqsReject('WRITEERR')
          })
      })
      .catch((err) => {
        logger('« interceptedResponse.text error:', err)
      })
      .then(() => {
        // finally
        logger(`« About to exit the response handler. reqSet.size is ${reqSet.size}`)

        if (reqSet.size === 0) {
          logger('« Invoking _onReqsCompleted')

          params._onReqsCompleted()

          logger('« Response is done.')
        }
      })
  }
}
