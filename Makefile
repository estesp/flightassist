# Simple Makefile to perform simple build/deploy steps for
# the Flightassist demo application code

.PHONY: localdeploy localctr cfdeploy bxdeploy localimage bximage swarmdeploy clean npm npmupdate

# clean only removes locally generated node modules
clean:
	rm -fR node_modules

localdeploy: node_modules npmupdate
	source .env && node ./flightassist.js

npm: package.json
	npm install

node_modules: npm

npmupdate: package.json
	npm update

cfdeploy: manifest.yml
	cf push

localimage: Dockerfile.local
	docker build -f Dockerfile.local -t flightassist:local .

bximage: Dockerfile.bmix
	docker build -f Dockerfile.bmix -t flightassist:bluemix .
	# we need to docker tag this against the bluemix registry and then docker push

localctr: localimage
	source .env && docker run --rm -p 3000:3000  \
		-e DEVMODE=$(DEVMODE) -e DEV_URL=$(DEV_URL) -e FLIGHTSTATS_APP_ID=$(FLIGHTSTATS_APP_ID) \
		-e FLIGHTSTATS_APP_KEY=$(FLIGHTSTATS_APP_KEY) -e TRIPIT_API_KEY=$(TRIPIT_API_KEY) \
		-e TRIPIT_API_SECRET=$(TRIPIT_API_SECRET) -e CLOUDANT_URL=$(CLOUDANT_URL) -e WEATHER_URL=$(WEATHER_URL) \
		-e FORCE_FLIGHT_VIEW=$(FORCE_FLIGHT_VIEW) \
		flightassist:local

# TODO: this is not quite correct as we will need to point to the user's Bluemix
# registry name of the image when performing the `docker run` against the container
# service
bxdeploy: bximage
	source .env && docker run --rm -p 3000:3000  \
		-e DEVMODE=$(DEVMODE) -e DEV_URL=$(DEV_URL) -e FLIGHTSTATS_APP_ID=$(FLIGHTSTATS_APP_ID) \
		-e FLIGHTSTATS_APP_KEY=$(FLIGHTSTATS_APP_KEY) -e TRIPIT_API_KEY=$(TRIPIT_API_KEY) \
		-e TRIPIT_API_SECRET=$(TRIPIT_API_SECRET) -e CLOUDANT_URL=$(CLOUDANT_URL) -e WEATHER_URL=$(WEATHER_URL) \
		-e FORCE_FLIGHT_VIEW=$(FORCE_FLIGHT_VIEW) \
		flightassist:bluemix
