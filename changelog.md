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
