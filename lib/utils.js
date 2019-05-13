const matches = (arr, str) => !!arr.find((el) => str.includes(el));
const searchUrlKey = (arr, str) => arr.find(el => str.includes(el));

// @todo tests
const shouldNotIntercept = (mockList = {}, url = '') => {
  const mockListKeys = Object.keys(mockList);
  const inMockList = matches(mockListKeys, url);


  return !inMockList
};

module.exports = {
  matches,
  shouldNotIntercept,
  searchUrlKey
};
