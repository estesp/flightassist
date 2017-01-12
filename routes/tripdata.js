var tripit = require('../tripit.js');

// GET flight data from TripIt (or cached in Cloudant)
exports.getFlights = function(req, res) {
    if (req.session.oauth_access_token === "") {
        res.redirect("/authorize");
        return;
    }
    var user = req.session.user;
    var authToken = req.session.oauth_access_token;
    var authTokenSecret = req.session.oauth_access_token_secret;
    tripit.getTrips(user, authToken, authTokenSecret).then(function(data) {
        console.log("Returning TripIt trip/flight data for user " + user);
        res.send(data);
    }).catch(function(err) {
        console.log("Error retriving trip data: " + err);
        res.send(err);
    });
};