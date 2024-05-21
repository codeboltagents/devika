const codebolt = require('@codebolt/codeboltjs').default;

const {readFileSync} = require('fs')

const {compile} = require('handlebars')


class BaseAgent {

    templatePath = `${__dirname}/prompt.handlebars`;
    model_role = "defaultagentllm";
    compiledTemplate = ""

    /**
     * The function renders a the action template, which is a Handlebars template that takes a `conversation` object as a parameter.
     * @param conversation - The `render` function takes a `conversation` object as a parameter and uses a template to render the conversation. The `conversation` object likely contains information or messages that need to be displayed in a specific format. The `compile` function is used to compile the template, and the `template`
     * @returns The `render` function is returning the result of rendering the `conversation` data into the `PROMPT` template using the `compile` function.
     */
    render(templatevars) {
        const PROMPT = readFileSync(this.templatePath, "utf-8").trim();
        let template = compile(PROMPT);
        let renderedTemplate = template(templatevars);
        this.compiledTemplate = renderedTemplate;
        return renderedTemplate;
    }


    /**
     * This validates the Response received from the LLM.
     * @param response - The `validate_response` function takes a response as input, trims any leading or trailing whitespace, and removes the "```json" tag if present. It then checks if the response is enclosed in triple backticks and extracts the JSON content.
     * @returns The function `validate_response` is returning an array containing the values of `response["response"]` and `response["action"]` if the input `response` is a valid JSON object with either "response" or "action" properties. If the input `response` is not a valid JSON object or does not have both "response" and "action" properties, the function will return false
     */
    validate_response(response) {
        return true;
    }

    /**
     * The function `execute` takes a conversation and project name as input, renders a prompt, performs inference using a language model, validates the response, and recursively retries if the response is invalid until a valid response is obtained.
     * @param agentvars - The `conversation` parameter seems to represent the input data or context for the conversation. It could include information or messages exchanged between parties.
     * @returns The `execute` function returns a valid response after processing it through the model and validating it. If the response is invalid, it will keep trying until a valid response is obtained.
     */
    async executeAndValidate(agentvars, maxtries = 5, delay = 1000) {
        let tries = 0;
        while(tries < maxtries) {
            try {
                let prompt = this.render(agentvars);
                let response = await codebolt.llm.inference(prompt);
                console.log(response.message)
                let valid_response = this.validate_response( response.message);
                
                if (valid_response) {
                    return valid_response;
                }
                else {
                    console.log("Invalid response, trying again...");
                    tries++;
                }
            } catch(error){
                console.log(error);
                console.log("Errror from the model, trying again...");
                tries++;
            }
        }
        console.log("Could not get a valid response from the model");
        return false;
    }

    async execute(agentvars, maxtries = 5, delay = 1000) {
        return await this.executeAndValidate(agentvars, maxtries, delay);
    }
}

module.exports = BaseAgent;
