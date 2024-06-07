const BaseAgent = require('../BaseAgent');
const codebolt = require('@codebolt/codeboltjs').default;
const fs = require('fs')
class Feature extends BaseAgent{

    templatePath = `${__dirname}/prompt.handlebars`;

    validate_response(response) {
        response = response.trim();

        let start = response.indexOf("~~~") + 3;
        let end = response.lastIndexOf("~~~");
        response = response.slice(start, end).trim();
        response = response.trim();

        const result = [];
        let current_file = null;
        let current_code = [];
        let code_block = false;

        for (const line of response.split("\n")) {
            if (line.startsWith("File: ")) {
                if (current_file && current_code.length) {
                    result.push({file: current_file, code: current_code.join("\n")});
                }
                current_file = line.split("`")[1].trim();
                current_code = [];
                code_block = false;
            } else if (line.startsWith("```")) {
                code_block = !code_block;
            } else {
                current_code.push(line);
            }
        }

        if (current_file && current_code.length) {
            result.push({file: current_file, code: current_code.join("\n")});
        }

        if (result.length === 0) {
            console.log("No files found in the response.");
        }

        return result;
    }

    response_to_markdown_prompt(response) {
        response = response.map(file => `File: \`${file.file}\`:\n\`\`\`\n${file.code}\n\`\`\``).join("\n");
        return `~~~\n${response}\n~~~`;
    }
    async saveCodeToProject(response) { 
        for (const file of response) {
            await codebolt.fs.createFile(file.file,file.code,null);
        }
        // return file_path_dir;
    }
    

    // emulate_code_writing(code_set, project_name) {
    //     for (const file of code_set) {
    //         const new_state = new AgentState().new_state();
    //         new_state.internal_monologue = "Writing code...";
    //         new_state.terminal_session.title = `Editing ${file.file}`;
    //         new_state.terminal_session.command = `vim ${file.file}`;
    //         new_state.terminal_session.output = file.code;
    //         AgentState().add_to_current_state(project_name, new_state);
    //         setTimeout(() => {}, 1000);
    //     }
    // }

    // async execute(conversation, code_markdown, system_os, project_name) {
    //     const prompt = this.render(conversation, code_markdown, system_os);
    //     const response = await this.llm.inference(prompt, project_name);
        
    //     let valid_response = this.validate_response(response);
        
    //     while (!valid_response) {
    //         console.log("Invalid response from the model, trying again...");
    //         return this.execute(conversation, code_markdown, system_os, project_name);
    //     }
        
    //     this.emulate_code_writing(valid_response, project_name);

    //     return valid_response;
    // }
}

module.exports = Feature;


