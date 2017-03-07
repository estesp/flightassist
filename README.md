# flightassist
Flightassist is a Node.js example application for demonstrating and
comparing various application deployment technologies in the IBM Bluemix
public cloud.

The intent for this project, when complete, is that it will be
deployable as a Cloud Foundry application, a containerized application
using at least one factored-out microservice, and as a set of
functions deployable to OpenWhisk, the IBM Bluemix function-as-a-service
offering.

Specifically, a set of trade-offs and comparisons can be made between
these deployment models, and this application is a proving ground for
those discussions. This will be the basis for the talk given by
Lin Sun and Phil Estes at [IBM Interconnect 2017](https://www.ibm.com/cloud-computing/us/en/interconnect/)
titled [Containerize, PaaS, or Go Serverless? A Case Study in
Application Deployment Models](https://myibm.ibm.com/events/interconnect/all-sessions/session/4467A).

## Development configuration

This application relies on four distinct services; two of which are
available in the IBM [Bluemix service catalog](https://console.ng.bluemix.net/catalog/):
the [Cloudant NoSQL DB](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db/) and
The [Weather Company weather data](https://console.ng.bluemix.net/catalog/services/weather-company-data/) service. You can use the free tier
variants of both of these services and connect them to your Bluemix
hosted CF application.

An additional getting started requirement is to create the databases used
in the code in your newly created Cloudant instance. One simple way
to do this is through the Bluemix console UI. Go to your Cloudant
service and open the Cloudant UI console using the link from your
service instance page. Once at the Cloudant console you will need to
create the **trips**, **weather**, and **connections** databases for
the cacheing code to work properly.

The two non-Bluemix services used are API credentials for [TripIt](https://www.tripit.com/developer) and
[FlightStats](https://developer.flightstats.com/api-docs/).

> Note that the application uses the *Connections* API for FlightStats,
> which is only available under a 30-day trial license key, or under
> a commercial premium account with FlightStats.

To configure the non-Bluemix hosted services with your CF-hosted
application you will need to create the following environment variables
in your application runtime configuration in the Bluemix console:

 - `FLIGHTSTATS_APP_ID` : application ID assigned by FlightStats
 - `FLIGHTSTATS_APP_KEY` : application key assigned by FlightStats
 - `TRIPIT_API_KEY` : API key assigned by TripIt
 - `TRIPIT_API_SECRET` : API secret assigned by TripIt

With these variables and service bindings you should be able to run
the **flightassist** application successfully as a Cloud Foundry
hosted application.

For development/test purposes you may wish to use the `dot-env` file
provided in the root of the repository to configure several
additional variables to be able to run **flightassist** as a local
standalone Node.js application. Once you have set up the values
required in `dot-env` you can simply source it into your environment
and start the application with `node ./flightassist.js`.

## Application design/layout

The "CF mode" of the application is as a single Node.js application
on the server, providing multiple HTTP endpoints for data/API access
from a live "AJAX"/HTML5 web front-end.

The application flow starts with an Oauth2-based authentication
step against the TripIt API (see the `/authorize` handler). Since we are wanting to query a user's
set of upcoming trips, the user authorizes our application to their
TripIt data via this Oauth2 flow.

On authentication success, the callback URL provided to TripIt will
start the query of trip data at our `/flights` endpoint, beginning
by storing the access tokens in the HTTP session and accessing the
user's TripIt profile for basic user details.

At the end of the `/flights` handling the results page is rendered
which will begin the use of AJAX callbacks into the application,
which will use the stored token data in the session for further
calls to TripIt.

The first callback simply calls `/tripdata` to perform a pull of
the user's trip data from TripIt which we will post-process and 
cache into Cloudant. Because of our cache, only flight changes will
cause us to update, and a timestamp will decrease our round-trips
to TripIt to only request "updated since" content.

> TODO: We do have to add a remove trips sweep on some interval as
> the TripIt API recommendations note that trip deletion is not
> provided in the "updated since" API flow. Without this, a user
> might be shown a trip which they have already deleted in TripIt.

Our processing of TripIt data throws away all information except for 
"air segment" data, as our application only shows details related to
flights. This decreases our cacheing and resolution of updates when
round-tripping to TripIt for any recent updates.

On the client side, the `trips.js` client script will take the
results of the `/tripdata` AJAX call and fill out a results section
with either a notification that no upcoming trips were found, or
that the next trip is over 24 hours in the future. Our application
is most useful when a trip is starting soon, as it will update the
user about potential flight issues and show alternate connecting
routes between their origin and destination airports.

If the user **does have** an upcoming flight within the next 24 hours
those flights will be displayed and a series of AJAX callbacks will
begin to gather weather and flight status data for the results.
Weather data will be cached given our free tier API key will quickly
exhaust its API limits.

As results are gathered client-side from the `/weather`, `/conninfo`, and
`/flightinfo` endpoints, the results display will be updated with
this additional information for the user of the application.

### Containerized application model

The containerized deployment model for **flightassist** is still
being resolved. Most likely we will take something like the weather
service and expose it as a separate containerized microservice used
by the main application.

### FaaS application model

The OpenWhisk-based FaaS deployment/implementation of **flightassist**
is still under discussion. Most likely we can have serverless
functions backed by Cloudant for the simple data queries to weather
and flight information. This document will be updated as these
design decisions are implemented.


