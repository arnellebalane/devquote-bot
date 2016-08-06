var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var winston = require('winston');
var request = require('request');


var app = express();

app.use(morgan('dev'));
app.use(bodyParser.json());


app.get('/webhook', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe'
    && req.query['hub.verify_token'] === 'devquote-bot-verify-token') {
        winston.info('Validating webhook');
        res.status(200).send(req.query['hub.challenge']);
    } else {
        winston.error('Failed. Make sure the validation tokens match.');
        res.sendStatus(403);
    }
});

app.post('/webhook', function(req, res) {
    var data = req.body;
    if (data.object === 'page') {
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            winston.info('Received pageEntry from page:' + pageID);

            pageEntry.messaging.forEach(function(messagingEvent) {
                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.delivery) {
                    receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else {
                    winston.warn('Received unknown messagingEvent: '
                        + messagingEvent);
                }
            });
        });
    }
    res.sendStatus(200);
});


app.listen(process.env.PORT || 3000, function() {
    winston.info('Server is now running!');
});





function receivedAuthentication(e) {
    winston.info('Recieved authentication event', e);
}


function receivedMessage(e) {
    var senderID = e.sender.id;
    var recipientID = e.recipient.id;
    var timeOfMessage = e.timestamp;
    var message = e.message;

    winston.info('Received message for %d and page %d at %d with message:',
        senderID, recipientID, timeOfMessage);
    winston.info(message);

    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {
        sendTextMessage(senderID, messageText);
    } else if (messageAttachments) {
        sendTextMessage(senderID, 'Message with attachment received');
    }
}


function receivedDeliveryConfirmation(e) {
    winston.info('Received delivery confirmation event', e);
}


function receivedPostback(e) {
    winston.info('Received postback event', e);
}


function sendTextMessage(recipientID, messageText) {
    var messageData = {
        recipient: {
            id: recipientID
        },
        message: {
            text: messageText
        }
    };
    callSendAPI(messageData);
}


function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: 'EAADoPdZBRkyABAN2qV853yUWZC4oy4fRdA2Bn3lvKlAkavT4dLbDRCYNr5d2ZBAPvcyDfBvassZCbbWiJrMnZBGSbNkZAAR0JaOhor6icMEzdR88m7ZCrXVPEsk9ZC50QUv1WVaC6h3p3Bfha04yRjzH3N9YOfOYQB49JOHaTP17HwZDZD' },
        method: 'POST',
        json: messageData
    }, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var recipientID = body.recipient_id;
            var messageID = body.message_id;
            winston.info('Successfully sent message with id %s to recipient %s',
                messageID, recipientID);
        } else {
            winston.error('Unable to send message');
            winston.error(response);
            winston.error(error);
        }
    });
}
