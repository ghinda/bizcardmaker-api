/* migrate db order format to include shipping and billing details
 * on older orders.
 */

var request = require('superagent');
var config = require('./config/config.js');

var Datastore = require('nedb');
var db = new Datastore({
  filename: config.dataDir + config.dbDir + '/bizcardmaker.db',
  autoload: true
});

request
.get('https://live-bizcardmaker.rhcloud.com/api/v1/allorders')
.auth(config.admin.user, config.admin.password)
.end(function(err, res) {

  var serverOrders = {};
  
  res.body.orders.forEach(function(o) {
    serverOrders[o.customer.id] = o;
  });
  
  db.find({
    type: 'order'
  })
  .exec(function (err, orders) {

    orders.forEach(function(localOrder) {
      
      if(!localOrder.billing) {
        var serverOrder = serverOrders[localOrder.user.id];
        
        localOrder.billing = {
          price:serverOrder.total,
          markup:0,
          subtotal:serverOrder.total,
          tax1:0,
          tax2:0,
          shipping:0,
          total:serverOrder.total,
          currency:serverOrder.currency,
          shipping_included:true
        };
      }
      
      db.update({ _id: localOrder._id }, localOrder);
      
    });

  });

});

