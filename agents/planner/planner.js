const codebolt = require('@codebolt/codeboltjs').default;


/* prompt */

const BaseAgent = require('../BaseAgent');
class Planner extends BaseAgent {
    templatePath = `${__dirname}/prompt.handlebars`;

   async raw_execute(agentvars){
        let prompt = this.render(agentvars);
        let response = await codebolt.llm.inference(prompt);
        return response.message
    }
    
    validate_response(response) {
        let result = {
            "project": "",
            "reply": "",
            "focus": "",
            "plans": {},
            "summary": ""
        }

        let current_section = null;
        let current_step = null;

        for (let line of response.split("\n")) {
            line = line.trim();

            if (line.startsWith("Project Name:")) {
                current_section = "project";
                result["project"] = line.split(":", 2)[1].trim();            
            } else if (line.startsWith("Your Reply to the Human Prompter:")) {
                current_section = "reply";
                result["reply"] = line.split(":", 2)[1].trim();
            } else if (line.startsWith("Current Focus:")) {
                current_section = "focus";
                result["focus"] = line.split(":", 2)[1].trim();
            } else if (line.startsWith("Plan:")) {
                current_section = "plans";
            } else if (line.startsWith("Summary:")) {
                current_section = "summary";
                result["summary"] = line.split(":", 2)[1].trim();
            } else if (current_section === "reply") {
                result["reply"] += " " + line;
            } else if (current_section === "focus") {
                result["focus"] += " " + line;
            } else if (current_section === "plans") {
                if (line.startsWith("- [ ] Step")) {
                    current_step = line.split(":")[0].trim().split(" ").pop();
                    result["plans"][parseInt(current_step)] = line.split(":", 2)[1].trim();
                } else if (current_step) {
                    result["plans"][parseInt(current_step)] += " " + line;
                }
            } else if (current_section === "summary") {
                result["summary"] += " " + line.replace("```", "");
            }
        }

        result["project"] = result["project"].trim();
        result["reply"] = result["reply"].trim();
        result["focus"] = result["focus"].trim();
        result["summary"] = result["summary"].trim();

        return result;    
    }


}

module.exports=Planner
