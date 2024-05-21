const BaseAgent = require('../BaseAgent');


class InternalMonologue extends BaseAgent{

    templatePath = `${__dirname}/prompt.handlebars`;

    validate_response(response) {
        response = response.trim().replace("```json", "```");
        
        if (response.startsWith("```") && response.endsWith("```")) {
            response = response.slice(3, -3).trim();
        }
 
        try {
            response = JSON.parse(response);
        } catch (_) {
            return false;
        }
        
        response = Object.fromEntries(
            Object.entries(response).map(([k, v]) => [k.replace("\\", ""), v])
        );

        if (!response.hasOwnProperty("internal_monologue")) {
            return false;
        } else {
            return response["internal_monologue"];
        }
    }
}

module.exports = InternalMonologue;
