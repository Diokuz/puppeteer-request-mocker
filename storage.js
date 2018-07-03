const fs =  require('fs')
const path =  require('path')
const { URL } =  require('url')
const crypto =  require('crypto')
const makeDir = require('make-dir')

const mfn = (url, method = 'GET', postDataArg = '', skipQueryParams = [], skipPostParams = []) => {
  const urlObj = new URL(url)
  let postData = postDataArg
  let postObj

  urlObj.searchParams.sort()

  try {
    postObj = JSON.parse(postData)
  } catch (e) {
    // pass
  }

  if (postObj) {
    skipPostParams.forEach((param) => delete postObj[param])
    postData = JSON.stringify(postObj)
  }

  // Some parameters could vary over the time, so we can exclude them from naming
  // (be carefull, use it only if it does not affect actual response body)
  skipQueryParams.forEach((param) => urlObj.searchParams.delete(param))

  const hash = crypto
    .createHash('md5')
    .update(method + urlObj.toString() + postData)
    .digest('hex').substr(0, 8)

  return `${method.toLowerCase()}-${hash}`
}

const getNames = (url, method, postData = '', workDir, skipQueryParams = [], skipPostParams = []) => {
  const { hostname, pathname, protocol } = new URL(url)
  const dirName = pathname.replace(/\//g, '-').replace(/^-|-$/g, '')
  const targetDir = path.join(workDir, `${hostname}${dirName ? '-' + dirName : ''}`)
  const fileName = mfn(url, method, postData, skipQueryParams, skipPostParams)
  const absFileName = path.join(targetDir, fileName)

  return {
    targetDir,
    absFileName,
  }
}

exports.write = ({ url, method, postData, body, workDir, skipQueryParams, skipPostParams, force, ci }) => {
  const names = getNames(url, method, postData, workDir, skipQueryParams, skipPostParams)

  return makeDir(names.targetDir).then(() => {
    return new Promise((resolve, reject) => {
      fs.stat(names.absFileName, (err, stats) => {
        if (err && err.code === 'ENOENT' || force) {
          if (ci) {
            reject(Error(`Mock cannot be saved in CI mode. Url "${url}" wasnt mocked!`))
          }

          fs.writeFile(names.absFileName, body, (err) => {
            if (err) {
              reject(err)
            }

            resolve()
          })
        }

        // reject(new Error(`File "${names.absFileName}" already exists!`))
        resolve()
      })
    })
  })
}

exports.read = ({ url, method, postData, workDir, skipQueryParams, skipPostParams }) => {
  const names = getNames(url, method, postData, workDir, skipQueryParams, skipPostParams)

  return new Promise((resolve, reject) => {
    try {
      fs.readFile(names.absFileName, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        }

        resolve({ names, err })
      })
    } catch (err) {
      reject({ names, err })
    }
  })
}

exports.__mfn = mfn
exports.__getNames = getNames
