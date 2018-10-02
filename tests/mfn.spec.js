const mfn = require('../lib/storage').__mfn

it('Generates same names for same request', () => {
  const name1 = mfn('http://example.com')
  const name2 = mfn('http://example.com')

  expect(name1).toBe('get-d3c8eae0')
  expect(name2).toBe(name1)
})

it('skipQueryParams does not affects output name', () => {
  const m = 'GET'
  const p = ''
  const skipQueryParams = ['foo']
  const name1 = mfn('http://example.com?foo=bar&x=y', m, p, [], skipQueryParams)
  const name2 = mfn('http://example.com?x=y&foo=bazzzzz', m, p, [], skipQueryParams)

  expect(name1).toBe(name2)
})

it('queryParams does not affect output name', () => {
  const m = 'GET'
  const p = ''
  const queryParams = ['foo']
  const name1 = mfn('http://example.com?foo=bar&y=x', m, p, queryParams)
  console.log('second')
  const name2 = mfn('http://example.com?foo=bar', m, p, queryParams)
  expect(name1).toBe(name2)
})

it('unnecessary params bigger than 1 does not affect output name', () => {
  const m = 'GET'
  const p = ''
  const queryParams = ['foo']
  const name1 = mfn('http://example.com?foo=bar&x=y&y=x', m, p, queryParams)
  const name2 = mfn('http://example.com?foo=bar', m, p, queryParams)
  expect(name1).toBe(name2)
})

it('queryParams > 1 does not affect output name', () => {
  const m = 'GET'
  const p = ''
  const queryParams = ['foo', 'trois']
  const name1 = mfn('http://example.com?foo=bar&trois=quatre&x=y', m, p, queryParams)
  const name2 = mfn('http://example.com?trois=quatre&foo=bar', m, p, queryParams)
  expect(name1).toBe(name2)
})

it('skip params from queryParams does not affect output name', () => {
  const m = 'GET'
  const p = ''
  const queryParams = ['foo', 'trois']
  const skipQueryParams = ['foo']
  const name1 = mfn('http://example.com?foo=bar&trois=quatre&x=y', m, p, queryParams, skipQueryParams)
  const name2 = mfn('http://example.com?trois=quatre&foo=bar', m, p, queryParams, skipQueryParams)
  expect(name1).toBe(name2)
})

it('Skipped post body params does not affects output name', () => {
  const m = 'POST'
  const postBody1 = JSON.stringify({ foo: 'bar', x: 2 })
  const postBody2 = JSON.stringify({ foo: 'bazzzz', x: 2 })
  const skipPostParams = ['foo']
  const name1 = mfn('http://example.com', m, postBody1, [], [], skipPostParams)
  const name2 = mfn('http://example.com', m, postBody2, [], [], skipPostParams)

  expect(name1).toBe(name2)
})

it('Non-json post body does not throws an error', () => {
  mfn('http://example.com', 'GET', 'post_body')
})
