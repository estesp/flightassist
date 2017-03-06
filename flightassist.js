/* jshint node:true */

/**
 * Module dependencies.
 */
var express = require('express'),
    routes = require('./routes'),
    tripdata = require('./routes/tripdata.js'),
    session = require("express-session"),
    http = require('http'),
    path = require('path'),
    tripit = require('./tripit.js'),
    flightstats = require('./flightstats.js'),
    weather = require('./weather.js');
var app = express();

// if deploying to a different route, update this variable:
var baseURL = "http://flightassist.mybluemix.net/";
if (process.env.DEVMODE === "true") {
    baseURL = process.env.DEV_URL;
}

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'wilson dog ball' }));

app.get('/', routes.index);

app.get("/authorize", function(req, res) {
    tripit.authorize(baseURL + "flights", req.query.mobile, res);
});

app.get("/flights", function(req, res) {
    var respData = {};
    // will store the access tokens in the session
    tripit.getAccessTokens(req).then(function(results) {
        req.session.oauth_access_token = results[0];
        req.session.oauth_access_token_secret = results[1];
        var accessToken = results[0];
        var accessTokenSecret = results[1];
        console.log("acquired OATH access tokens");

        // access TripIt trip data using our authenticated access information
        console.log("Request profile data for the authenticated TripIt user..");
        tripit.getProfileData(accessToken, accessTokenSecret).then(function(results) {
            var profile = JSON.parse(results[0]);
            respData.name = profile.Profile.screen_name;
            respData.company = profile.Profile.company;
            respData.photo = profile.Profile.photo_url;
            respData.home = profile.Profile.home_city;
            console.log("Received profile info for " + respData.name + ". Rendering response..");
            req.session.user = respData.name;
            res.render("trips", respData);
        }, function(error) {
            console.log(error);
            respData.message = "Could not retrieve TripIt profile, error: " + error.data;
            respData.no_data = "error";
            res.render("trips", respData);
        });
    }, function(error) {
        console.log("Error getting authorization tokens: " + error.data);
        respData.message = "OAUTH login to TripIt failed with: " + error.data;
        respData.no_data = "error";
        res.render("trips", respData);
        return;
    });
});

// wrap all AJAX-used methods to do an XHR check to limit use from outside of
// our application:
app.use("/i/\*", function(req, res, next) {
    if (req.xhr === true) {
        next();
    } else {
        // reject API calls not from our application
        console.log("Non-Xhr request to API from: " + req.hostname + " (IP: " + req.ip + ")\nHeaders: " +
            "%j\nQuery: %j", req.headers, req.query);
        res.status(403).send("API access forbidden.");
    }
});

// called via AJAX method to query user's trip data; return current flights
app.get("/i/tripdata", tripdata.getFlights);

// endpoints for flightstats API lookups:
app.get("/i/flightinfo", flightstats.getFlightInfo);
app.get("/i/conninfo", flightstats.getConnections);

// weather endpoint
app.get("/i/weather", weather.getThreeDayForecast);

http.createServer(app).listen(app.get('port'), function() {
    console.log('FlightAssist server listening on port ' + app.get('port'));
});