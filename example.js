#!/usr/bin/env node

var httpp = require("./");

var parser = new httpp.Parser();

parser.on("headers", function(headers) {
  console.log("========");
  console.log(headers);
  console.log("========");
});

parser.pipe(process.stdout, {end: false});

var data = "GET / HTTP/1.1\r\nHost: asdf\r\nContent-Length: 5\r\n\r\naaaaa\r\n0\r\nmore data that isn't real http stuff, who cares!".split("");

function writeNext() {
  parser.write(data.shift());

  if (data.length) {
    setImmediate(writeNext);
  }
}
writeNext();
