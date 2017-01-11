/* Retrieve data from FlightStats API */

var FlightStatsAPI = require("flightstats");

var flightstats = new FlightStatsAPI({
    appId: process.env.FLIGHTSTATS_APP_ID,
    apiKey: process.env.FLIGHTSTATS_APP_KEY
});

module.exports = {
    getFlightInfo: function(flightID) {
        // retrieve flight
    },
    getConnections: function(origin, destination) {
        // get connecting flights
    }
};