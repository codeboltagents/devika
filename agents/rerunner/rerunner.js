/*
{
    conversation,
    code_markdown,
    system_os,
    commands,
    error,
}*/
const BaseAgent = require('../BaseAgent');


class Runner extends BaseAgent {
    templatePath = `${__dirname}/prompt.handlebars`;

        
    validate_response(response) {
        response = response.trim().replace("```json", "```");
        
        if (response.startsWith("```") && response.endsWith("```")) {
            response = response.slice(3, -3).trim();
        }
    
        console.log(response);
    
        try {
            response = JSON.parse(response);
        } catch (_) {
            return false;
        }
        
        console.log(response);

        return response.action && response.response ? response : false;
    }

   
}


module.exports = Runner;
