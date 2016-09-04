let express = require('express');
let winston = require('winston');
let config = require('./config');
let handlers = require('./lib/handlers');


let router = new express.Router();


/**
 *  GET /webhook
 *
 *  Handle messenger webhook verification. Facebook Messenger will pass two
 *  parameters: `verify_token` and `challenge`. We check if the `verify_token`
 *  is the value that we set it to and respond with the given `challenge`. If
 *  not, we send an HTTP 403 response.
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


/**
 *  POST /webhook
 *
 *  All callbacks from Facebook Messenger will be made to this route. For the
 *  format of the request body, check the "Common Format" section in this page:
 *  https://developers.facebook.com/docs/messenger-platform/webhook-reference
 **/

router.post('/webhook', (req, res) => {
    let data = req.body;

    if (data.object === 'page') {
        /**
         *  Each item in `data.entry` corresponds to a page that our app is
         *  subscribed to. We iterate over it because it is possible to
         *  receive callbacks from multiple pages at once when Facebook
         *  Messenger sends them as a batch.
         **/
        data.entry.forEach(entry => {
            let { id, time } = entry;
            winston.debug(`Received webhook callback from page ${id} at ${timestamp}.`);

            /**
             *  Each item in `entry.messaging` corresponds to messages that
             *  we sent to our app. Each message has a different format based
             *  on what type of callback it is. Documentation for each callback
             *  can be found at https://developers.facebook.com/docs/messenger-platform/webhook-reference
             *
             *  We then handle these messages differently depending on what
             *  type of message they are.
             **/
            entry.messaging.forEach(messaging => {
                if (messaging.message && !messaging.message.is_echo) {
                    winston.debug('Received "Message Received" event.');
                    handlers.messageReceived(messaging);
                } else if (messaging.postback) {
                    winston.debug('Received "Postback Received" event.');
                    handlers.postbackReceived(messaging);
                } else if (messaging.optin) {
                    winston.debug('Received "Authentication" event.');
                    handlers.authentication(messaging);
                } else if (messaging.account_linking) {
                    winston.debug('Received "Account Linking" event.');
                    handlers.accountLinking(messaging);
                } else if (messaging.delivery) {
                    winston.debug('Received "Message Delivered" event.');
                    handlers.messageDelivered(messaging);
                } else if (messaging.read) {
                    winston.debug('Received "Message Read" event.');
                    handlers.messageRead(messaging);
                } else if (messaging.message && messaging.message.is_echo) {
                    winston.debug('Received "Message Echo" event.');
                    handlers.messageEcho(messaging);
                } else {
                    winston.error('Received unknown messaging event.');
                    winston.error(messaging);
                }
            });
        });

        /**
         *  We need to send back an HTTP 200 response within 20 seconds to let
         *  Facebook Messenger know that we've successfully received the
         *  callback. Otherwise, the request will time out.
         **/
        res.sendStatus(200);
    }
});


module.exports = router;
