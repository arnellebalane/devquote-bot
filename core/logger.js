let winston = require('winston');


let logger = new winston.Logger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: 'logs/devquotebot.log',
            level: 'debug',
            json: false,
            maxsize: 10000
        })
    ]
});


module.exports = logger;
