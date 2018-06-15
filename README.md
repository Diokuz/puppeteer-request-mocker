# puppeteer-request-mocker

## Do I need that thing?

If you are writing puppeteer tests, and you want to mock your network responses easily – probably yes.

## How to use

```js
import mocker from 'puppeteer-request-mocker'

await mocker.run()

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
mocker.run(options)
```
All options are optional (that's why they called so).
```js
const options = {
  // Absolute path to folder where you want to store mocks
  // process.cwd() + '/__mocks__' by default
  rootDir: __dirname,

  // puppeteer page
  // global.page by default
  page: page,

  // In some cases you could have some random GET params, which are not affects the response body
  // but could lead to `always out of date` mocks
  // [] by default
  skipQueryParams: ['randomId', 'timestamp'],

  // Same as skipQueryParams but for post body params
  // Only application/json MIME type is supported
  skipPostParams: ['randomId', 'timestamp'],

  // Probably you dont want to mock some requests (e.g. cdn js files)
  // And you definitely dont want to mock your webapp requests (e.g. localhost/app.js)
  // So, you could explicitly whitelist urls you want to mock
  // _all except localhost_ by default
  mockList: ['my-backend.org/used/by/test'],

  // It is recommended to explicitly mock only _critical-for-your-test_ urls
  // But you could also mock with simple 200-OK response some other requests,
  // which are not critical, but should be intercepted
  // (to prevent ddos-effect to your real backend, for example)
  // All items from mockList have higher priority over okList
  okList: ['my-backend.org/not/critical/for/test'],

  // Run as CI if true. That means, your tests will fail if any of the requests were not mocked
  ci: false,

  // Additional logs if true.
  verbose: false,
}
```

Both `mocker.run()` and `mocker.stop()` return a `new Promise()`.
