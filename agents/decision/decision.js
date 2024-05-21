const BaseAgent = require('../BaseAgent');


class Decision extends BaseAgent{

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
        
        for (let item of response) {
            if (!item.hasOwnProperty("function") || !item.hasOwnProperty("args") || !item.hasOwnProperty("reply")) {
                return false;
            }
        }
        return response;
    }
}

module.exports = Decision;