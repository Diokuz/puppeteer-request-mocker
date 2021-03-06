const fs = require('fs')
const path = require('path')
const { URL } = require('url')
const makeDir = require('make-dir')
const debug = require('debug')
const signale = require('signale')
const getRequestId = require('./getRequestId')

const loggerRead = debug('prm:storage:read')
const loggerWrite = debug('prm:storage:write')

const loggerNames = debug('prm:storage:names')

const getNames = (params) => {
  const { hostname, pathname, protocol } = new URL(params.url)

  loggerNames(`Url parts are hostname=${hostname}, pathname=${pathname}, protocol=${protocol}`)

  const dirName = pathname.replace(/\//g, '-').replace(/^-|-$/g, '')

  loggerNames(`dirName=${dirName} workDir=${params.workDir}`)

  const targetDir = path.join(params.workDir, `${hostname}${dirName ? '-' + dirName : ''}`)

  loggerNames(`targetDir=${targetDir}`)

  const fileName = getRequestId(params)

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

  const jsonFn = fn + '.json'
  const targetDir = path.dirname(fn)

  return makeDir(targetDir).then(() => {
    loggerWrite(`Successfully checked/created targetDir ${targetDir}`)

    return new Promise((resolve, reject) => {
      let fileExists = fs.existsSync(jsonFn)

      if (!fileExists) {
        fileExists = fs.existsSync(fn)
      }

      if (!fileExists) {
        loggerWrite(`File does not exists ${fn}`)

        if (ci) {
          loggerWrite(`Url "${url}" wasnt mocked! Rejecting and exiting storage.write.`)
          reject(Error(`Mock cannot be saved in CI mode.`))

          return
        }

        signale.info(`Writing mock for url "${url}"`)
        signale.info(`to file "${jsonFn}"`)

        fs.writeFile(jsonFn, body, (err) => {
          if (err) {
            signale.error(`Failed to write new file ${jsonFn}`)

            reject(err)
          }

          signale.success(`Successfully wrote new file ${jsonFn}`)

          resolve({ fn, new: true })
        })
      } else {
        loggerWrite(`File already exists, do nothing ${fn}`)

        resolve({ fn, new: false })
      }
    })
  })
}

exports.read = (fn) => {
  loggerRead(`About to read file ${fn}(.json)`)
  const jsonFn = fn + '.json'
  let fileToRead = jsonFn

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(jsonFn)) {
      loggerRead(`json version of the mock does not exists, trying to read ${fn}`)
      fileToRead = fn
    }

    try {
      fs.readFile(fileToRead, 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            loggerRead(`File does not exist ${fileToRead}`)
          } else {
            loggerRead(`Fail to read the file ${fileToRead}`, err)
          }

          reject({ fn, err })
        } else {
          loggerRead(`Successfully read the file ${fileToRead}`)

          resolve(data)
        }
      })
    } catch (err) {
      loggerRead(`Unexpected failure of file reading ${fileToRead}`, err)

      reject({ fn, err })
    }
  })
}

exports.__getNames = getNames
exports.name = (...args) => getNames(...args).absFileName
