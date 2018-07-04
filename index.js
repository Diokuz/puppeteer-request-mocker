const fs =  require('fs')
const path =  require('path')
const { URL } =  require('url')
const crypto =  require('crypto')
const makeDir = require('make-dir')
const argv = require('yargs').argv
const { fy, boxlog } = require('./logger')

const storage = require('./storage')

const pagesSet = new Set()
const reqSet = new Set()

const defaultParams = {
  rootDir: path.join(process.cwd(), '__mocks__'),
  namespace: '__mocks__',
  page: typeof page === 'undefined' ? null : page,
  skipQueryParams: [],
  skipPostParams: [],
  okList: [],
  mockList: [],
  force: false,
  ci: argv.ci,
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

  if (verbose) {
    boxlog(`Mocker starts with resulting config:\n${fy(params)}`)
  }

  if (!localPage) {
    throw new Error('Option "page" and global.page – both are not defined')
  }

  if (pagesSet.has(localPage)) {
    throw new Error('Second "mocker.start()" call on the same page! Probably you didn\'t call "mocker.stop()".')
  }

  pagesSet.add(localPage)

  function handleRequest(interceptedRequest) {
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

  function handlerResponse(interceptedResponse) {
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

        storage.write({
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
        }).then((e) => reqSet.delete(e.names.absFileName))
      })
      .catch((err) => {
        console.error('interceptedResponse.text error:', err)
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

  return localR.then(({ restore }) => {
    return new Promise((resolve, reject) => {
      const timeId = setTimeout(() => {
        console.error(`Some requests didn't finished`)
        console.log('reqSet', [...reqSet])
        clearInterval(intervalId)
        reqSet.clear()
        restore()
        reject()
      }, 15 * 1000)

      const intervalId = setInterval(() => {
        // @todo
        // if (r.params.verbose) {
        //   console.log(`Waiting for requests...`)
        //   console.log('reqSet', [...reqSet])
        // }

        if (reqSet.size === 0) {
          clearTimeout(timeId)
          clearInterval(intervalId)
          restore()
          resolve()
        }
      }, 300)
    })
  }).then(() => {
    // @todo verbose
    // console.log(`Mocker successfully stopped`)
  }).catch(() => {
    console.error(`Mocker failed to stop properly`)
  })
}
