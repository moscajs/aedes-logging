'use strict'

var pino = require('pino')

function logging (opts) {
  opts = opts || {}

  var logger = pino(opts.stream, opts)
  var instance = opts.instance
  var servers = opts.servers || opts.server && [opts.server] || []

  instance.logger = logger

  servers.forEach(function (server) {
    server.on('listening', function () {
      var address = server.address()
      address.protocol = 'tcp'
      logger.info(address, 'listening')
    })
  })

  instance.on('client', function (client) {
    client.logger = logger.child({
      client: {
        id: client.id
      }
    })
    client.logger.info('connected')
  })

  return instance
}

module.exports = logging
