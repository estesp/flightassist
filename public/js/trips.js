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
        var today = date.getYear()+"-"+twoDigitDayMonth(date.getMonth()+1)+"-"+twoDigitDayMonth(date.getDate()+1);

        var tripList = respData.Trips;
        if (tripList === undefined || tripList.length === 0) {
            // report to the user they have no future trips at all in TripIt
            results.innerHTML = "You have no upcoming trips in your TripIt profile!";
            return;
        }
        tripList.sort(sortTrips);
        currentTrip = findCurrentTrip(epochms, tripList);
        if (isEmpty(currentTrip)) {
            // notify the user that there are no trips at the current time
            var html = "Your next trip ("+ tripList[0].display_name+" to "+ tripList[0].primary_location +") ";
            html += "starts on "+ tripList[0].start_date +" and is more than 24 hours in the future. ";
            html += "Please check back within 24 hours of your first flight for further details.";
            results.innerHTML = html;
            return;
        }
        upcomingFlights = findFlights(epochms, currentTrip);
        if (upcomingFlights.length === 0) {
            // no flights to show; give the user a few trip details and how
            // long until the first flight?
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

function findFlights(today, jsonTrip) {
    // we have a trip object; look through the air segments for flights today (or next 24 hrs)
    var flightSegments = jsonTrip.air_segments.Segment;
    // we need the air segments to be in sorted by flight start time order
    flightSegments.sort(sortFlightSegments);

    var upcomingFlights = [];
    var lastFlightEnd = 0;
    var originAirport = "";
    var currentTerminus = "";
    for (var i = 0; i < flightSegments.length; i++) {
        var flightStartDate = Date.parse(flightSegments[i].StartDateTime.date);
        if (isSoonOrWithin(today, flightStartDate, Date.now()) && (originAirport === "")) {
            // flight is coming up in next 24 hours; this is the first segment found
            upcomingFlights = [flightSegments[i]];
            if (originAirport === "") {
                originAirport = flightSegments[i].start_airport_code;
            }
            currentTerminus = flightSegments[i].end_airport_code;
            var endDateObj = flightSegments[i].EndDateTime;
            var dateStr = endDateObj.date+"T"+endDateObj.time+endDateObj.utc_offset;
            lastFlightEnd = Date.parse(dateStr);
        } else {
            // if we already have found a flight, see if another flight starts in
            // 12 hours or less from the current (last found) aiport code and not 
            // ending at the original airport code..then we probably have a
            // connecting flight, filtering out quick round-trips (back to origin same day)
            var startDateTime = flightSegments[i].StartDateTime;
            var flightStartTime = Date.parse(startDateTime.date+"T"+startDateTime.time+startDateTime.utc_offset);
            if ((currentTerminus !== "") && (lastFlightEnd > 0)) {
                if (lessThanTwelve(lastFlightEnd, flightStartTime) &&
                 (currentTerminus === flightSegments[i].start_airport_code) &&
                 (flightSegments[i].end_airport_code !== originAirport)) {
                     //this appears to be a connecting flight to the first flight
                     currentTerminus = flightSegments[i].end_airport_code;
                     var endDateTime = flightSegments[i].EndDateTime;
                     lastFlightEnd = Date.parse(endDateTime.date+"T"+endDateTime.time+endDateTime.utc_offset);
                     upcomingFlights.push(flightSegments[i]);
                }
            }
        }
    }
}

function sortFlightSegments(a, b) {
    var datetimeA = Date.parse(a.StartDateTime.date+"T"+a.StartDateTime.time+a.StartDateTime.utc_offset);
    var datetimeB = Date.parse(b.StartDateTime.date+"T"+b.StartDateTime.time+b.StartDateTime.utc_offset);
    return datetimeA - datetimeB;
}

function sortTrips(a, b) {
    return Date.parse(a.start_date) - Date.parse(b.start_date);
}

function lessThanTwelve(flightEnd, flightStart) {
    if ((flightStart - flightEnd) <= 12*60*60*1000) {
        return true;
    }
    return false;
}
//returns whether today is within a day of a start date or prior/equal to end
function isSoonOrWithin(today, start, end) {
    if (((start - today) <= 24*60*60*1000) && ((end - today) >= 0)) {
        return true;
    }
    return false;
}

// run our trip info query as soon as we have page load
if(window.attachEvent) {
    window.attachEvent('onload', parseTripsForFlights);
} else {
    if(window.onload) {
        var curronload = window.onload;
        var newonload = function(evt) {
            curronload(evt);
            parseTripsForFlights(evt);
        };
        window.onload = newonload;
    } else {
        window.onload = parseTripsForFlights;
    }
}

function twoDigitDayMonth(number) {
    var str = ""+number;
    if (str.length === 1) {
        str = "0"+str;
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
            } catch (e2) {
            }
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