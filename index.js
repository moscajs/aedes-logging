'use strict'

var pino = require('pino')

function logging (opts) {
  opts = opts || {}

  var logger = pino(opts.stream, {
    level: opts.level,
    extreme: opts.extreme,
    safe: opts.safe
  })
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

  instance.on('clientDisconnect', function (client) {
    client.logger.info('disconnected')
  })

  instance.on('subscribe', function (subscriptions, client) {
    client.logger.info({
      subscriptions: subscriptions
    }, 'subscribed')
  })

  instance.on('unsubscribe', function (subscriptions, client) {
    client.logger.info({
      topics: subscriptions
    }, 'unsubscribed')
  })

  // default is true
  if (opts.messages !== false) {
    instance.on('publish', logPublish)
  }

  return instance
}

function logPublish (publish, client) {
  var logger = this.logger
  var level = 'debug'

  if (client) {
    level = 'info'
    logger = client.logger
  }

  logger[level]({
    message: {
      topic: publish.topic,
      qos: publish.qos,
      retain: publish.retain
    }
  }, 'published')
}

module.exports = logging
