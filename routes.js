let express = require('express');
let config = require('./core/config');
let logger = require('./core/logger');
let handlers = require('./lib/handlers');


let router = new express.Router();


/**
 *  GET /webhook
 *
 *  Handle messenger webhook verification. Messenger Platform will pass two
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
 *  All callbacks from Messenger Platform will be made to this route. For the
 *  format of the request body, check out its documentation in this page:
 *  https://developers.facebook.com/docs/messenger-platform/webhook-reference
 **/

router.post('/webhook', (req, res) => {
    let data = req.body;

    if (data.object === 'page') {
        /**
         *  Each item in `data.entry` corresponds to a page that our app is
         *  subscribed to wherein some messaging events happened. We iterate
         *  over it because it is possible to receive callbacks from multiple
         *  pages at once when the Messenger Platform sends them as a batch.
         **/
        data.entry.forEach(entry => {
            let { id, time } = entry;
            logger.debug(`Received webhook callback from page ${id} at ${time}.`);

            /**
             *  Each item in `entry.messaging` corresponds to a messaging event
             *  that involved the page (e.g. a message was sent to the page).
             *  We handle these messages differently depending on what type of
             *  message they are.
             **/
            entry.messaging.forEach(messaging => {
                if (messaging.message && !messaging.message.is_echo) {
                    handlers.messageReceived(messaging);
                } else if (messaging.postback) {
                    handlers.postbackReceived(messaging);
                } else if (messaging.optin) {
                    handlers.authentication(messaging);
                } else if (messaging.account_linking) {
                    handlers.accountLinking(messaging);
                } else if (messaging.delivery) {
                    handlers.messageDelivered(messaging);
                } else if (messaging.read) {
                    handlers.messageRead(messaging);
                } else if (messaging.message && messaging.message.is_echo) {
                    handlers.messageEcho(messaging);
                } else {
                    logger.error('Received unknown messaging event.');
                    logger.error(messaging);
                }
            });
        });

        /**
         *  We need to send back an HTTP 200 response within 20 seconds to let
         *  the Messenger Platform know that we've successfully received the
         *  callback. Otherwise, the request will time out.
         **/
        res.sendStatus(200);
    }
});


module.exports = router;
