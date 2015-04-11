/* API v1 methods
 */

module.exports = (function(config, pdf, db, s3) {
  'use strict';

  var express = require('express');
  var request = require('superagent');
  var async = require('async');
  var fs = require('fs');
  var util = require('util');
  var sanitize = require('sanitize-filename');

  var authorization,
    authTime = 0;

  // 24h
  var tokenExpiry = 24 * 60 * 60 * 1000;

  // used by auth header
  var capitaliseFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  var errorStatus = function(res) {
    if(res.statusCode >= 200 && res.statusCode <= 230) {
      return false;
    }
    return true;
  };


  var getAuthorization = function(callback) {

    // if we already have the auth token, and it's not expired
    // return that and don't make the api request
    if(((Date.now() - authTime) < tokenExpiry) && authorization) {
      return callback(authorization);
    }

    // get oauth token
    request
    .post(config.apiUrl + '/oauth/token')
    .send({
      grant_type: 'client_credentials',
      client_id: config.appId,
      client_secret: config.secret
    })
    .end(function(err, res){

      if(err) {
        return callback({
          error: err
        });
      }

      authorization = capitaliseFirstLetter(res.body.token_type) + ' ' + res.body.access_token;

      authTime = Date.now();

      return callback(authorization);
    });

  };

  var getUser = function(params, callback) {

    // check if user exists
    request
    .get(config.apiUrl + '/api/v1/users')
    .buffer(true)
    .set('Authorization', authorization)
    .end(function(err, users){

      if(err) {
        return callback({
          error: err
        });
      }

      var response = {};
      try {
        response =  JSON.parse(users.text);
      } catch(e) {
        response.message = config.errors.printchomp;
      }

      var foundUser = null;
      // find user in response._embedded.users
      response._embedded.users.every(function(user) {
        if(user.email === params.email) {
          foundUser = user;
          return false;
        }

        return true;
      });

      if(foundUser) {

        // callback existing user
        return callback(foundUser);

      } else {

        // create new user
        request
        .post(config.apiUrl + '/api/v1/users')
        .buffer(true)
        .set('Authorization', authorization)
        .send({
          'name': params.name,
          'email': params.email
        })
        .end(function(err, res){

          if(err) {
            return callback({
              error: err
            });
          }

          var response = {};
          try {
            response = JSON.parse(res.text);
          } catch(e) {
            response.message = config.errors.printchomp;
          }

          // handle errors
          if(errorStatus(res)) {
            return callback({
              error: response.message
            });
          }

          return callback(response);
        });

      }

    });

  };

  var getOffers = function(params, callback) {

    // get offers
    request
    .get(config.apiUrl + '/api/v1/offers?exclusive=true')
    .buffer(true)
    .set('Authorization', authorization)
    .end(function(err, res){

      if(err) {
        return callback({
          error: err
        });
      }

      var response = {};
      try {
        response = JSON.parse(res.text);
      } catch(e) {
        response.message = config.errors.printchomp;
      }

      // handle errors
      if(errorStatus(res)) {
        return callback({
          error: response.message
        });
      }

      callback(response._embedded);

    });

  };

  var getShipping = function(params, callback) {

    // get shipping options
    request
    .post(config.apiUrl + '/api/v1/shipping')
    .buffer(true)
    .set('Authorization', authorization)
    .send(params)
    .end(function(err, res){

      if(err) {
        return callback({
          error: err
        });
      }

      var response = {};
      try {
        response = JSON.parse(res.text);
      } catch(e) {
        response.message = config.errors.printchomp;
      }

      // handle errors
      if(errorStatus(res)) {
        return callback({
          error: response.message
        });
      }

      callback(response);

    });

  };

  var getAllUsers = function(params, callback) {

    // get offers
    request
    .get(config.apiUrl + '/api/v1/users')
    .buffer(true)
    .set('Authorization', authorization)
    .end(function(err, res){

      if(err) {
        return callback({
          error: err
        });
      }

      var response = {};
      try {
        response = JSON.parse(res.text);
      } catch(e) {
        response.message = config.errors.printchomp;
      }

      // handle errors
      if(errorStatus(res)) {
        return callback({
          error: response.message
        });
      }

      callback(response._embedded);

    });

  };

  var setOrder = function (params, callback) {

    request
    .post(config.apiUrl + '/api/v1/orders')
    .buffer(true)
    .set('Authorization', authorization)
    .send(params)
    .end(function(err, res){

      if(err) {
        return callback({
          error: err
        });
      }

      var response = {};
      try {
        response = JSON.parse(res.text);
      } catch(e) {
        response.message = config.errors.printchomp;
      }

      // handle errors
      if(errorStatus(res)) {
        return callback({
          error: response.message
        });
      }

      callback(response);

    });

  };


  // get list of all orders
  var getAllOrders = function (params, callback) {

    request
    .get(config.apiUrl + '/api/v1/orders')
    .buffer(true)
    .set('Authorization', authorization)
    .end(function(err, res){

      if(err) {
        return callback({
          error: err
        });
      }

      var response = {};
      try {
        response = JSON.parse(res.text);
      } catch(e) {
        response.message = config.errors.printchomp;
      }

      // handle errors
      if(errorStatus(res)) {
        return callback({
          error: response.message
        });
      }

      callback(response._embedded);

    });

  };

  var generatePdf = function(params, generateCallback) {

    var d = new Date();
    var uidFilename = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate() + '-' + Date.now() + '-' + params.user.email;

    // sanitize filename
    uidFilename = sanitize(uidFilename);

    async.parallel({
      pdf: function(callback) {

        pdf.generate(params.image, function(pdfBuf) {

          var pdfPath = config.pdfDir + '/' + uidFilename + '.pdf';

          // upload pdf to s3
          var req = s3.put(pdfPath, {
            'Content-Length': pdfBuf.length,
            'Content-Type': 'application/pdf'
          });

          req.on('response', function(res) {

            if(errorStatus(res)) {
              return callback(res, {});
            }

            callback(null, {
              url: req.url,
              files: [pdfPath]
            });

          });

          req.end(pdfBuf);

        });

      },
      img: function(callback) {

        // upload business card as jpeg
        var imgPath = config.pdfDir + config.imgDir + '/' + uidFilename + '.jpg';

        var imageFile = params.image.replace(/^data:image\/(jpg|jpeg|png);base64,/,'');

        imageFile = new Buffer(imageFile, 'base64');

        // upload pdf to s3
        var imgReq = s3.put(imgPath, {
          'Content-Length': imageFile.length,
          'Content-Type': 'image/jpeg'
        });

        imgReq.on('response', function(res) {

          if(errorStatus(res)) {
            return callback(res , {});
          }

          callback(null, {
            url: imgReq.url,
            files: [imgPath]
          });

        });

        imgReq.end(imageFile);

      }
    }, function(err, res) {

      if(err) {
        return generateCallback({
          error: err.statusCode
        });
      }

      generateCallback({
        url: res.pdf.url,
        pdf: res.pdf.files,
        img: res.img.files
      });

    });



  };

  var deleteFiles = function(files) {

    // delete pdf from s3
    s3.deleteMultiple(files, function(err, res){

      if(err) {
        console.log('Error deleting ', files, err);
      }

    });

  };

  var users = function(req, res, next) {

    getAuthorization(function() {

      getUser({
        email: req.query.email,
        name: req.query.name
      }, function(response) {

        if(response.error) {
          res.statusCode = 400;
        }

        res.json(response);

      });

    });

  };

  var offers = function(req, res, next) {

    getAuthorization(function() {

      getOffers({}, function(offers) {

        if(offers.error) {
          res.statusCode = 400;
        }

        res.json(offers);

      });

    });

  };

  var orders = function(req, res, next) {

    if(!req.body.user || !req.body.user.name || !req.body.user.email) {
      res.statusCode = 400;
      return res.json({
        error: 'Order must contain User with Name and Email'
      });
    }

    if(!req.body.offer || !req.body.offer.id) {
      res.statusCode = 400;
      return res.json({
        error: 'Order must contain Offer with Id'
      });
    }

    getAuthorization(function() {

      var user = util._extend({}, req.body.user);

      getUser({
        email: req.body.user.email,
        name: req.body.user.name
      }, function(user) {

        if(user.error) {
          res.statusCode = 400;
          return res.json(user);
        }

        delete req.body.user;

        req.body.customer = {};
        req.body.customer.id = user.id;

        // get image from params
        var image = req.body.image;

        // cleanup params
        delete req.body.image;

        // generate PDF
        generatePdf({
          user: user,
          image: image
        }, function(pdf) {

          if(pdf.error) {
            res.statusCode = 400;
            return res.json(pdf);
          }

          req.body.files = [];
          req.body.files.push({
            uri: pdf.url
          });

          //req.body.files.front = pdf.files.front;

          // make order request with details and PDF url
          setOrder(req.body, function(order) {

            if(order.error) {
              // delete all uploaded files to not take up space
              deleteFiles(pdf.pdf.concat(pdf.img));

              return res.status(400).json(order);
            }

            // get offer details, to save in local db
            request
            .get(config.ipAddress + ':' + config.port + '/api/v1/offers')
            .end(function(err, response){

              if(err) {
                return false;
              }

              // parse offers
              response.body.offers.some(function(offer) {

                // find current offer
                if(offer.id === req.body.offer.id) {

                  // save successful order to db
                  var orderDoc = {
                    type: 'order',
                    result: 'success',
                    user: user,
                    offer: offer,
                    shipping: req.body.shipping,
                    billing: req.body.billing.amount,
                    pdf: [ pdf ],
                    date: new Date()
                  };
                  db.insert(orderDoc);

                  return true;
                }

                return false;

              });

            });

            res.json(order);

          });

        });

      });
    });

  };

  var allUsers = function(req, res, next) {

    getAuthorization(function() {

      getAllUsers({}, function(response) {

        if(response.error) {
          res.statusCode = 400;
        }

        res.json(response);

      });

    });

  };

  var allOrders = function(req, res, next) {

    getAuthorization(function() {
      getAllOrders({}, function (response) {

        if(response.error) {
          res.statusCode = 400;
        }

        res.json(response);

      });
    });

  };

  var shipping = function(req, res, next) {

    getAuthorization(function() {

      getShipping({
        offer: req.body.offer,
        address: req.body.address
      }, function (response) {

        if(response.error) {
          res.statusCode = 400;
        }

        res.json(response);

      });

    });

  };

  return {
    users: users,
    allUsers: allUsers,
    offers: offers,
    shipping: shipping,
    orders: orders,
    allOrders: allOrders
  };

});
