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
  this._collapse = options.collapse || ["host", "user-agent"];

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
      for (i = offset; i < this._buffer.length; ++i) {
        // \n is required as a line terminator
        if (this._buffer[i] === 0x0a) {
          // this is where the line "ends"
          var to = i;

          // it can be ended with a \n or a \r\n, so if there's data behind the
          // \n and it's a \r, we want to not consume that byte
          if (this._buffer.length > 1 && this._buffer[i-1] === 0x0d) {
            to--;
          }

          this._moreHeaders = this.pushHeaderLine(this._buffer.toString("ascii", offset, to));

          if (!this._moreHeaders) {
            break;
          }

          offset = i + 1; // skip past the \n (and potentially \r)
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

  var k;
  if (typeof this._collapse === "object" && this._collapse !== null) {
    for (var i in this._collapse) {
      k = this._collapse[i];

      if (headers[k] && Array.isArray(headers[k])) {
        headers[k] = headers[k][0];
      }
    }
  } else if (this._collapse === true) {
    for (k in headers) {
      if (headers[k].length === 1) {
        headers[k] = headers[k][0];
      }
    }
  }

  this._headerLines = null;

  this.emit("headers", {"0": method, method: method, "1": path, path: path, "2": headers, headers: headers});
};
