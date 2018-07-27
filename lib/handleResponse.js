const { shouldOk, shouldNotIntercept } = require('./utils')
const { fy, boxlog } = require('./logger')
const storage = require('./storage')

module.exports = function createHandler (params) {
  const { reqSet, workDir, mockList, okList, verbose, force, ci } = params

  return function handlerResponse(interceptedResponse) {
    const request = interceptedResponse.request()
    const postData = request.postData() || ''
    const url = request.url()
    const method = request.method()
    const resParams = { url, method, postData }

    if (verbose) {
      console.log(`Response handling for:\n${fy(resParams)}`)
      console.log('decodeURIComponent(postData)', decodeURIComponent(postData))
      console.log('encodeURIComponent(postData)', encodeURIComponent(postData))
    }

    // If synthetic OK-response, no needs to write it to fs
    if (shouldNotIntercept(mockList, okList, url) || shouldOk(mockList, okList, url)) {
      if (verbose) {
        console.log(`shouldNotIntercept. return.`)
      }

      return
    }

    interceptedResponse.text()
      .then((text) => {
        if (verbose) {
          console.log(`Response.text(): ${text}`)
        }

        return storage.write({
          url,
          method,
          postData,
          body: `${method.toUpperCase()} ${url} ${postData}\n\n${text}`,
          workDir,
          skipQueryParams: params.skipQueryParams,
          skipPostParams: params.skipPostParams,
          force,
          ci,
          verbose
        }).then((e) => {
          reqSet.delete(e.names.absFileName)
        })
      })
      .catch((err) => {
        console.error('interceptedResponse.text error:', err)
      })
      .then(() => { // finally
        if (reqSet.size === 0) {
          params._onReqsCompleted()
        }
      })
  }
}
