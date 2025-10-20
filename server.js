// Get the packages we need
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const errorHandler = require('./util/errorHandler');

// Read .env file
require('dotenv').config();

// Create our Express application
const app = express();

// Use environment defined port or 3000
const port = process.env.PORT || 3000;

// Connect to a MongoDB --> Uncomment this once you have a connection string!!
mongoose.connect(process.env.MONGODB_URI);

// Allow CORS so that backend and frontend could be put on different servers
const allowCrossDomain = function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
  next();
};
app.use(allowCrossDomain);

// Use the body-parser package in our application
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const morgan = require('morgan');
app.use(morgan('short'));

// Use routes as a module (see index.js)
require('./routes')(app);

// app.use(errors());
app.use(errorHandler);

// Start the server
app.listen(port);
console.log('Server running on port ' + port);
