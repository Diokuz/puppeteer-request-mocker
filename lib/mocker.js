const path = require('path');
const makeDir = require('make-dir');
const debug = require('debug');
const createRequestHandler = require('./handleRequest');
const { fy, boxlog } = require('./logger');
const logger = debug('prm');

const defaultParams = {
  rootDir: process.cwd(),
  namespace: '__remocks__',
  page: typeof page === 'undefined' ? null : page,
  mockList: {},
  verbose: false,
  pagesSet: new Set(), // Singleton by default
};

class Mocker {
  constructor (customDefaultParams) {
    this.defaultParams = Object.assign({}, defaultParams, customDefaultParams)
  }

  _getParams (userConfig) {
    const params = Object.assign({}, this.defaultParams, userConfig);
    const { rootDir, namespace } = params;
    const workDir = path.join(rootDir, namespace);

    return { ...params, workDir }
  }

  _validate () {
    const { page, pagesSet } = this.params;

    if (!page) {
      throw new Error('Option "page" and global.page – both are not defined')
    }

    if (pagesSet.has(page)) {
      throw new Error(`Second "mocker.start()" call on the same page!
        Probably you didn\'t call "mocker.stop()".`)
    }

    pagesSet.add(page)
  }

  _reinitReqsPromise () {
    if (this.reqSet.size === 0) {
      this.reqsPromise = new Promise((resolve, reject) => {
        this._resolveReqs = resolve;
        this._rejectReqs = reject
      })
    } else {
      // pass
    }
  }

  /*
   * Starts to intercept requests
   */
  start (userConfig) {
    this.alive = true;
    this.params = this._getParams(userConfig);
    boxlog(`Mocker starts with resulting params:\n${fy(Object.assign({}, this.params, {page: '...'}))}`, logger);
    this._validate();
    this.page = this.params.page;
    this.reqSet = new Set();
    // Clear on any page load, or sometimes you loose some responses on unload, and `connections` will never resolves
    this.params.page.on('load', () => this.reqSet.clear());
    this.requestHandler = createRequestHandler({
      ...this.params,
      reqSet: this.reqSet,
      _onReqStarted: () => this._reinitReqsPromise(),
      _onReqsReject: (...args) => this._rejectReqs(...args),
    });

    logger('Handlers created, params validated');

    this._startPromise = makeDir(this.params.workDir)
      .then(() => {
        logger(`Successfully created workDir ${this.params.workDir}`);

        return this.page.setRequestInterception(true)
      })
      .then(() => {
        // Intercepting all requests and respinding with mocks
        this.page.on('request', this.requestHandler);

        logger('_startPromise about to resolve (Request interception enabled, listeners added)')
      })
      .catch((e) => {
        logger(`Unknown error from puppeteer: ${e.message}`)
      });

    return this._startPromise
  }

  stop () {
    if (!this.alive) {
      // Async, because jest suppress Errors in `after` callbacks
      setTimeout(() => {
        throw new Error(`Trying to stop already stopped mocker! Did you call 'mocker.stop()' twice?`);
      });
    }

    logger('Begining of mocker.stop procedure');

    if (typeof this._startPromise === 'undefined') {
      throw new Error('Cant stop mocker. Probably you didnt start it?')
    }

    return this._startPromise
      .then(() => {
        logger('`Start` and `connections` promises are both resolved');

        this.params.page.removeListener('request', this.requestHandler);

        return this.params.page.setRequestInterception(false);
      })
      .then(() => {
        logger('requestInterception disabled, fail timeout cleared');

        this.params.pagesSet.delete(this.params.page);

        this._startPromise = undefined;
        this.params = undefined;
        this.alive = false;

        boxlog(`Mocker full stop. Period.`, logger);

      })
  }
}

module.exports = Mocker;
