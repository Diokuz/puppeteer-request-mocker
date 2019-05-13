const boxen = require('boxen');
const yamlifyObject = require('yamlify-object');
const yamlifyColors = require('yamlify-object-colors');

const fy = (obj) => yamlifyObject(obj, { colors: yamlifyColors });
const boxlog = (msg, logger) => (logger || console.log)(boxen(msg, { padding: 1, margin: 1, borderColor: 'green', }));

module.exports.fy = fy;
module.exports.boxlog = boxlog;
