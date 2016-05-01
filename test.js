'use strict'

var test = require('tap').test
var aedes = require('aedes')
var writeStream = require('flush-write-stream')
var logging = require('./')
var net = require('net')
var mqtt = require('mqtt')
var split = require('split2')

function startServer (stream, cb) {
  var instance = aedes()
  var server = net.createServer(instance.handle)

  logging({
    instance: instance,
    stream: stream,
    server: server
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

test('logs when a connection happens', function (t) {
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

test('logs when a subscription happens', function (t) {
  t.plan(9)

  var client
  var lines = 0
  var dest = sink(function (line, enc, cb) {
    t.pass('line is emitted')
    if (lines++ === 2) {
      t.equal(line.msg, 'subscribed', 'msg matches')
      t.equal(line.client.id, client.options.clientId, 'client id matches')
      t.deepEqual(line.subscriptions, [{
        topic: 'hello',
        qos: 0
      }], 'subscriptions')
    }
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
