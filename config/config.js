/* config
 */

module.exports = (function() {
  'use strict';

  var fs = require('fs');

  // api configs
  var config = {

    // printchomp
    apiUrl: 'https://sandbox.printchomp.com',

    // card details
    card: [ 3.75, 2.25 ],
    margin: 0.35,
    trim: 0.125,
    density: '600',

    // app folders
    dataDir: process.env.OPENSHIFT_DATA_DIR || process.cwd() + '/data',
    publicDir: '/public',
    pdfDir: '/pdf-test',
    imgDir: '/images',
    dbDir: '/db',

    ghostscript: 'ghostscript',

    errors: {
      printchomp: 'Something went wrong with Printchomp. Please try again later.'
    }
  };

  // read admin user credentials
  config.admin = JSON.parse(fs.readFileSync(config.dataDir + '/private/admin-config.json'));

  // read mailchimp api details
  config.mailchimp = JSON.parse(fs.readFileSync(config.dataDir + '/private/mailchimp-config.json'));

  // read aws credentials
  config.aws = JSON.parse(fs.readFileSync(config.dataDir + '/private/aws-config.json'));

  // read printchomp credentials
  var printchompConfig = JSON.parse(fs.readFileSync(config.dataDir + '/private/printchomp-config.json'));

  config.appId = printchompConfig.appId;
  config.secret = printchompConfig.secret;

  // read google credentials
  var googleConfig = JSON.parse(fs.readFileSync(config.dataDir + '/private/google-config.json'));

  config.googleKey = googleConfig.key;

  // dev config
  if(process.env.OPENSHIFT_APP_NAME === 'dev') {

  }

  // live config
  if(process.env.OPENSHIFT_APP_NAME === 'live') {
    config.apiUrl = 'https://www.printchomp.com';
    config.pdfDir = '/pdf';
  }

  if(process.env.OPENSHIFT_APP_NAME) {
    config.ghostscript = process.env.OPENSHIFT_DATA_DIR + '/ghostscript-9.14-linux-x86_64/gs-914-linux_x86_64';
  }

  //  ip and port
  config.ipAddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
  config.port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

  return config;

}());
