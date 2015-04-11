/* Orders dashboard
 */

module.exports = (function(config, db) {
  'use strict';

  var express = require('express');
  var request = require('superagent');
  var async = require('async');
  var fs = require('fs');
  var mkdirp = require('mkdirp');
  var util = require('util');
  var moment = require('moment');

  var view = function(req, res, next) {

    var startDate = req.query.startDate || '';
    var endDate = req.query.endDate || '';
    var ordersTotal = 0;
    
    async.parallel({
      orders: function(callback){
        
        var lastThirtyDays = moment().subtract(30, 'days');
        
        var dateFilters = {
          $gte: lastThirtyDays
        };
        
        if(startDate) {
          dateFilters.$gte = new Date(startDate);
        } else {
          startDate = moment(lastThirtyDays).format('YYYY-MM-DD');
        }
        
        if(endDate) {
          dateFilters.$lte = new Date(endDate); 
        } else {
          endDate = moment().format('YYYY-MM-DD');
        }
        
        db
        .find({
          type: 'order',
          result: 'success',
          date: dateFilters
        })
        .sort({
          date: -1
        })
        .exec(function (err, orders) {

          if(err) {
            return callback(err);
          }

          callback(err, orders);
          
          orders.forEach(function(order) {
            ordersTotal += order.billing.total;
          });

        });

      },
      users: function(callback){

        // get users
        request
        .get(config.ipAddress + ':' + config.port + '/api/v1/allusers')
        .auth(config.admin.user, config.admin.password)
        .end(function(err, res) {

          callback(err, res.body.users);

        });

      },
      allOrders: function(callback) {

        // get users
        request
        .get(config.ipAddress + ':' + config.port + '/api/v1/allorders')
        .auth(config.admin.user, config.admin.password)
        .end(function(err, res) {

          callback(err, res.body.orders);

        });

      }
    },
    function(err, results) {

      if(err) {
        return next(err);
      }

      res.render('orders', {
        startDate: startDate,
        endDate: endDate,
        
        allOrders: results.allOrders,

        orders: results.orders,
        ordersTotal: ordersTotal,

        users: results.users,

        moment: moment,
        Object: Object
      });

    });

  };

  return {
    view: view
  };

});
