var util = require("util"),
  stream = require('stream');

// polyfill streams2 api, if required
if (!stream.Transform) {
  stream = require("readable-stream");
}

var Parser = module.exports = function Parser(options) {
  stream.Transform.call(this);

  options = options || {};

  this._maximumHeaderBytes = options.maximumHeaderBytes || 65536;

  this._buffer = Buffer(0);
  this._headerBytes = 0;
  this._moreHeaders = true;
  this._headerLines = [];
};
util.inherits(Parser, stream.Transform);

Parser.prototype._transform = function _transform(input, encoding, done) {
  if (this._moreHeaders) {
    this._buffer = Buffer.concat([this._buffer, input]);

    this._headerBytes += input.length;

    if (this._headerBytes > this._maximumHeaderBytes) {
      this.emit("error", Error("too much header data received, aborting parsing"));
      this._moreHeaders = false;
      return;
    }

    var offset = 0, i = 0;
    while (i < this._buffer.length - 1) {
      for (i = offset; i < this._buffer.length - 1; ++i) {
        if (this._buffer[i] === 0x0d && this._buffer[i+1] === 0x0a) {
          this._moreHeaders = this.pushHeaderLine(this._buffer.toString("ascii", offset, i));

          if (!this._moreHeaders) {
            break;
          }

          offset = i + 2;
        }
      }

      if (!this._moreHeaders) {
        this._buffer = null;
        break;
      }

      if (offset > 0) {
        this._buffer = this._buffer.slice(offset);
      }
    }
  }

  this.push(input);

  done();
};

Parser.prototype.pushHeaderLine = function pushHeaderLine(line) {
  if (line.length === 0) {
    process.nextTick(this.parseHeaders.bind(this));

    return false;
  } else {
    this._headerLines.push(line);

    return true;
  }
};

Parser.prototype.parseHeaders = function parseHeaders() {
  var firstLine = this._headerLines.shift();

  var matches = firstLine.match(/^([^ ]+)\s+([^ ]+?)\s+HTTP\/(\d+)\.(\d+)$/);
  if (!matches) {
    var err = Error("couldn't parse initial header line");
    err.data = firstLine;
    this.emit("error", err);
    return;
  }

  var method = matches[1],
      path = matches[2],
      versionMajor = parseInt(matches[3], 10),
      versionMinor = parseInt(matches[4], 10);

  var headers = Object.create(null);

  this._headerLines.forEach(function(line) {
    var matches = line.match(/^([^:]+)(?::(.+))?$/);

    var name = matches[1].toLowerCase(),
        value = matches[2].trim();

    if (typeof headers[name] === "undefined") {
      headers[name] = [];
    }

    headers[name].push(value);
  });

  this._headerLines = null;

  this.emit("headers", [method, path, headers]);
};
