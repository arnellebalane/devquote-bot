let express = require('express');
let config = require('./core/config');
let logger = require('./core/logger');
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
    logger.debug('Received webhook verification request');
    logger.debug(`hub.verify_token: ${req.query['hub.verify_token']}`);
    logger.debug(`hub.challenge: ${req.query['hub.challenge']}`);

    if (req.query['hub.verify_token'] === config.get('FB_VERIFY_TOKEN')) {
        logger.debug('Webhook verified. Sending back challenge value.');
        res.send(req.query['hub.challenge']);
    } else {
        logger.error('Webhook verification failed.');
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
            logger.debug(`Received webhook callback from page ${id} at ${timestamp}.`);

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
                    logger.debug('Received "Message Received" event.');
                    handlers.messageReceived(messaging);
                } else if (messaging.postback) {
                    logger.debug('Received "Postback Received" event.');
                    handlers.postbackReceived(messaging);
                } else if (messaging.optin) {
                    logger.debug('Received "Authentication" event.');
                    handlers.authentication(messaging);
                } else if (messaging.account_linking) {
                    logger.debug('Received "Account Linking" event.');
                    handlers.accountLinking(messaging);
                } else if (messaging.delivery) {
                    logger.debug('Received "Message Delivered" event.');
                    handlers.messageDelivered(messaging);
                } else if (messaging.read) {
                    logger.debug('Received "Message Read" event.');
                    handlers.messageRead(messaging);
                } else if (messaging.message && messaging.message.is_echo) {
                    logger.debug('Received "Message Echo" event.');
                    handlers.messageEcho(messaging);
                } else {
                    logger.error('Received unknown messaging event.');
                    logger.error(messaging);
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
