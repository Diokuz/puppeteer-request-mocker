const fs =  require('fs')
const path =  require('path')
const { URL } =  require('url')
const crypto =  require('crypto')
const makeDir = require('make-dir')
const { fy, boxlog } = require('./logger')

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
    boxlog(`Trying to write with names:\n${fy(names)}`)
  }

  return makeDir(names.targetDir).then(() => {
    if (verbose) {
      console.log(`Directory "${names.targetDir}" created or exists`)
    }

    return new Promise((resolve, reject) => {
      fs.stat(names.absFileName, (err, stats) => {
        if (verbose) {
          console.log(`File "${names.absFileName}" err:\n${fy(err)}\nstats:${fy(stats)}`)
        }

        if (err && err.code === 'ENOENT' || force) {
          if (ci) {
            reject(Error(`Mock cannot be saved in CI mode. Url "${url}" wasnt mocked!`))
          }

          fs.writeFile(names.absFileName, body, (err) => {
            if (verbose) {
              console.log(`Writed file "${names.absFileName}" with err:\n${fy(err)}`)
            }

            if (err) {
              reject(err)
            }

            resolve({ names })
          })
        }

        // reject(new Error(`File "${names.absFileName}" already exists!`))
        resolve({ names })
      })
    })
  })
}

exports.read = ({ url, method, postData, workDir, skipQueryParams, skipPostParams, verbose }) => {
  const namesParams = { url, method, postData, workDir, skipQueryParams, skipPostParams }

  if (verbose) {
    console.log(`Generating names with args:\n${fy(namesParams)}`)
  }

  const names = getNames(url, method, postData, workDir, skipQueryParams, skipPostParams, verbose)

  if (verbose) {
    boxlog(`Generated names are:\n${fy(names)}`)
  }

  return new Promise((resolve, reject) => {
    try {
      fs.readFile(names.absFileName, 'utf8', (err, data) => {
        if (verbose) {
          console.log(`fs.readFile callback:\n${fy(err)}\n${fy(data)}`)
        }

        if (err) {
          reject({ names, err })
        }

        resolve(data)
      })
    } catch (err) {
      reject({ names, err })
    }
  })
}

exports.__mfn = mfn
exports.__getNames = getNames
