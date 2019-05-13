const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const waitPort = require('wait-port');
const mocker = require('..');
jest.setTimeout(30000);

describe('mocker', () => {
  let page;
  let browser;
  let server;

  beforeAll(async () => {
    const serverPath = path.resolve(__dirname, 'server');
    browser = await puppeteer.launch({
      // headless: false
    });

    page = await browser.newPage();
    server = spawn('node', [serverPath], { detached: true });
    await waitPort({ host: 'localhost', port: 3000 });
  });

  afterAll(async () => {
    await browser.close();
    process.kill(-server.pid);
  });

  it('default call', async () => {
    await page.goto('http://localhost:3000');
    await mocker.start({
      namespace: 'tests/__remocks__',
      page,
      mockList: {
        'api': 'get_api'
      }
    });
    await page.click('#button');
    await page.waitForSelector('.response-body');
    await mocker.stop();
    const responseText = await getText(page, '.response-body');
    expect(responseText).toEqual('{"title":"mock_response"}');
    const responseHeaders = await getText(page, '.response-headers');
    expect(responseHeaders).toEqual('application/json')
  });

  it('call with type method', async () => {
    await page.goto('http://localhost:3000');
    await mocker.start({
      namespace: 'tests/__remocks__',
      page,
      mockList: {
        'api': {GET: 'get_api'}
      }
    });
    await page.click('#button');
    await page.waitForSelector('.response-body');
    await mocker.stop();
    const responseText = await getText(page, '.response-body');
    expect(responseText).toEqual('{"title":"mock_response"}');
  });

  it('call with response body', async () => {
    const responseBody = '{"title":"mock_response"}';
    await page.goto('http://localhost:3000');
    await mocker.start({
      namespace: 'tests/__remocks__',
      page,
      mockList: {
        'api': {
          GET: {
            body: responseBody
          }
        }
      }
    });
    await page.click('#button');
    await page.waitForSelector('.response-body');
    await mocker.stop();
    const responseText = await getText(page, '.response-body');
    expect(responseText).toEqual(responseBody);
  });

  it('call with response headers', async () => {
    await page.goto('http://localhost:3000');
    await mocker.start({
      namespace: 'tests/__remocks__',
      page,
      mockList: {
        'api': {
          GET: {
            filePath: 'get_api',
            headers: {
              'Content-Type': 'text/html; charset=utf-8'
            }
          }
        }
      }
    });
    await page.click('#button');
    await page.waitForSelector('.response-body');
    await mocker.stop();
    const responseText = await getText(page, '.response-body');
    expect(responseText).toEqual('{"title":"mock_response"}');
  });


  async function getText(page, selector) {
    return await page.evaluate(
      selector => document.querySelector(selector).innerText,
      selector
    );
  }
});