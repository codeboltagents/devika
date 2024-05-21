/**
 * step_by_step_plan: step_by_step_plan,
    contextual_keywords: contextual_keywords
 */
const BaseAgent = require('../BaseAgent');

class Researcher extends BaseAgent {

    templatePath = `${__dirname}/prompt.handlebars`;

    validate_response(response) {
        response = response.trim().replace("```json", "```");

        if (response.startsWith("```") && response.endsWith("```")) {
            response = response.slice(3, -3).trim();
        }
        try {
            response = JSON.parse(response);
        } catch (error) {
            return false;
        }

        response = Object.fromEntries(
            Object.entries(response).map(([k, v]) => [k.replace("\\", ""), v])
        );

        if (!("queries" in response) && !("ask_user" in response)) {
            return false;
        } else {
            return {
                "queries": response["queries"],
                "ask_user": response["ask_user"]
            };
        }
    }
    

}

module.exports = Researcher
