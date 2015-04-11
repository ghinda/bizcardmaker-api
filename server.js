#!/bin/env node
/* server
 */

module.exports = (function() {
  'use strict';

  var express = require('express');
  var request = require('superagent');
  var async = require('async');
  var fs = require('fs');
  var knox = require('knox');

  var bodyParser = require('body-parser');
  var errorhandler = require('errorhandler');
  var basicAuth = require('basic-auth-connect');

  var app = express();

  // configs
  var config = require('./config/config.js');

  // Admin auth
  var adminAuth = basicAuth(function(user, pass, callback) {
    var admin = false;
    if(process.env.OPENSHIFT_APP_NAME) {
      admin = (user === config.admin.user && pass === config.admin.password);
    } else {
      admin = true;
    }

    callback(null, admin);
  });

  // config express
  app.use(bodyParser.json({
    limit: '50mb'
  }));

  app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
  }));

  app.set('views', __dirname + '/app/views');
  app.set('view engine', 'ejs');

  app.use(express.static(__dirname + config.publicDir));

  app.use(errorhandler());

  // allow self-signed ssl
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // CORS headers
  app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    next();
  });

  // aws s3
  var s3 = knox.createClient({
    key: config.aws.accessKeyId,
    secret: config.aws.secretAccessKey,
    bucket: config.aws.bucket
  });

  // datastore
  var Datastore = require('nedb');
  var db = new Datastore({
    filename: config.dataDir + config.dbDir + '/bizcardmaker.db',
    autoload: true
  });

  // pdf generation
  var pdf = require('./app/controllers/pdf.js')(config);

  // api routes
  var apiv1 = require('./app/controllers/api-v1.js')(config, pdf, db, s3);

  app.get('/api/v1/users', apiv1.users);
  app.get('/api/v1/offers', apiv1.offers);
  app.post('/api/v1/shipping', apiv1.shipping);
  app.post('/api/v1/orders', apiv1.orders);

  // order dashboard
  var orders = require('./app/controllers/orders.js')(config, db);

  app.get('/api/v1/allusers', adminAuth, apiv1.allUsers);
  app.get('/api/v1/allorders', adminAuth, apiv1.allOrders);

  app.get('/orders', adminAuth, orders.view);

  // newsletter
  var newsletter = require('./app/controllers/newsletter.js')(config, db);

  app.post('/newsletter/subscribe', newsletter.subscribe);
  
  // address validation
  
  var addressValidation = require('./app/controllers/address-validation.js')(config, db);
  app.post('/api/v1/validate-address', addressValidation.validateAddress);

  // start express server
  app.listen(config.port, config.ipAddress, function() {
    console.log(
      '%s: Node server started on %s:%d ...',
      Date(Date.now()),
      config.ipAddress,
      config.port
    );
  });

  return app;

}());
