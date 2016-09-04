let express = require('express');
let winston = require('winston');
let config = require('./config');


let router = new express.Router();


/**
 *  GET /webhook
 *
 *  Handle messenger webhook verification. Facebook messenger will pass two
 *  parameters: "verify_token" and "challenge". We check if the "verify_token"
 *  is the value that we set it to and respond with the given "challenge". If
 *  not, we send a HTTP 403 response.
 **/
router.get('/webhook', (req, res) => {
    winston.debug('Received webhook verification request');
    winston.debug(`hub.verify_token: ${req.query['hub.verify_token']}`);
    winston.debug(`hub.challenge: ${req.query['hub.challenge']}`);

    if (req.query['hub.verify_token'] === config.get('FB_VERIFY_TOKEN')) {
        winston.debug('Webhook verified. Sending back challenge value.');
        res.send(req.query['hub.challenge']);
    } else {
        winston.error('Webhook verification failed.');
        res.sendStatus(403);
    }
});


module.exports = router;
