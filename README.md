# puppeteer-request-mocker

## Do I need that thing?

If you are writing puppeteer tests, and you want to mock your network responses easily – probably yes.

## How to use

```js
import mocker from 'puppeteer-request-mocker'

await mocker.start()

// async stuff which is making requests

await mocker.stop()
```

## How it works

First, `puppeteer-request-mocker` intercepts puppeteers page requests and tries to find its body in mocks folder. Generated filename depends on `url`, `method` and `postBody` – so, you always know, do you have a mock for that particular request or not. If you have it – you will get it as a response, instantly. If not – request will go to the real backend (see also: mockList and okList).

Second, `puppeteer-request-mocker` intercepts all responds, and writes them to the filesystem, if they are not on it already. In case of `CI` (and if mock was not found), it throws an error, so you could be sure – all your requests are mocked (or build will fail otherwise).

`puppeteer-request-mocker` only listening for whitelisted domains (which are _all except localhost_ by default).

## API

You could use `options`
```js
mocker.start(options)
```
All options are optional (that's why they called so).
```js
const options = {
  // Absolute path to folder where you want to store mocks
  // process.cwd() + '/__remocks__' by default
  workDir: __dirname,

  // puppeteer page
  // global.page by default
  page: page,

  // In some cases you could have some random GET params, which are not affect the response body
  // but several params may be important for you (White List)
  // [] by default
  queryParams: ['important'],

  // In some cases you could have some random GET params, which are not affects the response body
  // but could lead to `always out of date` mocks (Black List)
  // [] by default
  skipQueryParams: ['randomId', 'timestamp'],

  // Same as skipQueryParams but for post body params
  // Only application/json MIME type is supported
  skipPostParams: [
      'randomId',
      'timestamp',
      ['objectParameter', 'property']
  ],

  // Probably you dont want to mock some requests (e.g. cdn js files)
  // And you definitely dont want to mock your webapp requests (e.g. localhost/app.js)
  // So, you could explicitly whitelist urls you want to mock
  // _all except localhost_ if both – mockList and okList – were not set
  // Could be an array, or a `,` delimited string
  mockList: 'my-backend.org/used/by/test',

  // It is recommended to explicitly mock only _critical-for-your-test_ urls
  // But you could also mock with simple 200-OK response some other requests,
  // which are not critical, but should be intercepted
  // (to prevent ddos-effect to your real backend, for example)
  // All items from mockList have higher priority over okList
  // Could be an array, or a `,` delimited string
  okList: ['my-backend.org/not/critical/for/test'],

  // Run as CI if true. That means, your tests will fail if any of the requests were not mocked
  // Default is `is-ci` package value (same as in Jest)
  ci: require('is-ci'),

  // A middleware to call when mock is not found on the file system
  // Works only in CI mode
  // Possible values are:
  // 1) 'throw' (string, default) – will throw an error
  // 2) CODE (number) – respond with CODE http code for any unmocked request (e.g. 200)
  // 3) (next) => next(anyResponse) - respond with anyResponse object
  // Note: request is not available in the middleware function
  // Note: body must be a string (use JSON.stringify for objects)
  mockMiss: (next) => next({ code: 200, body: JSON.stringify({ foo: 'bar' }) }),

  // Set true, to await all non-closed connections when trying to stop mocker
  awaitConnectionsOnStop: false,
}
```

Both `mocker.start()` and `mocker.stop()` return a `Promise`.
