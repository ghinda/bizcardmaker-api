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
  shipping: {
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

mock.order2 = JSON.parse(JSON.stringify(mock.order));
mock.order2.shipping.address = {
  street: '1200 E University Blvd',
  street2: '',
  city: 'Tucson',
  region: 'AZ',
  country: 'United States',
  postal_code: '85721'
};

mock.order3 = JSON.parse(JSON.stringify(mock.order));
mock.order3.shipping.address = {
  street: '100 MAIN ST',
  street2: 'PO BOX 1022',
  city: 'SEATTLE',
  region: 'WA',
  country: 'United States',
  postal_code: '98104'
};

mock.order4 = JSON.parse(JSON.stringify(mock.order));
mock.order4.shipping.address = {
  street: '901 Logan Avenue',
  street2: '',
  city: 'Winnipeg',
  region: 'MB',
  country: 'Canada',
  postal_code: 'R3E 1N7'
};

mock.order5 = JSON.parse(JSON.stringify(mock.order));

var offers = [];
var offerWithShipping;
var offerWithoutShipping;

var orderResponse = {};

var testPdfGeneration = function() {

  pdf.generate(mock.order.image, function(pdfBuf) {
    // write buffer to file
    fs.writeFileSync('./test/output.pdf', pdfBuf);
  });

};

var getShippingRates = function(order, done) {
  
  done = done || function(){};
  
  if(!order.offer.amount.shipping_included) {
    
    agent
    .post('/api/v1/shipping')
    .send({
      offer: order.offer,
      address: order.shipping.address
    })
    .end(function(err, res) {
      
      var shippingResponse = res.body;
      
      if(shippingResponse.error) {
        // TODO ?! the error property is a string
        err = JSON.parse(shippingResponse.error);
      }
      
      if(err) {
        return done(err);
      }
      
      var rate = shippingResponse.rates[0];
      
      order.shipping.rate = {
        carrier: rate.carrier,
        service_code: rate.service_code
      };

      order.billing.amount.shipping = rate.price;
      order.billing.amount.total += rate.price;

      // set shipping_included=true
      // because we manually calculated the shipping and total prices
      order.billing.amount.shipping_included = true;
      
      done(null, shippingResponse);
      
    });
    
  } else {
    
    done();
    
  }
  
};

describe('POST /api/v1/orders', function () {

  before(function(done) {

    agent
    .get('/api/v1/offers')
    .end(function(err, res) {

      var result = JSON.parse(res.text);

      offers = result.offers;

      // find offers with and without shipping included
      offers.some(function(offer) {
        
        if(offer.amount.shipping_included) {
          offerWithShipping = offer;
        } else {
          offerWithoutShipping = offer;
        }
        
        if(offerWithShipping && offerWithoutShipping) {
          return true;
        }

        return false;
      });
      
      var mainOffer = offerWithoutShipping || offerWithShipping;

      Object.keys(mock).forEach(function(key) {
        
        mock[key].offer = JSON.parse(JSON.stringify(mainOffer));
        mock[key].billing.amount = mainOffer.amount;
        
      });
      
      var secondOffer = offerWithShipping || offerWithoutShipping;
      
      mock.order5.offer = secondOffer;
      mock.order5.billing.amount = secondOffer.amount;

      done();

    });

  });
  
  it('should get the shipping rates for the ' + mock.order.shipping.address.city + ' order', function(done) {
    
    getShippingRates(mock.order, function(err, res) {
      
      res.rates.should.not.be.empty;
      
      done();
      
    });
    
  });
  
  it('should get address candidates for the ' + mock.order2.shipping.address.city + ' order', function(done) {
    
    getShippingRates(mock.order2, function(err, res) {
      
      var candidate = err.candidates[0];
      
      mock.order2.shipping.address.street = candidate.address;
      
      mock.order2.shipping.address.postal_code = candidate.zipcode;
      
      err.candidates.should.not.be.empty;
      
      done();
      
    });
    
  });
  
  it('should get shipping rates for the ' + mock.order2.shipping.address.city + ' order', function(done) {
    
    getShippingRates(mock.order2, function(err, res) {
      
      console.log('err=', err);
      console.log('res=', res);
      console.log(mock.order2.shipping.address);
      
      res.rates.should.not.be.empty;
      
      done();
      
    });
    
  });

  it('should accept the ' + mock.order.shipping.address.city + ' order', function (done) {

    agent
    .post('/api/v1/orders')
    .send(mock.order)
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(function(err, res) {
      
      res.status.should.equal('Accepted');

      done();

    });

  });

  it('should accept the ' + mock.order4.shipping.address.city + 'order', function (done) {

    agent
    .post('/api/v1/orders')
    .send(mock.order4)
    .end(function(err, res) {

      var result = JSON.parse(res.text);

      result.status.should.equal('Accepted');

      done();

    });

  });
    
  it('should accept the ' + mock.order5.shipping.address.city + ' order', function (done) {

    agent
    .post('/api/v1/orders')
    .send(mock.order5)
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(function(err, res) {

      done();

    });

  });

  // generate the pdf for manual checking
  testPdfGeneration();

});
