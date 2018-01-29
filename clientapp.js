/* http://www.iana.org/assignments/multicast-addresses */

const dgram = require('dgram')
const client = dgram.createSocket('udp4')
const EventEmitter = require('events')
const crypto = require('crypto')

class MyEmitter extends EventEmitter {}

module.exports.getServerAddress = (key, logger) => {
  const cipher = crypto.createCipher('aes-256-cbc', key)
  const random = Math.random().toString()
                + Math.random().toString()
                + Math.random().toString()
                + Math.random().toString()
  const decipher = crypto.createDecipher('aes-256-cbc', random)
  const message = Buffer.concat([cipher.update(new Buffer(random, 'utf8')), cipher.final()])

  let timeoutId
  const result = new MyEmitter()

  if (!logger) logger = console.log

  client.on('error', (err) => {
    logger(`client error:\n${err.stack}`)
    clearTimeout(timeoutId)
    client.close()
  })

  client.on('message', (msg, rinfo) => {
    try {
      let decrypted = decipher.update(msg, 'ascii', 'utf8')
      decrypted += decipher.final('utf8')

      logger(`client got: ${decrypted} from ${rinfo.address}:${rinfo.port}`)
      if (`${decrypted}` === key) {
        result.emit('address', rinfo.address)
      } else {
        logger(`KeyError: ${decrypted} from ${rinfo.address}:${rinfo.port}`)
        result.emit('error', 'KeyError')
      }
    } catch (e) {
      logger(e)
      result.emit('error', 'KeyError')
    } finally {
      clearTimeout(timeoutId)
      client.close()
    }
  })

  client.on('listening', () => {
    const address = client.address()
    logger(`client listening ${address.address}:${address.port}`)
  })

  client.bind(55555, () => {
    client.send(message, 44444, '239.255.0.1')
    timeoutId = setTimeout(() => {
      logger(`NotFound`)
      result.emit('error', 'NotFound')
      client.close()
    }, 1000)
  })

  return result
}