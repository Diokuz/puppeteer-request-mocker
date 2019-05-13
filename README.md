yaspeller
=========
[![NPM version](https://img.shields.io/npm/v/puppeteer-rq.svg)](https://www.npmjs.com/package/puppeteer-rq)
[![NPM Downloads](https://img.shields.io/npm/dm/puppeteer-rq.svg?style=flat)](https://www.npmjs.org/package/puppeteer-rq)

If you are writing puppeteer tests, and you want to mock your network responses easily – then this package will help you.
## Getting Started
### Installing
To use "Puppeteer-rq" in your project, run:
```
npm i --save-dev puppeteer-rq
```
### Usage
```js
// first you need to import the package
import mocker from 'puppeteer-rq';
// start mocker with params
await mocker.start(options);

// and stop mocker after test run
await mocker.stop();
//Both `mocker.start()` and `mocker.stop()` return a `Promise`.
```
You could use `options`
```js
const options = {
  // puppeteer page
  page: page,
  // default namespace: '__remocks__'
  namespace: 'mockDirPath',
  mockList: {
    '_api/method': 'mockFilePath',
    '_api/method2': {
      GET: 'getMockFilePath',
      POST: 'postMockFilePath',
    },
    '_api/method3': {
      GET: {
        body: 'response',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      POST: {
        filePath: 'postMockFilePath',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    } 
  }
}
```

