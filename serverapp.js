/* http://www.iana.org/assignments/multicast-addresses */

const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const crypto = require('crypto')

module.exports.createServer = (key, logger) => {

  if (!logger) logger = console.log

  server.on('error', (err) => {
    logger(`server error:\n${err.stack}`);
    server.close();
  })

  server.on('message', (msg, rinfo) => {
    try {
      let decipher = crypto.createDecipher('aes-256-cbc', key)

      let decrypted = decipher.update(msg, 'ascii', 'utf8')
      decrypted += decipher.final('utf8')

      logger(`server got: ${decrypted} from ${rinfo.address}:${rinfo.port}`)

      let cipher = crypto.createCipher('aes-256-cbc', decrypted)
      msg = Buffer.concat([cipher.update(new Buffer(key, 'utf8')), cipher.final()])
      
      server.send(msg, rinfo.port, rinfo.address)
    } catch (e) {
      logger(e)
    }
  })

  server.on('listening', () => {
    const address = server.address();
    logger(`server listening ${address.address}:${address.port}`);
  })

  server.bind(44444, () => {
    server.addMembership('239.255.0.1')
  })
}
