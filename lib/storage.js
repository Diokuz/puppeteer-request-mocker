const fs =  require('fs');
const path =  require('path');
const debug = require('debug');
const loggerRead = debug('prm:storage:read');
const loggerNames = debug('prm:storage:names');

const getNames = (params) => { 
  const { workDir, mockPath } = params;
  loggerNames(`mockFilePath=${mockPath}, wordDir=${workDir}`);
  const absPath = path.join(workDir, mockPath);

  return absPath;
};

exports.read = (fn) => {
  loggerRead(`About to read file ${fn}`);

  return new Promise((resolve, reject) => {
    try {
      fs.readFile(fn, 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            loggerRead(`File does not exist ${fn}`);
          } else {
            loggerRead(`Fail to read the file ${fn}`, err);
          }

          reject({ fn, err });
        } else {
          loggerRead(`Successfully read the file ${fn}`);

          resolve(data);
        }
      })
    } catch (err) {
      loggerRead(`Unexpected failure of file reading ${fn}`, err);
      reject({ fn, err });
    }
  })
};

exports.__getNames = getNames;
exports.name = getNames;
