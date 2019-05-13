const getNames = require('../lib/storage').name;

it('Generates filename', () => {
  const names = getNames({
    mockPath: 'mock/file',
    workDir: '/diokuz/dir'
  });

  expect(names).toBe('/diokuz/dir/mock/file')
});
