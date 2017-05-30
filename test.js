'use strict'

var Buffer = require('safe-buffer').Buffer
var test = require('tap').test
var aedes = require('aedes')
var writeStream = require('flush-write-stream')
var logging = require('./')
var net = require('net')
var mqtt = require('mqtt')
var split = require('split2')
var tls = require('tls')
var fs = require('fs')
var path = require('path')
var http = require('http')
var https = require('https')
var websocket = require('websocket-stream')

function startServer (stream, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  opts.createServer = opts.createServer || net.createServer

  var instance = aedes()
  var server = opts.createServer(instance.handle)

  logging({
    instance: instance,
    stream: stream,
    server: server,
    messages: opts.messages
  })

  server.listen(0, function (err) {
    if (err) {
      return cb(err)
    }

    cb(null, server, instance)
  })

  return server
}

function sink (func) {
  var result = split(JSON.parse)
  result.pipe(writeStream.obj(func))
  return result
}

test('logs when the server is started', function (t) {
  t.plan(6)

  var server
  var dest = sink(function (line, enc, cb) {
    t.equal(line.msg, 'listening', 'message matches')
    t.equal(line.port, server.address().port, 'port matches')
    t.equal(line.protocol, 'tcp', 'protocol matches')
    cb()
  })
  server = startServer(dest, function (err, server, instance) {
    t.error(err)
    server.close(t.pass.bind(t, 'server closes'))
    instance.close(t.pass.bind(t, 'instance closes'))
  })
})

test('logs when a connection or disconnection happens', function (t) {
  t.plan(9)

  var client
  var lines = 0
  var dest = sink(function (line, enc, cb) {
    t.pass('line is emitted')
    if (lines === 1) {
      t.equal(line.msg, 'connected', 'connected msg matches')
      t.equal(line.client.id, client.options.clientId, 'client id matches')
    } else if (lines === 2) {
      t.equal(line.msg, 'disconnected', 'disconnected msg matches')
      t.equal(line.client.id, client.options.clientId, 'client id matches')
    }
    lines++
    cb()
  })
  startServer(dest, function (err, server, instance) {
    t.error(err)
    client = mqtt.connect(server.address())
    client.on('connect', function () {
      t.pass('client connected')
      client.end()
    })
    t.teardown(function (cb) {
      server.close(cb)
    })
    t.teardown(function (cb) {
      instance.close(cb)
    })
  })
})

test('logs when a subscription and unsubscription happens', function (t) {
  t.plan(13)

  var client
  var lines = 0
  var dest = sink(function (line, enc, cb) {
    t.pass('line is emitted')
    if (lines === 2) {
      t.equal(line.msg, 'subscribed', 'msg matches')
      t.equal(line.client.id, client.options.clientId, 'client id matches')
      t.deepEqual(line.subscriptions, [{
        topic: 'hello',
        qos: 0
      }], 'subscriptions')
    } else if (lines === 3) {
      t.equal(line.msg, 'unsubscribed', 'msg matches')
      t.equal(line.client.id, client.options.clientId, 'client id matches')
      t.deepEqual(line.topics, ['hello'], 'subscriptions')
    }
    lines++
    cb()
  })
  startServer(dest, function (err, server, instance) {
    t.error(err)
    client = mqtt.connect(server.address())
    client.subscribe('hello', function (err) {
      t.error(err)
      client.end()
    })
    t.teardown(function (cb) {
      server.close(cb)
    })
    t.teardown(function (cb) {
      instance.close(cb)
    })
  })
})

test('logs when a packet is published', function (t) {
  t.plan(4)

  var client
  var lines = 0
  var dest = sink(function (line, enc, cb) {
    if (lines++ === 2) {
      t.equal(line.msg, 'published', 'msg matches')
      t.equal(line.client.id, client.options.clientId, 'client id matches')
      t.deepEqual(line.message, {
        topic: 'hello',
        qos: 0,
        retain: false
      }, 'subscriptions')
    }
    cb()
  })
  startServer(dest, function (err, server, instance) {
    t.error(err)
    client = mqtt.connect(server.address())
    client.publish('hello', 'world')
    t.teardown(function (cb) {
      client.end()
      server.close(cb)
    })
    t.teardown(function (cb) {
      instance.close(cb)
    })
  })
})

