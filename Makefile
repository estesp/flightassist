# Simple Makefile to perform simple build/deploy steps for
# the Flightassist demo application code

.PHONY: localdeploy localctr cfdeploy bxdeploy localimage bximage swarmdeploy clean npm npmupdate

BMIX_REGISTRY=registry.ng.bluemix.net
BMIX_NAMESPACE=$(shell cf ic namespace get)

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
	docker tag flightassist:bluemix $(BMIX_REGISTRY)/$(BMIX_NAMESPACE)/flightassist:latest
	docker push $(BMIX_REGISTRY)/$(BMIX_NAMESPACE)/flightassist:latest

localctr: localimage
	source .env && docker run --rm -p 3000:3000  \
		-e DEVMODE=$(DEVMODE) -e DEV_URL=$(DEV_URL) -e FLIGHTSTATS_APP_ID=$(FLIGHTSTATS_APP_ID) \
		-e FLIGHTSTATS_APP_KEY=$(FLIGHTSTATS_APP_KEY) -e TRIPIT_API_KEY=$(TRIPIT_API_KEY) \
		-e TRIPIT_API_SECRET=$(TRIPIT_API_SECRET) -e CLOUDANT_URL=$(CLOUDANT_URL) -e WEATHER_URL=$(WEATHER_URL) \
		-e FORCE_FLIGHT_VIEW=$(FORCE_FLIGHT_VIEW) -e USE_WEATHER_SERVICE=$(USE_WEATHER_SERVICE) \
		flightassist:local

bxdeploy: bximage
	source .env && docker run --rm -p 3000:3000  \
		-e DEVMODE=$(DEVMODE) -e DEV_URL=$(DEV_URL) -e FLIGHTSTATS_APP_ID=$(FLIGHTSTATS_APP_ID) \
		-e FLIGHTSTATS_APP_KEY=$(FLIGHTSTATS_APP_KEY) -e TRIPIT_API_KEY=$(TRIPIT_API_KEY) \
		-e TRIPIT_API_SECRET=$(TRIPIT_API_SECRET) -e CLOUDANT_URL=$(CLOUDANT_URL) -e WEATHER_URL=$(WEATHER_URL) \
		-e FORCE_FLIGHT_VIEW=$(FORCE_FLIGHT_VIEW) -e USE_WEATHER_SERVICE=$(USE_WEATHER_SERVICE) \
		$(BMIX_REGISTRY)/$(BMIX_NAMESPACE)/flightassist:latest
