// javascript to handle getting trip data and showing possible flights
// and alternatives

function parseTripsForFlights() {
    // notify searching
    document.getElementById('throbber-div-1').style.display = 'block';
    document.getElementById('flight-results').style.display = 'none';
    // first we need trip data..
    ajaxCall("/tripdata", "GET", function(respData) {
        var results = document.getElementById('flight-results');
        results.style.display = 'block';
        document.getElementById('throbber-div-1').style.display = 'none';
        var epochms = Date.now();
        var date = new Date(epochms);
        var today = date.getFullYear() + "-" + twoDigitString(date.getMonth() + 1) + "-" + twoDigitString(date.getDate() + 1);

        var tripList = respData.Trips;
        if (tripList === undefined || tripList.length === 0) {
            // report to the user they have no future trips at all in TripIt
            results.innerHTML = "You have no upcoming trips in your TripIt profile!";
            return;
        }
        tripList.sort(sortTrips);
        var forceFlightView = (respData.forceFlights === 1);
        var currentTrip = findCurrentTrip(epochms, tripList);
        if (isEmpty(currentTrip) && !forceFlightView) {
            // notify the user that there are no trips at the current time
            var html = "Your next trip (" + tripList[0].display_name + " to " + tripList[0].primary_location + ") ";
            html += "starts on " + tripList[0].start_date + " and is more than 24 hours in the future. ";
            html += "Please check back within 24 hours of your first flight for further details.";
            results.innerHTML = html;
            return;
        }
        // developer mode way to test viewing flights even if the next trip
        // is further than 24 hours in the future
        if (forceFlightView) {
            // we've sorted the trips and we know the list isn't empty, so
            // just point to the first trip in the list
            currentTrip = tripList[0];
        }
        upcomingFlights = findFlights(epochms, currentTrip, forceFlightView);
        if (upcomingFlights.length === 0) {
            // no flights to show; give the user a few trip details and how
            // long until the first flight?
            var htmlResp = "Your trip (" + tripList[0].display_name + ") to " + tripList[0].primary_location + " is coming soon, but either you ";
            htmlResp += "have no flights associated with this trip or they are more than 24 hours ";
            htmlResp += " in the future. If you have flights, check back when your first segment ";
            htmlResp += " is 24 hours or less away.";
            results.innerHTML = htmlResp;
            return;
        } else {
            // display flight information
            // - data set includes
            //   .start_city_name
            //   .start_country_code
            //   .start_airport_code
            //   .end_city_name
            //   .end_country_code
            //   .end_airport_code
            //   .marketing_airline_code .marketing_flight_number (e.g. AA 5344 together)
            //   .aircraft_display_name ("Canadair RJ 900")
            //   .duration
            //   .seats (may not exist)
            //   .start_gate (may not exist)
            //   .end_gate (may not exist)
            //   .StartDateTime.{date, time, timezone, utc_offset}
            //   .EndDateTime.{date, time, timezone, utc_offset}
            var flightResults = { searchResults: upcomingFlights };
            var resultsStart = "<div class='resultsHeader'>Upcoming flights for your trip <span class='tripName'>" + tripList[0].display_name + "</span> to <span class='tripDestination'>" + tripList[0].primary_location + "</span> are listed below:</div>" +
                "<div class='resultsContainer'>";

            var resultsTmpl = "{{#searchResults}}\n" +
                "<div class='flightid'>{{marketing_airline_code}} {{marketing_flight_number}} <span class='flighttime'>{{duration}}</span></div>" +
                "<div class='flightresults'><table id='{{marketing_airline_code}}{{marketing_flight_number}}'>" +
                "<tr class='airport'><td class='airportDetails'><div class='airportCode'>{{start_airport_code}}</div><br/><span class='airportLoc'>{{start_city_name}}, {{start_country_code}}</span></td>" +
                "<td class='flightInfo'>" +
                "<div class='flightTime'><span class='fieldTitle'>Departs:</span> {{StartDateTime.date}} {{StartDateTime.time}}</div><br/>" +
                "<div class='gateInfo'><span class='fieldTitle'>Gate:</span> {{start_gate}}</div></td></tr>" +
                "<tr class='airport'><td class='airportDetails'><div class='airportCode'>{{end_airport_code}}</div><br/><span class='airportLoc'>{{end_city_name}}, {{end_country_code}}</span></td>" +
                "<td class='flightInfo'>" +
                "<div class='flightTime'><span class='fieldTitle'>Arrives:</span> {{EndDateTime.date}} {{EndDateTime.time}}</div><br/>" +
                "<div class='gateInfo'><span class='fieldTitle'>Gate:</span> {{end_gate}}</div></td></tr></table>" +
                "<div class='flightstatInfo' id='flightstats:{{marketing_airline_code}}:{{marketing_flight_number}}:{{StartDateTime.date}}:{{start_airport_code}}:{{end_airport_code}}'></div>" +
                "<div class='weatherInfo' id='weather:{{marketing_airline_code}}:{{marketing_flight_number}}:{{start_airport_code}}:{{start_airport_latitude}}:{{start_airport_longitude}}:{{end_airport_code}}:{{end_airport_latitude}}:{{end_airport_longitude}}'></div>" +
                "</div>\n" +
                "{{/searchResults}}";

            var htmlOut = Mustache.render(resultsTmpl, flightResults);
            results.innerHTML = resultsStart + htmlOut + "</div>";
            // trigger a custom event to fill in weather and flight status info
            $('div.flightstatInfo').trigger('instantiate');
            $('div.weatherInfo').trigger('instantiate');
        }
    });
}

