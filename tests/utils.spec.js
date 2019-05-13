const {
  matches,
  searchUrlKey
} = require('../lib/utils');

describe('mathches', () => {
  it('success find url', () => {
    const urlArray = ['_api/test', '_api/test2', '_api/test3'];
    const url = 'http://localhost:3004/_api/test2/';
    expect(matches(urlArray, url)).toBeTruthy();
  });

  it('unsuccessful find url', () => {
    const urlArray = ['_api/test', '_api/test2', '_api/test3'];
    const url = 'http://localhost:3004/_api/noTest/';
    expect(matches(urlArray, url)).toBeFalsy();
  });
});

describe('searchUrlKey', () => {
  it('success find url', () => {
    const urlArray = ['_api/test1', '_api/test2', '_api/test3'];
    const url = 'http://localhost:3004/_api/test2/';
    expect(searchUrlKey(urlArray, url)).toEqual(urlArray[1]);
  });

  it('unsuccessful find url', () => {
    const urlArray = ['_api/test', '_api/test2', '_api/test3'];
    const url = 'http://localhost:3004/_api/noTest/';
    expect(searchUrlKey(urlArray, url)).toBeFalsy();
  });
});