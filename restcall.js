// restcall.js - module for handling REST API calls

// METHOD == GET
exports.get = function(options, secure, callbackFn) {

  var httpcall = require(secure ? 'https' : 'http');

  var req = httpcall.request(options, function(res) {
    res.setEncoding('utf-8');
    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });

    res.on('end', function() {
      var responseObject = JSON.parse(responseString);
      callbackFn(responseObject);
    });
  });

  req.write(""); //method == GET, no data
  req.end();

};
