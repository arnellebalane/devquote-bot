let winston = require('winston');


let logger = new winston.Logger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            name: 'info-log',
            filename: 'logs/devquotebot-info.log',
            level: 'info'
        }),
        new winston.transports.File({
            name: 'debug-log',
            filename: 'logs/devquotebot-debug.log',
            level: 'debug'
        }),
        new winston.transports.File({
            name: 'error-log',
            filename: 'logs/devquotebot-error.log',
            level: 'error'
        })
    ]
});


module.exports = logger;