test('avoid logging every published message with an option', function (t) {
  t.plan(4)

  var client
  var dest = sink(function (line, enc, cb) {
    t.notEqual(line.msg, 'published', 'msg matches')
    cb()
  })
  startServer(dest, {
    messages: false
  }, function (err, server, instance) {
    t.error(err)
    client = mqtt.connect(server.address())
    client.publish('hello', 'world')
    client.end()
    t.teardown(function (cb) {
      server.close(cb)
    })
    t.teardown(function (cb) {
      instance.close(cb)
    })
  })
})

test('logs when an error on the server client object happens', function (t) {
  t.plan(4)

  var client
  var lines = 0
  var dest = sink(function (line, enc, cb) {
    if (lines === 2) {
      t.equal(line.msg, 'BOOM')
      t.equal(line.level, 40)
      t.equal(line.client.id, client.options.clientId, 'client id matches')
    }
    lines++
    cb()
  })
  startServer(dest, function (err, server, instance) {
    t.error(err)
    client = mqtt.connect(server.address())
    instance.on('client', function (ic) {
      setImmediate(function () {
        ic.emit('error', new Error('BOOM'))
      })
    })
    t.teardown(function (cb) {
      client.end()
      server.close(cb)
    })
    t.teardown(function (cb) {
      instance.close(cb)
    })
  })
})

test('logs when a TLS server is started', function (t) {
  t.plan(6)

  var server
  var dest = sink(function (line, enc, cb) {
    t.equal(line.msg, 'listening', 'message matches')
    t.equal(line.port, server.address().port, 'port matches')
    t.equal(line.protocol, 'tls', 'protocol matches')
    cb()
  })
  server = startServer(dest, {
    createServer: function (handle) {
      return tls.createServer({
        key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
      }, handle)
    }
  }, function (err, server, instance) {
    t.error(err)
    server.close(t.pass.bind(t, 'server closes'))
    instance.close(t.pass.bind(t, 'instance closes'))
  })
})

test('logs when an HTTP server is started', function (t) {
  t.plan(6)

  var server
  var dest = sink(function (line, enc, cb) {
    t.equal(line.msg, 'listening', 'message matches')
    t.equal(line.port, server.address().port, 'port matches')
    t.equal(line.protocol, 'http', 'protocol matches')
    cb()
  })
  server = startServer(dest, {
    createServer: function (handle) {
      var server = http.createServer()
      websocket.createServer({
        server: server
      }, handle)
      return server
    }
  }, function (err, server, instance) {
    t.error(err)
    server.close(t.pass.bind(t, 'server closes'))
    instance.close(t.pass.bind(t, 'instance closes'))
  })
})

test('logs when an HTTPS server is started', function (t) {
  t.plan(6)

  var server
  var dest = sink(function (line, enc, cb) {
    t.equal(line.msg, 'listening', 'message matches')
    t.equal(line.port, server.address().port, 'port matches')
    t.equal(line.protocol, 'https', 'protocol matches')
    cb()
  })
  server = startServer(dest, {
    createServer: function (handle) {
      var server = https.createServer({
        key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
      })
      websocket.createServer({
        server: server
      }, handle)
      return server
    }
  }, function (err, server, instance) {
    t.error(err)
    server.close(t.pass.bind(t, 'server closes'))
    instance.close(t.pass.bind(t, 'instance closes'))
  })
})

test('do not crash if a client does not issue a CONNECT', function (t) {
  t.plan(6)

  var client
  var lines = 0
  var dest = sink(function (line, enc, cb) {
    if (lines === 1) {
      t.pass('line is emitted')
      t.equal(line.msg, 'Cannot parse protocolId', 'disconnected msg matches')
    }
    lines++
    cb()
  })
  startServer(dest, function (err, server, instance) {
    t.error(err)
    client = net.connect(server.address())
    client.on('connect', function () {
      t.pass('client connected')
      // wrong MQTT message
      client.write(Buffer.from([
        16, 8,
        0, 15,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112
      ]))
      client.on('close', function () {
        server.close(t.pass.bind(t, 'server closes'))
        instance.close(t.pass.bind(t, 'instance closes'))
      })
    })
  })
})
