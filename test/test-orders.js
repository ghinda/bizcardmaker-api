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
//mock.order2.validate_address = true;
mock.order2.shipping.address = {
  street: '1200 E University Blvd',
  street2: '',
  city: 'Tucson',
  region: 'AZ',
  country: 'United States',
  postal_code: '85721'
};

mock.order3 = JSON.parse(JSON.stringify(mock.order));
//mock.order3.validate_address = true;
mock.order3.shipping.address = {
  street: '100 MAIN ST',
  street2: 'PO BOX 1022',
  city: 'SEATTLE',
  region: 'WA',
  country: 'United States',
  postal_code: '98104'
};

mock.order4 = JSON.parse(JSON.stringify(mock.order));
//mock.order4.validate_address = true;
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
      
      var shippingResponse = JSON.parse(res.text);
      
      if(shippingResponse.error) {
        console.log(shippingResponse, order.shipping);
        
        err = shippingResponse.error;
      }
      
      if(shippingResponse.ambiguos_address) {
        err = shippingResponse;
      }
      
      if(err) {
        done(err);
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
  
  var suggestionOrders = [ 
    mock.order2,
    mock.order3
  ];
  
  suggestionOrders.forEach(function(order) {
    
    it('should get address suggestions for the ' + order.shipping.address.city + ' order', function(done) {
    
      agent
      .post('/api/v1/validate-address')
      .send(order.shipping)
      .expect(400)
      .expect('Content-Type', /application\/json/)
      .end(function(err, res) {

        res.body.suggestions.should.not.be.empty;
        
        order.shipping.address = res.body.suggestions[0];

        done();

      });
      
    });
    
    it('should get the shipping rates for the ' + order.shipping.address.city + ' order', function(done) {
      
      console.log(order.shipping.address);
      
      getShippingRates(order, function(err, res) {
        
        console.log(err, res);
        
        res.rates.should.not.be.empty;
        
        done();
        
      });
      
    });
    
  });
  
  // we don't get suggestions for the it because the address is exact
  it('should not get address suggestions for the ' + mock.order4.shipping.address.city + ' order', function(done) {
    
      agent
      .post('/api/v1/validate-address')
      .send(mock.order4.shipping)
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .end(function(err, res) {

        done();

      });
      
    });

  it('should respond with json from order without address validation and shipping excluded', function (done) {

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

  it('should accept the order without address validation', function (done) {

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

  it('should accept an order with a validated exact address', function (done) {

    agent
    .post('/api/v1/orders')
    .send(mock.order4)
    .end(function(err, res) {

      var result = JSON.parse(res.text);

      result.status.should.equal('Accepted');

      done();

    });

  });
    
  it('should accept the order with shipping included', function (done) {

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
