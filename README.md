# puppeteer-request-mocker

## How to use

```js
import mocker from 'puppeteer-request-mocker'

...
beforeAll(async () => {
  await mocker.run({
    rootDir: __dirname,
    whiteList: ['example.com', 'mybackend.org'],
  })
})

afterAll(async () => {
  await mocker.stop()
})
```
