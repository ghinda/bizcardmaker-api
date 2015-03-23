/* Address Validation using the google maps api
 */

module.exports = (function(config, db) {
  'use strict';

  var request = require('superagent');
  
  var formatOrderAddress = function(address) {
    
    // we assume the address is a string
    var formattedAddress = address;
    
    // if address is in order object format
    if(typeof address === 'object') {

      // format street address for gapi
      // street 1 + street 2 +,+ city +,+ state + postcode +,+ country
      formattedAddress = '';
      formattedAddress += address.street;

      if(address.street2) {
        formattedAddress += ' ' + address.street2;
      }

      formattedAddress += ', ';

      formattedAddress += address.city + ', ';
      formattedAddress += address.region + ' ';
      formattedAddress += address.postal_code + ', ';

      formattedAddress += address.country;
      
    }
    
    return formattedAddress;
    
  };
  
  var parseSuggestedAddress = function(address) {
    
    var parsedAddress = {
      street: '',
      street2: '',
      city: '',
      region: '',
      postal_code: '',
      country: ''      
    };
    
    address.address_components.forEach(function(component) {
      
      if(component.types.indexOf('street_number') !== -1) {
        parsedAddress.street = component.long_name;
      }
      
      if(component.types.indexOf('route') !== -1) {
        parsedAddress.street += ' ' + component.long_name;
      }
      
      if(component.types.indexOf('locality') !== -1) {
        parsedAddress.city = component.long_name;
      }
      
      if(component.types.indexOf('administrative_area_level_1') !== -1) {
        parsedAddress.region = component.short_name;
      }
      
      if(component.types.indexOf('postal_code') !== -1) {
        parsedAddress.postal_code = component.long_name;
      }
      
      if(component.types.indexOf('country') !== -1) {
        parsedAddress.country = component.long_name;
      }
      
      
    });
    
    return parsedAddress;
    
  };

  var validateAddress = function(req, res, next) {

    var addressObject = req.body.address;
    var addressString = formatOrderAddress(req.body.address); 
    
    // lowercase address for comparison
    var lowercaseAddress = addressString.toLowerCase();
    
    request
    .get('https://maps.googleapis.com/maps/api/geocode/json')
    .query({
      key: config.googleKey,
      address: addressString
    })
    .end(function(err, gres) {

      var suggestions = [];

      // check if one of the results matches the exact address
      gres.body.results.every(function(result) {

        if(result.formatted_address.toLowerCase() === lowercaseAddress) {
          // we found the exact address
          return false;
        }

        suggestions.push(result);
        return true;

      });

      if(suggestions.length) {
        
        // parse suggestions in our format
        suggestions.forEach(function(suggestion, index) {
          suggestions[index] = parseSuggestedAddress(suggestion);
        });

        // add initially used address to suggestions
        // just in the case the suggestions are not ok.
        suggestions.push(addressObject);

        res
        .status(200)
        .json({
          suggestions: suggestions
        });

      } else {

        res
        .status(200)
        .json({});
        
      }

    });
    
  };

  return {
    validateAddress: validateAddress
  };

});
