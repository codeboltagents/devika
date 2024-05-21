const BaseAgent = require('../BaseAgent');

class Action extends BaseAgent {

    templatePath = `${__dirname}/prompt.handlebars`;

    validate_response(response) {
        response = response.trim().replace("```json", "```");

        if (response.startsWith("```") && response.endsWith("```")) {
            response = response.slice(3, -3).trim();
        }
        try {
            response = JSON.parse(response);
        } catch (e) { return false; }

        if (!response.hasOwnProperty("response") && !response.hasOwnProperty("action")) {
            return false;
        } else {
            return {response:response["response"],action: response["action"]};
        }
    }
}


module.exports = Action;