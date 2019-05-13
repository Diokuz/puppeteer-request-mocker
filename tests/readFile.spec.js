const read = require('../lib/storage').read;
const path = require('path');

describe('Read file', () => {
  const filePath = path.join(process.cwd(), 'tests/__remocks__/test');

  it('resolve read file', () => {
    return read(filePath).then(data => expect(data).toEqual("{test: 'test'}\n"));
  });

  it('reject read file', () => {
    const notExistsFilePath = filePath + '1';
    return read(notExistsFilePath)
      .catch(e => expect(e.fn).toEqual(notExistsFilePath));
  });
});
