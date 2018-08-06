const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const puppeteer = require('puppeteer')
const waitPort = require('wait-port')
const rimraf = require('rimraf')
const mocker = require('..')

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
    rimraf.sync(path.resolve(__dirname, '../__remocks__'))
    server = spawn('node', [serverPath])
    await waitPort({ host: 'localhost', port: 3000 })
  })

  afterAll(async () => {
    await browser.close()
    server.kill()
  })

  it('Generates mocks', async () => {
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
    await mocker.stop()

    // * At that point there must be mock files
    expect(fs.existsSync(mockFilePath)).toBe(true)

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

    // @todo await expect(mocker.connections()).resolves.toEqual(undefined)
    await expect(mocker.stop()).resolves.toEqual(undefined)
  })

  it.skip('Fails in CI mode when no mock found', async () => {
    await page.goto('http://localhost:3000')

    // * Starting mocker with void mockList
    await mocker.start({
      page,
      mockList: 'localhost:3000/api',
      ci: true,
    })

    try {
      // * Typing `abc` → invoking request to `/api`, which is not mocked
      await page.click('#input')
      await page.keyboard.type('x')

      // await page.waitForFunction(() => {
      //   return document.querySelector('.suggest').innerText === 'suggest: unknown'
      // }, { timeout: 4000 })
      await expect(mocker.stop()).resolves.toEqual(undefined)
    } catch (e) {
      console.log('eee', e)
    }

    process.on('uncaughtException', e => console.log('xxx', e))

    // @todo await expect(mocker.connections()).resolves.toEqual(undefined)
    // await expect(mocker.stop()).resolves.toEqual(undefined)
  })
})
