const BaseAgent = require('../BaseAgent');

class Answer extends BaseAgent {
    
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

        if (!response.hasOwnProperty("response")) {
            return false;
        } else {
            return response["response"];
        }
    }
}

module.exports = Answer;