const getNames = require('../lib/storage').__getNames

// url, method, postData = '', workDir, skipQueryParams = [], skipPostParams = []

it('Generates filename for domain without slash', () => {
  const names = getNames(
    'http://example.com',
    'GET',
    '',
    '/diokuz/dir',
  )

  expect(names.targetDir).toBe('/diokuz/dir/example.com')
  expect(names.absFileName).toBe('/diokuz/dir/example.com/get-d3c8eae0')
})

it('Generates filename for domain with slash', () => {
  const names = getNames(
    'http://example.com/',
    'GET',
    '',
    '/diokuz/dir',
  )

  expect(names.targetDir).toBe('/diokuz/dir/example.com')
  expect(names.absFileName).toBe('/diokuz/dir/example.com/get-d3c8eae0')
})

it('Generates filename for domain with slugs', () => {
  const names = getNames(
    'http://example.com/foo/bar',
    'GET',
    '',
    '/diokuz/dir',
  )

  expect(names.targetDir).toBe('/diokuz/dir/example.com-foo-bar')
  expect(names.absFileName).toBe('/diokuz/dir/example.com-foo-bar/get-edab160c')
})

it('Generates filename for domain with slugs and trailing slash', () => {
  const names = getNames(
    'http://example.com/foo/bar/',
    'GET',
    '',
    '/diokuz/dir',
  )

  expect(names.targetDir).toBe('/diokuz/dir/example.com-foo-bar')
  expect(names.absFileName).toBe('/diokuz/dir/example.com-foo-bar/get-ffef258e')
})

it('Generates different filenames for different query params', () => {
  const names1 = getNames(
    'http://example.com/foo/bar/?foo=bar',
    'GET',
    '',
    '/diokuz/dir',
  )
  const names2 = getNames(
    'http://example.com/foo/bar/?baz=1',
    'GET',
    '',
    '/diokuz/dir',
  )

  expect(names1.absFileName).toBe('/diokuz/dir/example.com-foo-bar/get-638e525e')
  expect(names1.absFileName).not.toBe(names2.absFileName)
})

it('Generates same filenames for different skipped query params', () => {
  const names1 = getNames(
    'http://example.com/foo/bar/?foo=bar&x=y',
    'GET',
    '',
    '/diokuz/dir',
    [],
    ['random']
  )
  const names2 = getNames(
    'http://example.com/foo/bar/?foo=bar&x=y&random=123',
    'GET',
    '',
    '/diokuz/dir',
    [],
    ['random']
  )

  expect(names1.absFileName).toBe('/diokuz/dir/example.com-foo-bar/get-af45db4d')
  expect(names1.absFileName).toBe(names2.absFileName)
})

it('Generates same filenames for different order of query params', () => {
  const names1 = getNames(
    'http://example.com/foo/bar/?foo=bar&x=y',
    'GET',
    '',
    '/diokuz/dir',
    [],
    ['random']
  )
  const names2 = getNames(
    'http://example.com/foo/bar/?x=y&foo=bar',
    'GET',
    '',
    '/diokuz/dir'
  )

  expect(names1.absFileName).toBe('/diokuz/dir/example.com-foo-bar/get-af45db4d')
  expect(names1.absFileName).toBe(names2.absFileName)
})

it('Generates different filenames for different post bodies', () => {
  const names1 = getNames('http://example.com', 'POST', 'post_body_1', '/diokuz/dir')
  const names2 = getNames('http://example.com', 'POST', 'post_body_2', '/diokuz/dir')

  expect(names1.absFileName).toBe('/diokuz/dir/example.com/post-28450036')
  expect(names1.absFileName).not.toBe(names2.absFileName)
})

it('Generates same filenames for different skipped post bodies', () => {
  const spp = ['randomId', 'timestamp']
  const b1 = JSON.stringify({ id: 1, randomId: 2, timestamp: 123 })
  const b2 = JSON.stringify({ id: 1, randomId: 3, timestamp: 321 })
  const names1 = getNames('http://example.com', 'POST', b1, '/diokuz/dir', [], [], spp)
  const names2 = getNames('http://example.com', 'POST', b2, '/diokuz/dir', [], [], spp)

  expect(names1.absFileName).toBe('/diokuz/dir/example.com/post-5b9e6a38')
  expect(names1.absFileName).toBe(names2.absFileName)
})