function findCurrentTrip(today, tripList) {
    for (var i = 0; i < tripList.length; i++) {
        var tripStart = Date.parse(tripList[i].start_date);
        var tripEnd = Date.parse(tripList[i].end_date);
        if (isSoonOrWithin(today, tripStart, tripEnd)) {
            return tripList[i];
        }
    }
    return {};
}

function findFlights(today, jsonTrip, forceFlightView) {
    // we have a trip object; look through the air segments for flights today (or next 24 hrs)
    var flightSegments = [];
    for (var n = 0; n < jsonTrip.air_segments.length; n++) {
        flightSegments = flightSegments.concat(jsonTrip.air_segments[n].Segment);
    }
    // we need the air segments to be in sorted by flight start time order
    flightSegments.sort(sortFlightSegments);

    var now = Date.now();
    // force current time offset to be at the beginning flight segment
    // so in development mode we can test the flight view
    if (forceFlightView) {
        today = Date.parse(makeDateTimeString(flightSegments[0].StartDateTime));
        now = today + 1;
    }
    var upcomingFlights = [];
    var lastFlightEnd = 0;
    var originAirport = "";
    var currentTerminus = "";
    for (var i = 0; i < flightSegments.length; i++) {
        var flightStartDate = Date.parse(makeDateTimeString(flightSegments[i].StartDateTime));
        if (isSoonOrWithin(today, flightStartDate, now) && (originAirport === "")) {
            // flight is coming up in next 24 hours; this is the first segment found
            upcomingFlights = [flightSegments[i]];
            if (originAirport === "") {
                originAirport = flightSegments[i].start_airport_code;
            }
            currentTerminus = flightSegments[i].end_airport_code;
            lastFlightEnd = Date.parse(makeDateTimeString(flightSegments[i].EndDateTime));
        } else {
            // if we already have found a flight, see if another flight starts in
            // 12 hours or less from the current (last found) aiport code and not 
            // ending at the original airport code..then we probably have a
            // connecting flight, filtering out quick round-trips (back to origin same day)
            var flightStartTime = Date.parse(makeDateTimeString(flightSegments[i].StartDateTime));
            if ((currentTerminus !== "") && (lastFlightEnd > 0)) {
                if (lessThanTwelve(lastFlightEnd, flightStartTime) &&
                    (currentTerminus === flightSegments[i].start_airport_code) &&
                    (flightSegments[i].end_airport_code !== originAirport)) {
                    //this appears to be a connecting flight to the first flight
                    currentTerminus = flightSegments[i].end_airport_code;
                    lastFlightEnd = Date.parse(makeDateTimeString(flightSegments[i].EndDateTime));
                    upcomingFlights.push(flightSegments[i]);
                }
            }
        }
    }
    return upcomingFlights;
}

function sortFlightSegments(a, b) {
    var datetimeA = Date.parse(makeDateTimeString(a.StartDateTime));
    var datetimeB = Date.parse(makeDateTimeString(b.StartDateTime));
    return datetimeA - datetimeB;
}

function makeDateTimeString(tripitDateTimeObj) {
    return tripitDateTimeObj.date + "T" + tripitDateTimeObj.time + tripitDateTimeObj.utc_offset;
}

function sortTrips(a, b) {
    return Date.parse(a.start_date) - Date.parse(b.start_date);
}

function lessThanTwelve(flightEnd, flightStart) {
    if ((flightStart - flightEnd) <= 12 * 60 * 60 * 1000) {
        return true;
    }
    return false;
}
//returns whether today is within a day of a start date or prior/equal to end
function isSoonOrWithin(today, start, end) {
    if (((start - today) <= 24 * 60 * 60 * 1000) && ((end - today) >= 0)) {
        return true;
    }
    return false;
}

