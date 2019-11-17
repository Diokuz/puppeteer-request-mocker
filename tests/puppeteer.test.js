const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const puppeteer = require('puppeteer')
const waitPort = require('wait-port')
const rimraf = require('rimraf')
const mocker = require('..')

async function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time)
  })
}

describe('connections', () => {
  let page
  let browser
  let server

  beforeAll(async () => {
    const serverPath = path.resolve(__dirname, 'server')
    browser = await puppeteer.launch({
      // headless: false,
      // slowMo: 80,
    })

    page = await browser.newPage()
    // Cant kill if detached: false (for reasons unknown)
    // Probably https://azimi.me/2014/12/31/kill-child_process-node-js.html
    server = spawn('node', [serverPath], { detached: true })
    await waitPort({ host: 'localhost', port: 3000 })
  })

  afterAll(async () => {
    await browser.close()
    // server.kill()
    process.kill(-server.pid)
  })

  it('Generates mocks', async () => {
    rimraf.sync(path.resolve(__dirname, '../__remocks__'))
    await page.goto('http://localhost:3000')

    // * Starting mocker
    await mocker.start({
      page,
      mockList: 'localhost:3000/api',
    })

    // * Typing `abcd` → invoking request to `/api`
    await page.click('#input')
    await page.keyboard.type('abcd', { delay: 100 })

    // * All `/api` requests are slow, so: no mock files at that moment
    let mockFilePath = path.resolve(__dirname, '../__remocks__/localhost-api/get-3af44a5a')
    expect(fs.existsSync(mockFilePath)).toBe(false)

    // * mocker.stop waits for all connections
    await mocker.connections()

    // * At that point there must be mock files
    expect(fs.existsSync(mockFilePath)).toBe(true)

    // * stopping the mocker
    await mocker.stop()

    // await page.screenshot({ path: 'screenshots/github.png' })
  })

  it('Uses existing mocks', async () => {
    await page.goto('http://localhost:3000')

    // * Starting mocker
    await mocker.start({
      page,
      mockList: 'localhost:3000/api',
    })

    // * Typing `abc` → invoking request to `/api`, which are mocked
    await page.click('#input')
    await page.keyboard.type('abc')

    // * Because all requests are mocked, they respond instantly, without delay
    // * So, page reaction on the response must be within 100 ms
    // * Checking that reaction: there must be a text `green` in the suggest div
    await page.waitForFunction(() => {
      return document.querySelector('.suggest').innerText === 'suggest: green'
    }, { timeout: 100 })

    await mocker.stop()
  })

  it('Resolves `connections` even when no requests from mockList were made', async () => {
    await page.goto('http://localhost:3000')

    // * Starting mocker with void mockList
    await mocker.start({
      page,
      mockList: null,
    })

    // * Typing `abc` → invoking request to `/api`, which is not mocked
    await page.click('#input')
    await page.keyboard.type('a')

    // * Awaiting for real response and its corresponding reaction (text `suggest: example` must appear)
    await page.waitForFunction(() => {
      return document.querySelector('.suggest').innerText === 'suggest: example'
    }, { timeout: 4000 })

    // * All connections must resolves after theirs completion
    await expect(mocker.connections()).resolves.toEqual(undefined)

    // * Stopping the mocker
    await mocker.stop()
  })

  it('Resolves `stop` even when no requests from mockList were made', async () => {
    await page.goto('http://localhost:3000')

    // * Starting mocker with void mockList
    await mocker.start({
      page,
      mockList: null,
    })

    // * Typing `abc` → invoking request to `/api`, which is not mocked
    await page.click('#input')
    await page.keyboard.type('a')

    // * Awaiting for real response and its corresponding reaction (text `suggest: example` must appear)
    await page.waitForFunction(() => {
      return document.querySelector('.suggest').innerText === 'suggest: example'
    }, { timeout: 4000 })

    await expect(mocker.stop()).resolves.toEqual(undefined)
  })

  it.skip('Fails `stop` in CI mode when no mock found', async () => {
    await page.goto('http://localhost:3000')

    // * Starting mocker with void mockList
    await mocker.start({ page, mockList: 'localhost:3000/api', ci: true, mockMiss: 'throw', awaitConnectionsOnStop: true })

    // * Typing `x` → invoking request to `/api`, which is not mocked
    await page.click('#input')
    await page.keyboard.type('x')
    await sleep(500)

    // * Expecting `stop` promise to reject, because no `mock file not found` (MONOFO)
    // await expect(mocker.stop()).rejects.toEqual('MONOFO')
  })

  describe('mockMiss', () => {
    it('Do not throws in CI with mockMiss === 200', async () => {
      await page.goto('http://localhost:3000')

      // * Starting mocker with void mockList
      await mocker.start({ page, mockList: 'localhost:3000/api', ci: true, mockMiss: 200 })

      // * Typing `x` → invoking request to `/api`, which is not mocked
      await page.click('#input')
      await page.keyboard.type('x')

      // * Expecting `stop` promise to resolve, because mockMiss is number
      await expect(mocker.stop()).resolves.toEqual()
    })

    it('Uses mockMiss middleware for response', async () => {
      await page.goto('http://localhost:3000')

      // * Starting mocker with void mockList
      await mocker.start({
        page,
        mockList: 'localhost:3000/api',
        ci: true,
        mockMiss: (next) => next({ body: JSON.stringify({ suggest: 'mockMiss_middleware' }) }),
      })

      // * Typing `x` → invoking request to `/api`, which is not mocked
      await page.click('#input')
      await page.keyboard.type('x')

      // * Awaiting for middlware response and its body in suggest div
      await page.waitForFunction(() => {
        return document.querySelector('.suggest').innerText === 'suggest: mockMiss_middleware'
      }, { timeout: 4000 })

      // * Expecting `stop` promise to resolve, because mockMiss is function
      await expect(mocker.stop()).resolves.toEqual()
    })

    it('Must not use mockMiss function if mock exists', async () => {
      await page.goto('http://localhost:3000')

      // * Starting mocker with void mockList
      await mocker.start({
        page,
        mockList: 'localhost:3000/api',
        ci: true,
        mockMiss: (next) => next({ body: JSON.stringify({ suggest: 'mockMiss_middleware' }) }),
      })

      // * Typing `x` → invoking request to `/api`, which is not mocked
      await page.click('#input')
      await page.keyboard.type('abc')

      // * Awaiting for middlware response and its body in suggest div
      await page.waitForFunction(() => {
        return document.querySelector('.suggest').innerText === 'suggest: green'
      }, { timeout: 4000 })

      // * Expecting `stop` promise to resolve
      await expect(mocker.stop()).resolves.toEqual()
    })
  })

})
