const getNames = require('../lib/storage').__getNames

// url, method, postData = '', workDir, skipQueryParams = [], skipPostParams = []

it('Generates filename for domain without slash', () => {
  const names = getNames(
    'http://example.com',
    'GET',
    null,
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
    null,
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
    null,
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
    null,
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
    null,
    '',
    '/diokuz/dir',
  )
  const names2 = getNames(
    'http://example.com/foo/bar/?baz=1',
    'GET',
    null,
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
    null,
    '',
    '/diokuz/dir',
    [],
    ['random']
  )
  const names2 = getNames(
    'http://example.com/foo/bar/?foo=bar&x=y&random=123',
    'GET',
    null,
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
    null,
    '',
    '/diokuz/dir',
    [],
    ['random']
  )
  const names2 = getNames(
    'http://example.com/foo/bar/?x=y&foo=bar',
    'GET',
    null,
    '',
    '/diokuz/dir'
  )

  expect(names1.absFileName).toBe('/diokuz/dir/example.com-foo-bar/get-af45db4d')
  expect(names1.absFileName).toBe(names2.absFileName)
})

it('Generates different filenames for different post bodies without content-type', () => {
  const names1 = getNames('http://example.com', 'POST',  null, 'post_body_1', '/diokuz/dir')
  const names2 = getNames('http://example.com', 'POST',  null, 'post_body_2', '/diokuz/dir')

  expect(names1.absFileName).toBe('/diokuz/dir/example.com/post-28450036')
  expect(names1.absFileName).not.toBe(names2.absFileName)
})

it('Generates different filenames for different FromData post bodies', () => {
  const headers = {"content-type": "application/x-www-form-urlencoded"}

  const names1 = getNames('http://example.com', 'POST',  headers, "foo=bar&x=2", '/diokuz/dir')
  const names2 = getNames('http://example.com', 'POST',  headers, "foo=bazzzz&x=2", '/diokuz/dir')

  expect(names1.absFileName).toBe('/diokuz/dir/example.com/post-2e223b54')
  expect(names1.absFileName).not.toBe(names2.absFileName)
})

it('Generates different filenames for different JSON post bodies', () => {
  const b1 = JSON.stringify({ id: 1, randomId: 2, timestamp: 123 })
  const b2 = JSON.stringify({ id: 1, randomId: 3, timestamp: 321 })
  const names1 = getNames('http://example.com', 'POST',  null, b1, '/diokuz/dir')
  const names2 = getNames('http://example.com', 'POST',  null, b2, '/diokuz/dir')

  expect(names1.absFileName).toBe('/diokuz/dir/example.com/post-2edaa4dd')
  expect(names1.absFileName).not.toBe(names2.absFileName)
})

it('Generates same filenames for different skipped FormData post bodies', () => {
  const spp = ['foo']

  const headers = {"content-type": "application/x-www-form-urlencoded"}
  const names1 = getNames('http://example.com', 'POST', headers, "foo=bar&x=2", '/diokuz/dir', [], [], spp)
  const names2 = getNames('http://example.com', 'POST', headers, "foo=bazzzz&x=2", '/diokuz/dir', [], [], spp)

  expect(names1.absFileName).toBe('/diokuz/dir/example.com/post-faa5fbbe')
  expect(names1.absFileName).toBe(names2.absFileName)
})

it('Generates same filenames for different skipped JSON post bodies', () => {
  const spp = ['randomId', 'timestamp']
  const b1 = JSON.stringify({ id: 1, randomId: 2, timestamp: 123 })
  const b2 = JSON.stringify({ id: 1, randomId: 3, timestamp: 321 })
  const headers = {"content-type": "application/json"}
  const names1 = getNames('http://example.com', 'POST', headers, b1, '/diokuz/dir', [], [], spp)
  const names2 = getNames('http://example.com', 'POST', headers, b2, '/diokuz/dir', [], [], spp)

  expect(names1.absFileName).toBe('/diokuz/dir/example.com/post-5b9e6a38')
  expect(names1.absFileName).toBe(names2.absFileName)
})
