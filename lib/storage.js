const fs =  require('fs')
const path =  require('path')
const { URL } =  require('url')
const crypto =  require('crypto')
const makeDir = require('make-dir')
const debug = require('debug')
const { fy, boxlog } = require('./logger')

const loggerRead = debug('prm:storage:read')
const loggerWrite = debug('prm:storage:write')

const mfn = (url, method = 'GET', postDataArg = '', skipQueryParams = [], skipPostParams = [], verbose) => {
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

const getNames = (url, method, postData = '', workDir, skipQueryParams = [], skipPostParams = [], verbose) => {
  const { hostname, pathname, protocol } = new URL(url)

  if (verbose) {
    console.log('getNames: hostname, pathname, protocol', hostname, pathname, protocol)
  }

  const dirName = pathname.replace(/\//g, '-').replace(/^-|-$/g, '')

  if (verbose) {
    console.log('getNames: dirName', dirName)
  }

  const targetDir = path.join(workDir, `${hostname}${dirName ? '-' + dirName : ''}`)

  if (verbose) {
    console.log('getNames: targetDir', targetDir)
  }

  const fileName = mfn(url, method, postData, skipQueryParams, skipPostParams, verbose)

  if (verbose) {
    console.log('getNames: fileName', fileName)
  }

  const absFileName = path.join(targetDir, fileName)

  return {
    targetDir,
    absFileName,
  }
}

exports.write = ({ url, method, postData, body, workDir, skipQueryParams, skipPostParams, force, ci, verbose }) => {
  const names = getNames(url, method, postData, workDir, skipQueryParams, skipPostParams, verbose)

  if (verbose) {
    boxlog
  }

  loggerWrite(`Trying to write file ${names.absFileName}`)

  return makeDir(names.targetDir).then(() => {
    loggerWrite(`Successfully created targetDir ${names.targetDir}`)

    return new Promise((resolve, reject) => {
      fs.stat(names.absFileName, (err, stats) => {
        if (err && err.code === 'ENOENT' || force) {
          loggerWrite(`File does not exists ${names.absFileName}`)

          if (ci) {
            reject(Error(`Mock cannot be saved in CI mode. Url "${url}" wasnt mocked!`))
          }

          loggerWrite(`About to write new file ${names.absFileName}`)

          fs.writeFile(names.absFileName, body, (err) => {
            if (verbose) {
              console.log(`Writed file "${names.absFileName}" with err:\n${fy(err)}`)
            }

            if (err) {
              loggerWrite(`Failed to write new file ${names.absFileName}`)

              reject(err)
            }

            loggerWrite(`Successfully wrote new file ${names.absFileName}`)

            resolve({ names, new: true })
          })
        } else if (err) {
          loggerWrite(`Failed to read ${names.absFileName}`, err)
        }

        loggerWrite(`File already exists, do nothing ${names.absFileName}`)

        // reject(new Error(`File "${names.absFileName}" already exists!`))
        resolve({ names, new: false })
      })
    })
  })
}

exports.read = ({ url, method, postData, workDir, skipQueryParams, skipPostParams, verbose }) => {
  const namesParams = { url, method, postData, workDir, skipQueryParams, skipPostParams }

  loggerRead(`About to read file for url ${url}`)

  const names = getNames(url, method, postData, workDir, skipQueryParams, skipPostParams, verbose)

  loggerRead(`Filename is ${names.absFileName}`)

  return new Promise((resolve, reject) => {
    try {
      fs.readFile(names.absFileName, 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            loggerRead(`File does not exist ${names.absFileName}`)
          } else {
            loggerRead(`Fail to red the file ${names.absFileName}`, err)
          }

          reject({ names, err })
        } else {
          loggerRead(`Successfully red the file ${names.absFileName}`)

          resolve(data)
        }
      })
    } catch (err) {
      loggerRead(`Unexpected failure of file reading ${names.absFileName}`, err)

      reject({ names, err })
    }
  })
}

exports.__mfn = mfn
exports.__getNames = getNames
