/* Users tests
 */

/*jshint expr: true*/
'use strict';

var should = require('should'),
  request = require('supertest'),
  app = require('../server'),
  config = require('../config/config'),
  agent = request.agent(app);

var mock = {};

// existing user
mock.user = {
  email: 'test@bizcardmaker.com',
  name: 'Test'
};

// new user
mock.userNew = {
  email: 'test+' + Date.now() + '@bizcardmaker.com',
  name: 'User ' + Date.now()
};

describe('GET /api/v1/users', function () {

  describe('Missing details', function () {

    var userResponse = {};

    it('should respond with error status', function (done) {

      agent
      .get('/api/v1/users')
      .expect(400)
      .expect('Content-Type', /application\/json/)
      .end(function(err, res) {

        userResponse = JSON.parse(res.text);

        done();

      });

    });

    it('should respond with error message', function (done) {

      should.exist(userResponse.error);
      done();

    });

  });

  describe('Existing user', function () {

    var userResponse = {};

    it('should respond with json', function (done) {

      agent
      .get('/api/v1/users')
      .query(mock.user)
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .end(function(err, res) {

        userResponse = JSON.parse(res.text);

        done();

      });

    });

    it('should contain one user', function (done) {

      should.exist(userResponse.id);

      userResponse.email.should.equal(mock.user.email);
      userResponse.name.should.equal(mock.user.name);

      done();

    });

  });

  describe('New user', function () {

    var userResponse = {};

    it('should respond with json', function (done) {

      agent
      .get('/api/v1/users')
      .query(mock.userNew)
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .end(function(err, res) {

        userResponse = JSON.parse(res.text);
        done();

      });

    });

    it('should contain the new user', function (done) {

      should.exist(userResponse.id);

      userResponse.email.should.equal(mock.userNew.email);
      userResponse.name.should.equal(mock.userNew.name);

      done();

    });

  });

});
