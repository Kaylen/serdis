/* http://www.iana.org/assignments/multicast-addresses */

const dgram = require('dgram')
const crypto = require('crypto')
const EventEmitter = require('events')

class MyEmitter extends EventEmitter {}

module.exports.getServerAddress = (key, logger) => {
  let client = dgram.createSocket('udp4')
  let cipher = crypto.createCipher('aes-256-cbc', key)
  let random = Math.random().toString()
                + Math.random().toString()
                + Math.random().toString()
                + Math.random().toString()
  let message = Buffer.concat([cipher.update(new Buffer(random, 'utf8')), cipher.final()])

  let timeoutId
  let found = false
  let result = new MyEmitter()

  if (!logger) logger = console.log

  client.on('error', (err) => {
    clearTimeout(timeoutId)
    client.close()
    logger(`client error:\n${err.stack}`)
  })

  client.on('message', (msg, rinfo) => {
    let decipher = crypto.createDecipher('aes-256-cbc', random)
    try {
      let decrypted = decipher.update(msg, 'ascii', 'utf8')
      decrypted += decipher.final('utf8')

      logger(`client got: ${decrypted} from ${rinfo.address}:${rinfo.port}`)
      if (`${decrypted}` === key) {
        found = true
        result.emit('address', rinfo.address)
      } else {
        clearTimeout(timeoutId)
        client.close()
        logger(`KeyError: ${decrypted} from ${rinfo.address}:${rinfo.port}`)
        result.emit('error', 'KeyError')
      }
    } catch (e) {
      clearTimeout(timeoutId)
      client.close()
      logger(e)
      result.emit('error', 'KeyError')
    }
  })

  client.on('listening', () => {
    let address = client.address()
    logger(`client listening ${address.address}:${address.port}`)
  })

  client.bind(() => {
    client.send(message, 44444, '239.255.0.1')
    timeoutId = setTimeout(() => {
      client.close()
      if (!found) {
        logger(`NotFound`)
        result.emit('error', 'NotFound')
      }
    }, 1000)
  })

  return result
}
