/* Shipping tests
 */

/*jshint expr: true*/
'use strict';

var should = require('should'),
  request = require('supertest'),
  app = require('../server'),
  config = require('../config/config'),
  agent = request.agent(app);

var mock = {};

mock.shipping = {
  offer: {},
  address: {
    street: '123 Main St.',
    street2: '',
    city: 'Springfield',
    region: 'KY',
    country: 'United States',
    postal_code: '40069'
  }
};

describe('POST /api/v1/shipping', function () {

  before(function(done) {

    agent
    .get('/api/v1/offers')
    .end(function(err, res) {

      var result = JSON.parse(res.text);

      mock.shipping.offer.id = result.offers[0].id;

      done();

    });

  });

  var shippingResponse = {};

  it('should respond with json', function (done) {

    agent
    .post('/api/v1/shipping')
    .send(mock.shipping)
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(function(err, res) {
      shippingResponse = JSON.parse(res.text);
      done();
    });

  });

  it('should respond with list of shipping options', function (done) {

    shippingResponse.rates.should.not.be.empty;
    done();

  });

  it('should have data in all shipping options', function (done) {

    shippingResponse.rates.forEach(function(rate) {
      should.exist(rate.carrier);
      should.exist(rate.service_name);
      should.exist(rate.service_code);
      should.exist(rate.price);
      should.exist(rate.currency);
    });

    done();

  });

});
