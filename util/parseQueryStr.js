const json5 = require('json5');

function parseQueryStr(queryStr) {
  try {
    return json5.parse(queryStr);
  } catch (err) {
    return queryStr;
  }
}

module.exports = parseQueryStr;
