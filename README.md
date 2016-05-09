# aedes-logging

Logging module for [Aedes][aedes], based on [Pino](https://github.com/mcollina/pino).

## Install

```
npm i aedes-logging --save
```

## Example

```js
'use strict'

var fs = require('fs')
var path = require('path')
var http = require('http')
var https = require('https')
var websocket = require('websocket-stream')
var net = require('net')
var tls = require('tls')
var aedes = require('aedes')
var logging = require('aedes-logging')
var instance = aedes()

var servers = [
  startHttp(),
  startHttps(),
  startNet(),
  startTLS()
]

logging({
  instance: instance,
  servers: servers
})

function startHttp () {
  var server = http.createServer()
  websocket.createServer({
    server: server
  }, instance.handle)
  server.listen(8880)
  return server
}

function startHttps () {
  var server = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
  })
  websocket.createServer({
    server: server
  }, instance.handle)
  server.listen(8881)
  return server
}

function startNet () {
  return net.createServer(instance.handle).listen(8882)
}

function startTLS () {
  return tls.createServer({
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
  }, instance.handle).listen(8883)
}
```

This will logs something like:

```
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"listening","time":1462777611365,"address":"::","family":"IPv6","port":8880,"protocol":"http","v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"listening","time":1462777611367,"address":"::","family":"IPv6","port":8881,"protocol":"https","v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"listening","time":1462777611367,"address":"::","family":"IPv6","port":8882,"protocol":"tcp","v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"listening","time":1462777611367,"address":"::","family":"IPv6","port":8883,"protocol":"tls","v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"connected","time":1462777614262,"client":{"id":"mqttjs_bab0eb44"},"v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"published","time":1462777614272,"message":{"topic":"hello","qos":0,"retain":false},"client":{"id":"mqttjs_bab0eb44"},"v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"disconnected","time":1462777614274,"client":{"id":"mqttjs_bab0eb44"},"v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"connected","time":1462777618180,"client":{"id":"mqttjs_c1f2ccce"},"v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"subscribed","time":1462777618196,"subscriptions":[{"topic":"#","qos":0}],"client":{"id":"mqttjs_c1f2ccce"},"v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"unsubscribed","time":1462777619111,"topics":["#"],"client":{"id":"mqttjs_c1f2ccce"},"v":1}
{"pid":55663,"hostname":"MBP-di-Matteo","level":30,"msg":"disconnected","time":1462777619111,"client":{"id":"mqttjs_c1f2ccce"},"v":1}
```

## API

### aedesLogging(opts)

opts can contain:

* `servers`: an array of servers to print listening data
* `server`: alias for passing an array with a single element to
  `servers`.
* `instance`: the instance of [aedes][aedes]
* `messages`: logs all the mqtt PUBLISH received, defaults `true`

## License

MIT

[aedes]: https://github.com/mcollina/aedes
