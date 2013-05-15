module.exports = function createParser(onHeaders) {
  var parser = new Parser();

  if (onHeaders) {
    parser.on("headers", onHeaders);
  }

  return parser;
};

var Parser = module.exports.Parser = require("./lib/parser");
