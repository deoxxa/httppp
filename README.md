HTTPPP
======

HyperText Transfer Protocol Partial Parser

Overview
--------

HTTPPP lets you parse only the bits of HTTP that you really need. It is designed
specifically to aid in the creation of proxies that need to be fast and support
arbitrary HTTP-like protocols. It doesn't mess with the actual data being pushed
through the connection, so it trivially supports websockets and other extensions
that rely on upgrade functionality or similar.

Installation
------------

Available via [npm](http://npmjs.org/):

> $ npm install httppp

Or via git:

> $ git clone git://github.com/deoxxa/httppp.git node_modules/httppp

API
---

**httppp**

The actual `module.exports` value (the thing you get when you `require("httppp")`
is a factory function for creating parsers.

```javascript
httppp(onHeaders);
```

```javascript
var parser = httppp(functon onHeaders(info) { console.log(info); });
```

Arguments

* _onHeaders_ - this is a function that, if supplied, is attached to `#headers`
  on the new `Parser` object. See below for information on the `headers` event.

**Parser constructor**

Constructs a new httppp Parser object, optionally supplying some configuration
information as an object.

```javascript
new httppp.Parser(options);
```

```javascript
// basic instantiation
var parser = new httppp.Parser();

// instantiation with options
var parser = new httppp.Parser({maximumHeaderBytes: 4096});
```

Arguments

* _options_ - an object specifying configuration parameters. The only available
  parameter right now is `maximumHeaderBytes`, which controls how many bytes the
  parser will try to read before it gives up and emits an error saying that the
  headers were too long.

**#headers**

The "headers" event is emitted when httppp has decided that it's parsed all the
headers that are going to arrive. Note that this is only emitted once per
connection, with the implication of that being that you won't know about
pipelined requests.

The payload for the event is an object with properties of `method`, `path`, and
`headers`. `method` and `path` are both strings, and `headers` is an object,
where the keys are the header names, and the values are arrays containing the
values collected for that header. The values are arrays because multiple headers
with the same name may be sent (for example cookies).

*NOTE: the payload for this event used to be an array, and to maintain
compatibility with code that's still expecting that, the properties of the
payload are aliased as `method` -> `0`, `path` -> `1` and `headers` -> `2`.*

```javascript
parser.on("headers", onHeaders);
```

```javascript
parser.on("headers", function onHeaders(info) {
  // "GET" or similar
  console.log(info.method);

  // "/" or something
  console.log(info.path);

  // {host: ["127.0.0.1"], cookie: ["a=b", "c=d"]}
  console.log(info.headers);
});
```

Example
-------

You might want to look at [example.js](https://github.com/deoxxa/httppp/blob/master/example.js)
as well.

```javascript
var net = require("net"),
    http = require("http"),
    httppp = require("httppp");

var server1_port = null,
    server2_port = null;

var proxy = net.createServer(function(socket) {
  var parser = httppp(function(info) {
    console.log(new Date(), "proxy headers", info.method, info.path);

    var host = (info.headers.host && info.headers.host.length) ? info.headers.host[0] : null;

    // remove port from host header
    if (host) {
      host = host.split(":").shift();
    }

    switch (host) {
      case "localhost": parser.pipe(net.connect({port: server1_port})).pipe(socket); break;
      case "127.0.0.1": parser.pipe(net.connect({port: server2_port})).pipe(socket); break;
      default: socket.end(); break;
    }
  });

  parser.on("error", function() {
    socket.end();
  });

  socket.pipe(parser);
});

proxy.listen(3000, function() {
  console.log("listening on port", this.address().port);
});

var server1 = http.createServer(function(req, res) {
  console.log(new Date(), "http[1] request", req.url);

  res.end("hello there from server 1!");
});

server1.listen(function() {
  server1_port = this.address().port;
});

var server2 = http.createServer(function(req, res) {
  console.log(new Date(), "http[2] request", req.url);

  res.end("hello there from server 2!");
});

server2.listen(function() {
  server2_port = this.address().port;
});
```

License
-------

3-clause BSD. A copy is included with the source.

Contact
-------

* GitHub ([deoxxa](http://github.com/deoxxa))
* Twitter ([@deoxxa](http://twitter.com/deoxxa))
* ADN ([@deoxxa](https://alpha.app.net/deoxxa))
* Email ([deoxxa@fknsrs.biz](mailto:deoxxa@fknsrs.biz))
