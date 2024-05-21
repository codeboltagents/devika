/*
conversation: conversation,
code_markdown: code_markdown
*/

const BaseAgent = require('../BaseAgent');
class Reporter extends BaseAgent {
    templatePath = `${__dirname}/prompt.handlebars`;
    

    validate_response(response) {
        response = response.trim().replace("```md", "```");
        
        if (response.startsWith("```") && response.endsWith("```")) {
            response = response.slice(3, -3).trim();
        }
 
        return response;
    }
}

module.exports = Reporter;
