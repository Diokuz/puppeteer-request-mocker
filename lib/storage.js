const fs =  require('fs')
const path =  require('path')
const { URL } =  require('url')
const crypto =  require('crypto')
const makeDir = require('make-dir')
const debug = require('debug')
const queryString = require('query-string')
const loggerRead = debug('prm:storage:read')
const loggerWrite = debug('prm:storage:write')

const loggerNames = debug('prm:storage:names')

/**
 *
 * @param {Object} params
 */
const mfn = (params) => {
  let url = params.url
  let method = params.method || 'GET'
  let headers = params.headers
  let postData = params.postData || ''
  let queryParams = params.queryParams || []
  let skipPostParams = params.skipPostParams || []
  let skipQueryParams = params.skipQueryParams || []

  const urlObj = new URL(url)
  let postObj

  urlObj.searchParams.sort()

  if (postData !== '' && headers)
  {
    switch (headers["content-type"]) {
      case "application/json":
        postObj = JSON.parse(postData);
        break
      default:
        postObj = queryString.parse(postData);
        break;
    }
  }

  if (params.verbose) {
    console.log('mfn: postObj', postObj)
  }

  if (postObj) {
    skipPostParams.forEach((param) => {
      let currentObj = postObj
      let paramForDelete = param

      if (Array.isArray(paramForDelete)) {
        const path = [...param]

        while (path.length > 1) {
          currentObj = currentObj[path.shift()]

          if (!currentObj) {
            return
          }
        }

        paramForDelete = path.shift()
      }

      delete currentObj[paramForDelete]
    })

    postData = JSON.stringify(postObj)
  }

  if (queryParams.length > 0){
    let keys=[...urlObj.searchParams.keys()]
    for (let key of keys) {
      if (!(queryParams.includes(key))) {
        urlObj.searchParams.delete(key)
      }
    }
  }

  // Some parameters could vary over the time, so we can exclude them from naming
  // (be carefull, use it only if it does not affect actual response body)
  skipQueryParams.forEach((param) => urlObj.searchParams.delete(param))
  let baseStr = method + urlObj.toString() + postData

  if (params.verbose) {
    console.log('mfn: baseStr, baseStr.length', baseStr, baseStr.length)
  }


  const hash = crypto
    .createHash('md5')
    .update(baseStr)
    .digest('hex').substr(0, 8)

  return `${method.toLowerCase()}-${hash}`
}

const getNames = (params) => {
  const { hostname, pathname, protocol } = new URL(params.url)

  loggerNames(`Url parts are hostname=${hostname}, pathname=${pathname}, protocol=${protocol}`)

  const dirName = pathname.replace(/\//g, '-').replace(/^-|-$/g, '')

  loggerNames(`dirName=${dirName} workDir=${params.workDir}`)

  const targetDir = path.join(params.workDir, `${hostname}${dirName ? '-' + dirName : ''}`)

  loggerNames(`targetDir=${targetDir}`)

  const fileName = mfn(params)

  loggerNames(`fileName=${fileName}`)

  const absFileName = path.join(targetDir, fileName)

  loggerNames(`absFileName=${absFileName}`)

  return {
    targetDir,
    absFileName,
  }
}

exports.write = ({ fn, body, url, ci }) => {
  loggerWrite(`Entering storage.write with fn === ${fn}`)

  const targetDir = path.dirname(fn)

  return makeDir(targetDir).then(() => {
    loggerWrite(`Successfully checked/created targetDir ${targetDir}`)

    return new Promise((resolve, reject) => {
      fs.stat(fn, (err, stats) => {
        if (err && err.code === 'ENOENT') {
          loggerWrite(`File does not exists ${fn}`)

          if (ci) {
            loggerWrite(`Url "${url}" wasnt mocked! Rejecting and exiting storage.write.`)
            reject(Error(`Mock cannot be saved in CI mode.`))

            return
          }

          loggerWrite(`About to call fs.writeFile for ${fn}`)

          fs.writeFile(fn, body, (err) => {
            if (err) {
              loggerWrite(`Failed to write new file ${fn}`)

              reject(err)
            }

            loggerWrite(`Successfully wrote new file ${fn}`)

            resolve({ fn, new: true })
          })
        } else if (err) {
          loggerWrite(`Failed to read ${fn}`, err)
        }

        loggerWrite(`File already exists, do nothing ${fn}`)

        // reject(new Error(`File "${fn.absFileName}" already exists!`))
        resolve({ fn, new: false })
      })
    })
  })
}

exports.read = (fn) => {
  loggerRead(`About to read file ${fn}`)

  return new Promise((resolve, reject) => {
    try {
      fs.readFile(fn, 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            loggerRead(`File does not exist ${fn}`)
          } else {
            loggerRead(`Fail to read the file ${fn}`, err)
          }

          reject({ fn, err })
        } else {
          loggerRead(`Successfully read the file ${fn}`)

          resolve(data)
        }
      })
    } catch (err) {
      loggerRead(`Unexpected failure of file reading ${fn}`, err)

      reject({ fn, err })
    }
  })
}

exports.__mfn = mfn
exports.__getNames = getNames
exports.name = (...args) => getNames(...args).absFileName
