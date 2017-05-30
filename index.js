'use strict'

var pino = require('pino')

function logging (opts) {
  opts = opts || {}

  opts.stream = opts.stream || process.stdout
  var logger = pino(opts.pinoOptions || {}, opts.stream)
  var instance = opts.instance
  var servers = opts.servers

  if (!servers) {
    if (opts.server) {
      servers = [opts.server]
    } else {
      servers = []
    }
  }

  instance.logger = logger

  servers.forEach(function (server) {
    server.on('listening', function () {
      var address = server.address()
      if (server.key && server.cert && server.hasOwnProperty('httpAllowHalfOpen')) {
        address.protocol = 'https'
      } else if (server.key && server.cert) {
        address.protocol = 'tls'
      } else if (server.hasOwnProperty('httpAllowHalfOpen')) {
        address.protocol = 'http'
      } else {
        address.protocol = 'tcp'
      }
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
    if (client.logger) {
      client.logger.info('disconnected')
    } else {
      logger.warn('disconnect without connect')
    }
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

  instance.on('clientError', function (client, err) {
    if (client.logger) {
      client.logger.warn(err)
    } else {
      logger.warn({
        client: client,
        err: err
      }, err.message)
    }
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
