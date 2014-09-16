/* Newsletter
 */

module.exports = (function(config, db) {
  'use strict';

  var express = require('express');
  var request = require('superagent');
  var async = require('async');
  var fs = require('fs');
  var util = require('util');

  var mcapi = require('../../node_modules/mailchimp-api/mailchimp');
  var mc = new mcapi.Mailchimp(config.mailchimp.key);

  var subscribe = function(req, res, next) {

    var params = {
      update_existing: true,
      double_optin: false,
      send_welcome: false,
      id: config.mailchimp.newsletterListId,
      email: req.body
    };

    mc.lists.subscribe(params, function(data) {

      res.json(data);

    }, function(err) {

      res.statusCode = 400;

      res.json(err);

    });

  };

  return {
    subscribe: subscribe
  };

});
