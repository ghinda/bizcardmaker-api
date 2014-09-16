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

    var offers = {};

    var earnings = function(offer, orders) {

      var multiply = 2;
      if((offer.amount.total / 100) >= 30) {
        multiply = 4;
      }

      return multiply * orders;

    };

    var totalEarnings = function(earning) {

      var total = 0;

      var multiply = 2;

      Object.keys(offers).forEach(function(key) {

        if((offers[key].amount.total / 100) >= 30) {
          multiply = 4;
        }

        if(!offers[key][earning]) {
          offers[key][earning] = 0;
        }

        total += offers[key][earning] * multiply;

      });

      return total;

    };

    async.parallel({
      orders: function(callback){

        // get offers
        request
        .get(config.ipAddress + ':' + config.port + '/api/v1/offers')
        .end(function(err, response){

          if(err) {
            return callback(err);
          }

          response.body.offers.forEach(function(offer) {
            offers[offer.id] = offer;
          });

          async.parallel({
            orders: function(callback){

              // last 30 days
              db.find({
                type: 'order',
                result: 'success',
                date: { $gte: moment().subtract(30, 'days') }
              }).sort({
                date: -1
              }).exec(function (err, orders) {

                if(err) {
                  return callback(err);
                }

                callback(err, orders);

              });

            },
            month: function(callback) {

              // this month
              db.find({
                type: 'order',
                result: 'success',
                date: {
                  $gte: moment().date(1)
                  //$gte: moment().subtract(1, 'months')
                }
              }).sort({
                date: -1
              }).exec(function (err, month) {

                if(err) {
                  return callback(err);
                }

                month.forEach(function(m) {
                  // if first offer with this id
                  if(!offers[m.offer.id]) {
                    offers[m.offer.id] = m.offer;
                    offers[m.offer.id].totalThisMonth = 0;
                  }

                  if(!offers[m.offer.id].totalThisMonth) {
                    offers[m.offer.id].totalThisMonth = 0;
                  }

                  offers[m.offer.id].totalThisMonth++;
                });

                callback(err, month);

              });

            },
            lastMonth: function(callback) {

              // last month
              db.find({
                type: 'order',
                result: 'success',
                date: {
                  $gte: moment().subtract(1, 'months').date(1),
                  $lte: moment().subtract(1, 'months').endOf('month')
                }
              }).sort({
                date: -1
              }).exec(function (err, lastMonth) {

                if(err) {
                  return callback(err);
                }

                lastMonth.forEach(function(m) {
                  // if first offer with this id
                  if(!offers[m.offer.id]) {
                    offers[m.offer.id] = m.offer;
                    offers[m.offer.id].totalLastMonth = 0;
                  }

                  if(!offers[m.offer.id].totalLastMonth) {
                    offers[m.offer.id].totalLastMonth = 0;
                  }

                  offers[m.offer.id].totalLastMonth++;
                });

                callback(err, lastMonth);

              });

            }
          }, function(err, res) {

            callback(err, res);

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
        allOrders: results.allOrders,

        orders: results.orders.orders,
        ordersThisMonth: results.orders.month,
        ordersLastMonth: results.orders.lastMonth,

        users: results.users,
        offers: offers,

        earnings: earnings,
        totalEarnings: totalEarnings,

        moment: moment,
        Object: Object
      });

    });

  };

  return {
    view: view
  };

});
