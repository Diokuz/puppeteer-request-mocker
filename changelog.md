# 5.0.0

### Json format for mocks and response.body

All mocks are stored in json files, by defaut. Old mock files also supported for backward compatibility, but any new mock files will be written as json.

Also, if response.body is json, it stores as json, not as a string.

Data, stored in json files:

request:

1. url
2. headers (new!)
3. body (if any)

response:

1. status (new!)
2. headers (new!)
3. body (in json, if json, or as string otherwise)

So, now you could change not only the body of a request, but also its headers and its status. Plus you could check the request headers.

Note 1: 'request' field could be used only for debugging purposes. It is not used by mocker when running tests.

Note 2: `response.headers` from mock has higher priority than `options.response.headers`.

### Add `options.skipResponseHeaders`

Response headers, listed in `skipResponseHeaders`, are not saved in mock files. Defaule value is: `['date', 'x-powered-by', 'etag', 'content-length']`.

### Remove default value for `options.request`

Since response headers now in mock files explicitly, there is no need to enrich these headers with custom values (but you still could do this, of course).

Note: that is only for json format mocks. For old (text) format files it was not removed.

# 4.0.0

### breaking: deprecated mocker.run() is removed

Use `mocker.start()` instead.

### mocker.set() method

You could change any option after mocker.start(). Very usefull when you want to change something in the middle of a test.

### mocker.unset(optionKey) and mocker.reset()

For restoring changed options.

### options.response

Now you could change `headers`, `body` and `status` for all mocked requests!

Note:

1. You could change any of these options, e.g. `mocker.set('response', { status: 429, headers: { 'X-Custom': 'qwe' } })`. In that case status and headers will be changed, but not the body.
2. While response is forming with spread, body and headers are not. So, you could not `add` some headers for initial set headers. For example, `mocker.start({ headers: { foo: 'f' } })` + `mocker.set('response', { headers: { bar: 'b' } })` will give you resulting headers `{ bar: 'b' }` (plus default browser headers, of course).
3. When you are changing `response`, you are doing this for ANY mocked request. Be carefull.
4. When you are generating mocks, custom `response` will not work. So, generate your mocks first.

### deprecation

options.requestHeaders is deprecated in flavour of options.reques.headers.

## 3.3.0

- Add `extra` params for request and response handlers. The only extra param is `workDir`.

## 3.2.0

- Fix passList: dont block any navigation request
- pageUrl now could be a function

## 3.0.0

- add passList option
- breaking: blocks any cross origin and all non-GET same origin requests by default

## 2.1.0

- mocker.connections() marked as depreceated

## 2.0.0

- Change `mockMiss` default value to `500`
- add options.awaitConnectionsOnStop, no timeouted _Failed to stop mocker_ error by default

## 1.4.0

- Add nested postParams for skip
- Clear reqSet on close instead of on load

## 1.0.3
- Add mockMiss option

## 1.0.2
- Add rejection when in non-ci mode connections are not finished before next onload
- Replace logger with console.error in most critical cases

## 1.0.1
- Fix "failed to stop mocker" error

## 0.10.0

- Rework mocker.connections() to support mocked connections

## 0.9.5

- Add is-ci package for default `ci` value
- mockList now can be passed as a string, delimited with `,`
