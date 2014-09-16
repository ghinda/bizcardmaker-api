/* Offer tests
 */

/*jshint expr: true*/
'use strict';

var should = require('should'),
  request = require('supertest'),
  app = require('../server'),
  config = require('../config/config'),
  agent = request.agent(app);

var mock = {};

describe('GET /api/v1/offers', function () {

  var offersResponse = {};

  it('should respond with json', function (done) {

    agent
    .get('/api/v1/offers')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(function(err, res) {
      offersResponse = JSON.parse(res.text);
      done();
    });

  });

  it('should respond with list of offers', function (done) {

    offersResponse.offers.should.not.be.empty;
    done();

  });

  it('should have data in all offers', function (done) {

    offersResponse.offers.forEach(function(offer) {
      should.exist(offer.id);
      should.exist(offer.product_name);
      should.exist(offer.title);
      should.exist(offer.description);
    });

    done();

  });

});
