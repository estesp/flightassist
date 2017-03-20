// retrieve and cache weather data

var Cloudant = require('cloudant'),
    fs = require('fs');

// cloudant & weather co. credentials URL
var cURL = "";
var weatherURL = "";
if (process.env.DEVMODE === "true") {
    if (process.env.DEPLOY === "swarm") {
        cURL = global.cloudant_url;
        weatherURL = global.weather_url;
    } else {
        cURL = process.env.CLOUDANT_URL;
        weatherURL = process.env.WEATHER_URL;
    }
} else if (process.env.DEPLOY === "kubernetes"){
    console.log("kubernetes deploy mode is detected")
    var binding = JSON.parse(fs.readFileSync('/opt/service-bind/binding', 'utf8'));
    cURL = binding.url
} else {
    var vcap_services = JSON.parse(process.env.VCAP_SERVICES);
    cURL = vcap_services.cloudantNoSQLDB[0].credentials.url;
    weatherURL = vcap_services.weatherinsights[0].credentials.url;
}

var cloudant = Cloudant({ url: cURL, plugin: 'promises' });

module.exports = {
    // requires input in the query string:
    // - lat = location latitude
    // - lon = location longitude
    // - locID = airport code representing this location (for cache key)
    getThreeDayForecast: function(req, resp) {
        // retrieve forecast from either cache; or
        // if cache is "expired", re-query from weather co. API

        // Look up cache..
        getCachedData(req.query.locID).then(function(data) {
            var now = Date.now();
            if ((now - data.cachetime) > 10 * 60 * 1000) {
                // data older than 10 minutes; don't use cache
                console.log("Expiring cached weather data for " + req.query.locID);
                data.expired = true;
            }
            return data;
        }).catch(function(err) {
            console.log("[getCachedWeatherData] Cloudant lookup error/empty: " + err);
        }).then(function(data) {
            if (!isEmpty(data) && !data.expired) {
                // use cached weather data
                console.log("using cached weather data for " + req.query.locID);
                resp.send(data);
                return;
            }
            var restcall = require('./restcall.js');
            var url = require('url');
            var host = "";
            var endpoint = "";

            if (process.env.USE_WEATHER_SERVICE !== "true") {
                var wURLObj = url.parse(weatherURL);
                host = wURLObj.host;
                var authStr = wURLObj.auth;
                //build up weather 3day query (GET /v1/geocode/{latitude}/{longitude}/forecast/daily/3day.json)
                var endpoint = "/api/weather/v1/geocode/" + req.query.lat + "/" + req.query.lon + "/forecast/daily/3day.json";

                var options = {
                    host: host,
                    path: endpoint,
                    method: "GET",
                    auth: authStr,
                    rejectUnauthorized: false
                };

                //send the request to the Weather API
                restcall.get(options, true, function(newData) {
                    // cache this data in cloudant with the current epoch ms
                    var currentEpochms = Date.now();
                    newData.cachetime = currentEpochms;
                    if (!isEmpty(data)) {
                        //set the rev ID so cache update works
                        newData._rev = data._rev;
                    }
                    newData._id = req.query.locID;
                    cacheWeatherData(newData);
                    // send data as response:
                    console.log("sending JSON weather response for " + req.query.locID);
                    resp.send(newData);
                });
            } else {
                console.log("use weather service: " + process.env.USE_WEATHER_SERVICE);
                // overwrite host, endpoint to point to our weather microservice
                if (process.env.DEVMODE === "true" && process.env.DEPLOY !== "swarm") {
                    host = "localhost";
                } else {
                    host = "weather-service";
                }
                endpoint = "/weather/" + req.query.lat + "/" + req.query.lon;

                options = {
                    host: host,
                    port: 5000,
                    path: endpoint,
                    method: "GET",
                    rejectUnauthorized: false
                };

                //send the request to the Weather API
                restcall.get(options, false, function(newData) {
                    // cache this data in cloudant with the current epoch ms
                    var currentEpochms = Date.now();
                    newData.cachetime = currentEpochms;
                    if (!isEmpty(data)) {
                        //set the rev ID so cache update works
                        newData._rev = data._rev;
                    }
                    newData._id = req.query.locID;
                    cacheWeatherData(newData);
                    // send data as response:
                    console.log("sending JSON weather response for " + req.query.locID);
                    resp.send(newData);
                });
            }
        });
    }
};

function getCachedData(location) {
    // query cloudant to see if we have cached any weather for this location
    var weatherDB = cloudant.db.use("weather");
    return weatherDB.get(location);
}

function cacheWeatherData(weatherData) {
    var weatherDB = cloudant.db.use("weather");
    weatherDB.insert(weatherData, function(err, data) {
        if (err) {
            console.log("Error on weather DB insert: " + err);
        }
    });
}

function isEmpty(obj) {
    if (obj === undefined) {
        return true;
    }
    return Object.keys(obj).length === 0;
}
