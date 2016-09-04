let express = require('express');
let bodyparser = require('body-parser');
let morgan = require('morgan');


let app = express();

app.use(morgan('dev'));
app.use(bodyparser.json());

app.use('/', require('./routes'));


module.exports = app;
