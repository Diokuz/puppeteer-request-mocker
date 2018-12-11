# puppeteer-request-mocker

## Do I need that thing?

If you are writing puppeteer tests, and you want to mock your network responses easily – probably yes.

## How to use

```js
import mocker from 'puppeteer-rq'

await mocker.start()

// async stuff which is making requests

await mocker.stop()
```

## API

You could use `options`
```js
mocker.start(options)
```
All options are optional (that's why they called so).
```js
const options = {
  // puppeteer page
  // global.page by default
  page: page,

  mockList: {'my-backend.org/used/by/test': 'mockFilePath' } ,
}
```

Both `mocker.start()` and `mocker.stop()` return a `Promise`.
