/* Retrieve data from FlightStats API */

var FlightStatsAPI = require("flightstats");

var flightstats = new FlightStatsAPI({
    appId: process.env.FLIGHTSTATS_APP_ID,
    apiKey: process.env.FLIGHTSTATS_APP_KEY
});

module.exports = {
    // requires input in the query string:
    // - date = YYYY-MM-DD (departure date)
    // - airline = fs code (e.g. AA = American Airlines)
    // - flightnum = flight number
    // - airport = arrival airport code (e.g. SFO)
    getFlightInfo: function(req, resp) {
        // retrieve flight
        var opts = {
            date: new Date(Date.parse(req.query.date)),
            airlineCode: req.query.airline,
            flightNumber: req.query.flightnum,
            airport: req.query.airport,
        };
        flightstats.lookup(opts, function(err, data) {
            if (err) {
                console.log("error looking up flight status: " + err);
                resp.send(err);
                return;
            }
            console.log("flight lookup response: " + data);
            resp.send(data);
        });
    },
    getConnections: function(req, resp) {
        // get connecting flights options
        // requires the following in the query string:
        // - date = YYYY-MM-DD HH:MM:SS (time to start search)
        // - depairport = departing airport code (e.g. CHO)
        // - arrairport = arrival airport code (e.g. SFO)
        // - numhours = number of hours to search from start
        // - results = number of results to return
        var opts = {
            date: new Date(Date.parse(req.query.date)),
            departureAirport: req.query.depairport,
            arrivalAirport: req.query.arrairport,
            numHours: req.query.numhours,
            maxResults: req.query.results,
        };
        flightstats.firstFlightOut(opts, function(err, data) {
            if (err) {
                console.log("error looking up flight connections: " + err);
                resp.send(err);
                return;
            }
            console.log("flight connections response: " + data);
            resp.send(data);
        });
    }
};