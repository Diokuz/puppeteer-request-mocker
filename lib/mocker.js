/*
 * It is a singleton, the only instance is located in `exports`
 * @todo instantiate for each test suite explicitly
 */

const path = require('path')
const makeDir = require('make-dir')
const argv = require('yargs').argv
const createRequestHandler = require('./handleRequest')
const createResponseHandler = require('./handleResponse')
const { fy, boxlog } = require('./logger')

const defaultParams = {
  rootDir: process.cwd(),
  namespace: '__remocks__',
  page: typeof page === 'undefined' ? null : page,
  skipQueryParams: [],
  skipPostParams: [],
  okList: [],
  mockList: [],
  force: false,
  ci: argv.ci,
  verbose: false,
  pagesSet: new Set(), // Singleton by default
}

class Mocker {
  constructor (customDefaultParams) {
    this.defaultParams = Object.assign({}, defaultParams, customDefaultParams)
  }

  _getParams (userConfig) {
    const params = Object.assign({}, this.defaultParams, userConfig)
    const { rootDir, namespace } = params
    const workDir = path.join(rootDir, namespace)

    return { ...params, workDir }
  }

  _validate () {
    const { verbose, page, pagesSet } = this.params

    if (verbose) {
      boxlog(`Mocker starts with resulting params:\n${fy(this.params)}`)
    }

    if (!page) {
      throw new Error('Option "page" and global.page – both are not defined')
    }

    if (pagesSet.has(page)) {
      throw new Error(`Second "mocker.start()" call on the same page!
        Probably you didn\'t call "mocker.stop()".`)
    }

    pagesSet.add(page)
  }

  run (cfg) {
    console.warn('mocker.run is deprecated. Use mocker.start instead.')

    return this.start(cfg)
  }

  /*
   * Starts to intercept requests
   */
  start (userConfig) {
    this.params = this._getParams(userConfig)
    this._validate()
    this.page = this.params.page
    this.reqSet = new Set()
    this.requestHandler = createRequestHandler({
      ...this.params,
      reqSet: this.reqSet,
    })
    this.reqsPromise = new Promise((resolve, reject) => {
      this._resolveReqs = resolve
    })
    this.responseHandler = createResponseHandler({
      ...this.params,
      reqSet: this.reqSet,
      _onReqsCompleted: () => this._resolveReqs(),
    })

    this._startPromise = makeDir(this.params.workDir)
      .then(this.page.setRequestInterception(true))
      .then(() => {
        // Intercepting all requests and respinding with mocks
        this.page.on('request', this.requestHandler)

        // Writing mocks on real responses to filesystem
        this.page.on('response', this.responseHandler)
      })
      .catch((e) => {
        if (this.params.verbose) {
          console.log(e)
        }
      })

    return this._startPromise
  }

  /*
   * Resolves when all mocked connections are completed
   */
  connections () {
    if (typeof this._startPromise === 'undefined') {
      throw new Error('Cant await connections. Probably you didnt start the mocker?')
    }

    if (this.reqSet.size === 0) {
      // @todo rework connections
      return Promise.resolve()
    }

    return this.reqsPromise
  }

  /*
   * Waits for all connections to be completed and removes all handlers from the page
   */
  stop () {
    const t1 = setTimeout(() => {
      boxlog(`Mocker failed to stop. Alive connections:\n${fy(this.reqSet)}`)
      throw new Error(`Failed to stop mocker!`)
    }, 20 * 1000)

    if (typeof this._startPromise === 'undefined') {
      throw new Error('Cant stop mocker. Probably you didnt start it?')
    }

    return this._startPromise
      .then(() => this.connections())
      .then(() => {
        clearTimeout(t1)

        this.params.page.removeListener('request', this.requestHandler)
        this.params.page.removeListener('response', this.responseHandler)

        return this.params.page.setRequestInterception(false)
      })
      .then(() => {
        this.params.pagesSet.delete(this.params.page)
      })
  }
}

module.exports = Mocker
