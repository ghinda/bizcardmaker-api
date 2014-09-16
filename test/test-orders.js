/* Orders tests
 */

/*jshint expr: true*/
'use strict';

var should = require('should'),
  request = require('supertest'),
  app = require('../server'),
  config = require('../config/config'),
  agent = request.agent(app);

var fs = require('fs');
var pdf = require('../app/controllers/pdf.js')(config);

var mock = {};
mock.order = {
  billing: {
    name: 'John Doe',
    phone: '15192223333',
    address: {
      street: '104 Mayes Ave',
      street2: '',
      city: 'Springfield',
      region: 'KY',
      country: 'United States',
      postal_code: '40069'
    },
    credit_card: {
      number: 4030000010001234,
      verification: 123,
      expiry: {
        month: 6,
        year: 2016
      }
    }
  },
  shipping:  {
    name: 'John Doe',
    phone: '15192223333',
    address: {
      street: '104 Mayes Ave',
      street2: '',
      city: 'Springfield',
      region: 'KY',
      country: 'United States',
      postal_code: '40069'
    }
  }
};

mock.order.user = {
  email: 'test@bizcardmaker.com',
  name: 'Test'
};

// get the b64 image from a text file
mock.order.image = fs.readFileSync('./test/b64img.txt').toString();

var orderResponse = {};

var testPdfGeneration = function() {

  pdf.generate(mock.order.image, function(pdfBuf) {
    // write buffer to file
    fs.writeFileSync('./test/output.pdf', pdfBuf);
  });

};

describe('POST /api/v1/orders', function () {

  before(function(done) {

    agent
    .get('/api/v1/offers')
    .end(function(err, res) {

      var result = JSON.parse(res.text);

      var offer;

      // find and offer with shipping shipping
      // TODO also test shipping not included
      result.offers.every(function(off) {
        if(off.amount.shipping_included) {
          offer = off;
          return false;
        }

        return true;
      });

      mock.order.offer = {};
      mock.order.offer.id = offer.id;
      mock.order.billing.amount = offer.amount;

      mock.order2 = JSON.parse(JSON.stringify(mock.order));
      mock.order2.validate_address = true;
      mock.order2.shipping.address = {
        street: '795 E DRAGRAM',
        street2: '',
        city: 'TUCSON',
        region: 'AZ',
        country: 'United States',
        postal_code: '85705'
      };

      mock.order3 = JSON.parse(JSON.stringify(mock.order));
      mock.order3.validate_address = true;
      mock.order3.shipping.address = {
        street: '100 MAIN ST',
        street2: 'PO BOX 1022',
        city: 'SEATTLE',
        region: 'WA',
        country: 'United States',
        postal_code: '98104'
      };

      mock.order4 = JSON.parse(JSON.stringify(mock.order));
      mock.order4.validate_address = true;
      mock.order4.shipping.address = {
        street: '901 Logan Avenue',
        street2: '',
        city: 'Winnipeg',
        region: 'MB',
        country: 'Canada',
        postal_code: 'R3E 1N7'
      };

      done();

    });

  });

  // TODO tests with offers that include shipping
  // and for ones that don't
  // that get shipping rates from POST /shipping

  it('should respond with json from order without address validation', function (done) {

    agent
    .post('/api/v1/orders')
    .send(mock.order)
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(function(err, res) {

      orderResponse = JSON.parse(res.text);

      done();

    });

  });

  it('order without address validation should be accepted', function (done) {

    orderResponse.status.should.equal('Accepted');

    done();

  });

  it('should return suggestions for address validation', function (done) {

    agent
    .post('/api/v1/orders')
    .send(mock.order2)
    .end(function(err, res) {

      var result = JSON.parse(res.text);

      result.addressError.suggestions.should.not.be.empty;

      done();

    });

  });

  it('should return suggestions for address validation', function (done) {

    agent
    .post('/api/v1/orders')
    .send(mock.order3)
    .end(function(err, res) {

      var result = JSON.parse(res.text);

      result.addressError.suggestions.should.not.be.empty;

      done();

    });

  });

  it('should make successful order with validated exact address', function (done) {

    agent
    .post('/api/v1/orders')
    .send(mock.order4)
    .end(function(err, res) {

      var result = JSON.parse(res.text);

      result.status.should.equal('Accepted');

      done();

    });

  });

// 	it('should respond with list of shipping options', function (done) {
//
// 		agent
// 		.post('/api/v1/shipping')
// 		.send(mock.shipping)
// 		.end(function(err, res) {
//
// 			var result = JSON.parse(res.text);
//
// 			result.rates.should.not.be.empty;
//
// 			done();
//
// 		});
//
// 	});
//
// 	it('should have data in all shipping options', function (done) {
//
// 		agent
// 		.post('/api/v1/shipping')
// 		.send(mock.shipping)
// 		.end(function(err, res) {
//
// 			var result = JSON.parse(res.text);
//
// 			result.rates.forEach(function(rate) {
// 				should.exist(rate.carrier);
// 				should.exist(rate.service_name);
// 				should.exist(rate.service_code);
// 				should.exist(rate.price);
// 				should.exist(rate.currency);
// 			});
//
// 			done();
//
// 		});
//
// 	});

  // generate the pdf for manual checking
  testPdfGeneration();

});