$(document).ready(function() {
    // set up handlers to load weather and flight info
    $('#flight-results').on("instantiate", 'div.flightstatInfo', function(e) {
        // ID format = 'flightstats:AA:nnnn:date:BBB:CCC' where
        //   AA   = airline shortcode
        //   nnnn = flight number
        //   date = flight depart date as "YYYY-MM-DD"
        //   BBB  = origin airport code
        //   CCC  = destination airport code
        var infoArray = this.id.split(":");
        var idStatus = "fstatus-" + infoArray[0] + "-" + infoArray[1] + "-" + infoArray[5];
        $(this).append("<div id='" + idStatus + "' class='statusDetail'></div>");
        $(this).css("display", "block");
        var divID = this.id;
        var qURL = "/flightinfo?airline=" + infoArray[1] + "&flightnum=" + infoArray[2] + "&date=" + infoArray[3] +
            "&airport=" + infoArray[5]; // default lookup direction is "arriving" so put destination airport
        ajaxCall(qURL, "GET", function(respData) {
            // call flightstats endpoint and fill in current known flight status
            var flightStatus = "unknown";
            var flightEquipment = "unknown equipment";
            var flight = infoArray[1] + infoArray[2];
            if (!isEmpty(respData.flights)) {
                flightStatus = respData.flights[0].status.description;
                flightEquipment = respData.flights[0].equipment.scheduled.name;
            }
            $('#' + idStatus).html("<span class='flightStatsStatus'>" +
                flight + " Status:</span> " + flightStatus + " on equipment: " + flightEquipment);
        });
    });

    $('#flight-results').on("instantiate", 'div.weatherInfo', function(e) {
        // ID format = 'weather:AA:nnnn:BBB:lat:lon:CCC:lat:lon' where
        //   AA   = airline shortcode
        //   nnnn = flight number
        //   BBB  = origin airport code + latitude and longitude
        //   CCC  = destination airport code + latitude and longitude
        var infoArray = this.id.split(":");
        // get weather for the origin and destination cities from our API
        var idOrigin = "weather" + infoArray[3] + "-" + infoArray[1] + infoArray[2];
        $(this).append("<div id='" + idOrigin + "' class='weatherData'></div>");
        var idDest = "weather" + infoArray[6] + "-" + infoArray[1] + infoArray[2];
        $(this).append("<div id='" + idDest + "' class='weatherData'></div>");
        $(this).css("display", "block");

        var origURL = "/weather?locID=" + infoArray[3] + "&lat=" + infoArray[4] + "&lon=" + infoArray[5];
        var destURL = "/weather?locID=" + infoArray[6] + "&lat=" + infoArray[7] + "&lon=" + infoArray[8];
        showCityWeatherInfo(origURL, infoArray[3], idOrigin);
        showCityWeatherInfo(destURL, infoArray[6], idDest);
    });

    //begin parse routine for flight data
    parseTripsForFlights();
});

// helper function for displaying weather data in a specific DIV for an airport city code
function showCityWeatherInfo(url, cityCode, divID) {
    ajaxCall(url, "GET", function(respData) {
        // call weather endpoint and fill in "narrative" response into div
        for (var i = 0; i < respData.forecasts.length; i++) {
            if (respData.forecasts[i].num == 1) {
                if (!isEmpty(respData.forecasts[i].day)) {
                    $('#' + divID).html("<span class='weatherCity'>" +
                        cityCode + "</span> " + respData.forecasts[i].day.narrative);
                } else {
                    $('#' + divID).html("<span class='weatherCity'>" +
                        cityCode + "</span> " + respData.forecasts[i].night.narrative);
                }
            }
        }
    });
}

function twoDigitString(number) {
    var str = "" + number;
    if (str.length === 1) {
        str = "0" + str;
    }
    return str;
}

function createXHR() {
    if (typeof XMLHttpRequest != 'undefined') {
        return new XMLHttpRequest();
    } else {
        try {
            return new ActiveXObject('Msxml2.XMLHTTP');
        } catch (e1) {
            try {
                return new ActiveXObject('Microsoft.XMLHTTP');
            } catch (e2) {}
        }
    }
    return null;
}

function ajaxCall(url, method, resultFn) {
    var xhr = createXHR();

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            resultFn(JSON.parse(xhr.responseText));
        }
    };
    xhr.open(method, url, true);
    xhr.send(null);
}

function isEmpty(obj) {
    if (obj === undefined) {
        return true;
    }
    return Object.keys(obj).length === 0;
}