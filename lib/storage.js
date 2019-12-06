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

          signale.info(`Writing mock for url "${url}"`)
          signale.info(`to file "${fn}"`)

          fs.writeFile(fn, body, (err) => {
            if (err) {
              signale.error(`Failed to write new file ${fn}`)

              reject(err)
            }

            signale.success(`Successfully wrote new file ${fn}`)

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

exports.__getNames = getNames
exports.name = (...args) => getNames(...args).absFileName
