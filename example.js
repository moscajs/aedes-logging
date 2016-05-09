'use strict'

var fs = require('fs')
var path = require('path')
var http = require('http')
var https = require('https')
var websocket = require('websocket-stream')
var net = require('net')
var tls = require('tls')
var aedes = require('aedes')
var logging = require('./')
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
