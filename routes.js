let express = require('express');
let winston = require('winston');
let config = require('./config');


let router = new express.Router();


router.get('/webhook', (req, res) => {
    winston.info('Received webhook verification request');
    winston.debug(`hub.verify_token: ${req.query['hub.verify_token']}`);
    winston.debug(`hub.challenge: ${req.query['hub.challenge']}`);

    if (req.query['hub.verify_token'] === config.get('FB_VERIFY_TOKEN')) {
        winston.info('Webhook verified. Sending back challenge value.');
        res.send(req.query['hub.challenge']);
    } else {
        winston.info('Webhook verification failed.');
        res.sendStatus(403);
    }
});


module.exports = router;
