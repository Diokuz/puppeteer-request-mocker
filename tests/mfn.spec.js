const mfn = require('../lib/storage').__mfn

it('Generates same names for same request', () => {
  const name1 = mfn({ url: 'http://example.com' })
  const name2 = mfn({ url: 'http://example.com' })

  expect(name1).toBe('get-d3c8eae0')
  expect(name2).toBe(name1)
})

it('skipQueryParams does not affects output name', () => {
  const skipQueryParams = ['foo']
  const name1 = mfn({ url: 'http://example.com?foo=bar&x=y', skipQueryParams })
  const name2 = mfn({ url: 'http://example.com?x=y&foo=bazzzzz', skipQueryParams })

  expect(name1).toBe(name2)
})

it('queryParams does not affect output name', () => {
  const queryParams = ['foo']
  const name1 = mfn({ url: 'http://example.com?foo=bar&y=x', queryParams })
  const name2 = mfn({ url: 'http://example.com?foo=bar', queryParams })

  expect(name1).toBe(name2)
})

it('unnecessary params bigger than 1 does not affect output name', () => {
  const queryParams = ['foo']
  const name1 = mfn({ url: 'http://example.com?foo=bar&x=y&y=x', queryParams })
  const name2 = mfn({ url: 'http://example.com?foo=bar', queryParams })

  expect(name1).toBe(name2)
})

it('queryParams > 1 does not affect output name', () => {
  const queryParams = ['foo', 'trois']
  const name1 = mfn({ url: 'http://example.com?foo=bar&trois=quatre&x=y', queryParams })
  const name2 = mfn({ url: 'http://example.com?trois=quatre&foo=bar', queryParams })

  expect(name1).toBe(name2)
})

it('skip params from queryParams does not affect output name', () => {
  const queryParams = ['foo', 'trois']
  const skipQueryParams = ['foo']
  const name1 = mfn({ url: 'http://example.com?foo=bar&trois=quatre&x=y', queryParams, skipQueryParams })
  const name2 = mfn({ url: 'http://example.com?trois=quatre&foo=bar', queryParams, skipQueryParams })

  expect(name1).toBe(name2)
})

it('Skipped post body params for request with content-type="application/json" does not affects output name', () => {
  const method = 'POST'
  const skipPostParams = ['foo']
  const headers = {"content-type": "application/json"}
  const name1 = mfn({ 
    url: 'http://example.com', 
    method, 
    headers, 
    postData: JSON.stringify({ foo: 'bar', x: 2 }), 
    skipPostParams
  })
  const name2 = mfn({
    url: 'http://example.com', 
    method, 
    headers, 
    postData: JSON.stringify({ foo: 'bazzzz', x: 2 }), 
    skipPostParams
  })

  expect(name1).toBe(name2)
})

it('Skipped post body params for request with content-type="application/x-www-form-urlencoded" does not affects output name', () => {
  const skipPostParams = ['foo']
  const headers = {"content-type": "application/x-www-form-urlencoded"}

  const name1 = mfn({
    url: 'http://example.com', 
    method: 'POST', 
    headers, 
    postData: "foo=bar&x=2", 
    skipPostParams
  })
  const name2 = mfn({
    url: 'http://example.com', 
    method: 'POST', 
    headers, 
    postData: "foo=bazzzz&x=2", 
    skipPostParams
  })

  expect(name1).toBe(name2)
})

it('Skipped post body params for request without content-type affects output name', () => {
  const method = 'POST'
  const skipPostParams = ['foo']
  const headers = {}
  const name1 = mfn({
    url: 'http://example.com', 
    method, 
    headers, 
    postData: "foo=bar&x=2",
    skipPostParams
  })
  const name2 = mfn({
    url: 'http://example.com', 
    method, 
    headers,
    postData: "foo=bazzzz&x=2", 
    skipPostParams
  })

  expect(name1).toBe(name2)
})

it('Skipped post body params for request with not supported content-type affects output name', () => {
  const method = 'POST'
  const skipPostParams = ['foo']
  const headers =  {"content-type": "multipart/form-data"}
  const name1 = mfn({
    url: 'http://example.com', 
    method, 
    headers, 
    postData: "foo=bar&x=2",
    skipPostParams
  })
  const name2 = mfn({
    url: 'http://example.com', 
    method, 
    headers, 
    postData: "foo=bazzzz&x=2", 
    skipPostParams
  })

  expect(name1).toBe(name2)
})

it('Non-json post body does not throws an error', () => {
  mfn({ url: 'http://example.com', postData: 'post_body' })
})
