/* global ConversationPanel: true */
/* eslint no-unused-vars: "off" */

// Other JS files required to be loaded first: apis.js, conversation.js
(function() {
    // Initialize all modules
    ConversationPanel.init();
})();

// this function handles responses from the Watson conversation service
// and optionally uses intents and e
function handleResponseMessage(incomingMsg) {
    var response = incomingMsg;
    for (var i = 0; i < response.intents.length; i++) {
        var intent = response.intents[i];
        var handled = false;
        switch (intent.intent) {
            case "when":
                if (intent.confidence > 0.5) {
                    response = handleWhen(response);
                    handled = true;
                } else {
                    // not enough confidence to guess "when"..ask for more
                    response.output.text = "Can you rephrase what you are looking for?";
                }
                break;
            case "alternate":
                if (intent.confidence > 0.5) {
                    response = handleAlternate(response);
                    handled = true;
                    break;
                } else {
                    // not enough confidence to guess "when"..ask for more
                    response.output.text = "Can you rephrase what you are looking for?";
                }
                break;
            case "problem":
                if (intent.confidence > 0.5) {
                    response = handleProblem(response);
                    handled = true;
                    break;
                } else {
                    // not enough confidence to guess "when"..ask for more
                    response.output.text = "Can you rephrase what you are looking for?";
                }
                break;
        }
        if (handled) {
            break;
        }
    }
    return response;
}

function handleWhen(response) {
    parseTripsForFlights(false);
    response.output.text = "I've loaded your next trip details for you.";
    return response;
}

function handleAlternate(response) {
    $('#flight-results').css("display", "none");
    $('#flight-alternates').trigger('instantiate');
    response.output.text = "I've loaded alternate flights between your origin and destination for you.";
    return response;
}

function handleProblem(response) {
    response.output.text = "I see you are having flight problems.";
    return response;
}