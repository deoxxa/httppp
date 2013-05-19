module.exports = function createParser(options, onHeaders) {
  if (typeof options === "function") {
    onHeaders = options;
    options = {};
  }

  var parser = new Parser(options);

  if (onHeaders) {
    parser.on("headers", onHeaders);
  }

  return parser;
};

var Parser = module.exports.Parser = require("./lib/parser");
