const winston = require('winston');
const os = require('os');
const path = require('path');
const { format, transports } = winston;

const logFormat = format.printf((info) => JSON.stringify(info, null, 3));

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
  ),
  transports: [
    new transports.File({
      filename: path.join(os.homedir(), '/cma-connect.log'),
      format: format.combine(format.json()),
    }),
  ],
  exitOnError: false,
});

module.exports = { logger };
