const path = require('path');
const debug = require('debug');
const { searchUrlKey, shouldNotIntercept } = require('./utils');
const { fy, boxlog } = require('./logger');
const storage = require('./storage');

const logger = debug('prm:-request');
const defaultHedears = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports = function createHandler(params) {
  const { reqSet, workDir, mockList, verbose } = params;

  logger('Creating request handler');

  return function handleRequest(interceptedRequest) {
    const url = interceptedRequest.url();
    const method = interceptedRequest.method().toUpperCase();
    const postData = interceptedRequest.postData();
    const headers = interceptedRequest.headers();
    const reqParams = { url, method, postData };
    let responseHedears = defaultHedears;
    let mockPath;
    let responseBody;

    logger(`» Intercepted request with method "${method}" and url "${url}"`);

    if (verbose) {
      console.log(`Request handling for:\n${fy(reqParams)}`);
      console.log(`Request headers :\n${fy(headers)}`);
      console.log('handleRequest', interceptedRequest);
      console.log('decodeURIComponent(postData)', decodeURIComponent(postData));
      console.log('encodeURIComponent(postData)', encodeURIComponent(postData));
    }

    if (shouldNotIntercept(mockList, url)) {
      logger('» shouldNotIntercept. Skipping. interceptedRequest.continue().');
      interceptedRequest.continue();
      return;
    }

    const urlKey = searchUrlKey(Object.keys(mockList), url);
    const mockParams = mockList[urlKey];

    if (typeof mockParams === 'object') {
      if (mockParams[method]) {
        const methodMockParams = mockParams[method];
        if (typeof  methodMockParams === 'object') {
          if (methodMockParams.body) {
            responseBody = methodMockParams.body;
          } else {
            if (!methodMockParams.filePath)  {
              throw new Error(`Object has no field 'filePath' and 'body'. Add one of these fields. Url: ${urlKey}, method: ${method}`);
            }
            mockPath = methodMockParams.filePath
          }
          if (methodMockParams.headers) {
            if (typeof methodMockParams.headers !== 'object')  {
              throw new Error(`Headers params is not a object. Url: ${urlKey}, method: ${method}`);
            }
            responseHedears = Object.assign({}, responseHedears, methodMockParams.headers)
          }
        } else {
          mockPath = methodMockParams;
        }
      } else {
        logger('» handleRequest. Skipping. interceptedRequest.continue().');
        interceptedRequest.continue();
        return;
      }
    } else {
      mockPath = mockParams;
    }

    if (responseBody) {
      interceptedRequest.respond({
        headers: responseHedears,
        body: responseBody,
      });
    } else {
      const mock_params = {
        mockPath,
        workDir,
      };

      const fn = storage.name(mock_params);

      params._onReqStarted();
      reqSet.add(fn);
      debug('prm:connections:add')(path.basename(fn), Array.from(reqSet).map((f) => path.basename(f)));
      logger(`» Trying to read from file ${fn}`);

      storage
        .read(fn)
        .then((data) => {
          const r_data = data.replace(/(?:\r)/g, '');
          const body = r_data.substring(r_data.indexOf('\n\n') + 2);

          logger(`« Successfully read from file. Body starts with ${body.substr(0, 100)}`);

          interceptedRequest.respond({
            headers: responseHedears,
            body,
          });
        })
        .catch((e) => {
          logger(`« Failed to read: ${e.fn}`);
          logger(`« Mock not found in CI mode! Rejecting. "${e.fn}" ${url}`);
          params._onReqsReject('MONOFO');
        })
    }
  }
};
