const fs =  require('fs')
const path =  require('path')
const { URL } =  require('url')
const crypto =  require('crypto')
const makeDir = require('make-dir')
const debug = require('debug')
const { fy, boxlog } = require('./logger')

const loggerRead = debug('prm:storage:read')
const loggerWrite = debug('prm:storage:write')

const loggerNames = debug('prm:storage:names')

const mfn = (url, method = 'GET', postDataArg = '', skipQueryParams = [],  skipAllQueryParamsExcept = [], skipPostParams = [], verbose) => {
  const urlObj = new URL(url)
  let postData = postDataArg
  let postObj

  urlObj.searchParams.sort()

  try {
    postObj = JSON.parse(postData)
  } catch (e) {
    // pass
  }

  if (verbose) {
    console.log('mfn: postObj', postObj)
  }

  if (postObj) {
    skipPostParams.forEach((param) => delete postObj[param])
    postData = JSON.stringify(postObj)
  }
 
  // Some parameters could vary over the time, so we can exclude them from naming
  // (be carefull, use it only if it does not affect actual response body)
  skipQueryParams.forEach((param) => urlObj.searchParams.delete(param))
  
  if (skipAllQueryParamsExcept.length > 0){
    let keys = []
    for (let key of urlObj.searchParams.keys()) {
      if (!(skipAllQueryParamsExcept.includes(key)))
        keys.push(key)
    }
    keys.forEach(key => urlObj.searchParams.delete(key))
  }
 

  let baseStr = method + urlObj.toString() + postData

  if (verbose) {
    console.log('mfn: baseStr, baseStr.length', baseStr, baseStr.length)
  }


  const hash = crypto
    .createHash('md5')
    .update(baseStr)
    .digest('hex').substr(0, 8)

  return `${method.toLowerCase()}-${hash}`
}

const getNames = (url, method, postData = '', workDir, skipQueryParams = [], skipAllQueryParamsExcept = [], skipPostParams = [], verbose) => {
  const { hostname, pathname, protocol } = new URL(url)

  loggerNames(`Url parts are hostname=${hostname}, pathname=${pathname}, protocol=${protocol}`)

  const dirName = pathname.replace(/\//g, '-').replace(/^-|-$/g, '')

  loggerNames(`dirName=${dirName} workDir=${workDir}`)

  const targetDir = path.join(workDir, `${hostname}${dirName ? '-' + dirName : ''}`)

  loggerNames(`targetDir=${targetDir}`)

  const fileName = mfn(url, method, postData, skipQueryParams, skipAllQueryParamsExcept, skipPostParams, verbose)

  loggerNames(`fileName=${fileName}`)

  const absFileName = path.join(targetDir, fileName)

  loggerNames(`absFileName=${absFileName}`)

  return {
    targetDir,
    absFileName,
  }
}

exports.write = ({ fn, body, url, ci }) => {
  loggerWrite(`Trying to write file ${fn}`)

  const targetDir = path.dirname(fn)

  return makeDir(targetDir).then(() => {
    loggerWrite(`Successfully created targetDir ${targetDir}`)

    return new Promise((resolve, reject) => {
      fs.stat(fn, (err, stats) => {
        if (err && err.code === 'ENOENT') {
          loggerWrite(`File does not exists ${fn}`)

          if (ci) {
            loggerWrite(`Url "${url}" wasnt mocked!`)
            reject(Error(`Mock cannot be saved in CI mode.`))
          }

          loggerWrite(`About to write new file ${fn}`)

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
            loggerRead(`Fail to red the file ${fn}`, err)
          }

          reject({ fn, err })
        } else {
          loggerRead(`Successfully red the file ${fn}`)

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
