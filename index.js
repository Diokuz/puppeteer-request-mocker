const fs =  require('fs')
const path =  require('path')
const { URL } =  require('url')
const crypto =  require('crypto')
const makeDir = require('make-dir')

const storage = require('./storage')

const pagesSet = new Set()

const defaultParams = {
  rootDir: path.join(process.cwd(), '__mocks__'),
  namespace: '__mocks__',
  page: typeof page === 'undefined' ? null : page,
  skipQueryParams: [],
  okList: [],
  mockList: [],
  force: false,
  ci: false,
  verbose: false,
}

const matches = (arr, str) => !!arr.find((el) => str.includes(el))

// @todo tests
const shouldNotIntercept = (mockList = [], okList = [], url = '') => {
  const inOkList = matches(okList, url)
  const inMockList = matches(mockList, url)
  const inAnyList = inOkList || inMockList
  const listsAreConfigured = mockList.length > 0 || okList.length > 0

  // If mockList/okList werent set – intercept all requests except localhost
  return (listsAreConfigured && !inAnyList) ||
    (!listsAreConfigured && url.includes('localhost'))
}

const shouldOk = (mockList = [], okList = [], url = '') => {
  const inOkList = matches(okList, url)
  const inMockList = matches(mockList, url)

  return inOkList && !inMockList
}

function mock (paramsArg) {
  const params = Object.assign({}, defaultParams, paramsArg)
  const { rootDir, namespace, mockList, okList, force, ci, verbose } = params
  const localPage = params.page
  const workDir = path.join(rootDir, namespace)

  if (!localPage) {
    throw new Error('Option "page" and global.page – both are not defined')
  }

  if (pagesSet.has(localPage)) {
    throw new Error('Second mock call on the same page! Probably you forgot to restore previous mock.')
  }

  pagesSet.add(localPage)

  function handleRequest(interceptedRequest) {
    const url = interceptedRequest.url()
    const method = interceptedRequest.method()
    const postData = interceptedRequest.postData()

    if (shouldNotIntercept(mockList, okList, url)) {
      interceptedRequest.continue()

      return
    }

    // Just say OK, dont save the mock
    if (shouldOk(mockList, okList, url)) {
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

    storage
      .read({ url, method, postData, workDir, skipQueryParams: params.skipQueryParams })
      .then((data) => {
        const body = data.substring(data.indexOf('\n\n') + 2)

        interceptedRequest.respond({
          headers: {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body,
        })
      })
      .catch((err) => {
        // mock is not exist for now
        // console.error(err)

        interceptedRequest.continue()
      })
  }

  function handlerResponse(interceptedResponse) {
    const request = interceptedResponse.request()
    const postData = request.postData() || ''
    const url = request.url()
    const method = request.method()

    // If synthetic OK-response, no needs to write it to fs
    if (shouldNotIntercept(mockList, okList, url) || shouldOk(mockList, okList, url)) {
      return
    }

    interceptedResponse.text()
      .then((text) => {
        storage.write({
          url,
          method,
          postData,
          body: `${method.toUpperCase()} ${url} ${postData}\n\n${text}`,
          workDir,
          skipQueryParams: params.skipQueryParams,
          force,
          ci,
        })
      })
      .catch((err) => {
        if (verbose) {
          console.error(err)
        }
      })
  }

  return makeDir(workDir)
    .then(localPage.setRequestInterception(true))
    .then(() => {
      // Intercepting all requests and respinding with mocks
      localPage.on('request', handleRequest)

      // Writing mocks on real responses to filesystem
      localPage.on('response', handlerResponse)
    })
    .catch((e) => {
      if (verbose) {
        console.log(e)
      }
    })
    .then(() => ({
      // This guy will be used in `stop` exported method
      restore() {
        localPage.removeListener('request', handleRequest)
        localPage.removeListener('response', handlerResponse)
        pagesSet.delete(localPage)

        return localPage.setRequestInterception(false)
      }
    }))
}

let r = null
exports.run = (arg) => {
  r = mock(arg)

  return r
}

exports.stop = () => {
  if (r === null) {
    throw new Error('Nothing to stop')
  }

  let localR = r

  r = null

  return localR.then(({ restore }) => restore())
}
