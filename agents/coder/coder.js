const BaseAgent = require('../BaseAgent');
const codebolt = require('@codebolt/codeboltjs').default;

class Coder extends BaseAgent{
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

        return result;
    }

    // async execute(agentvars, maxtries = 5, delay = 1000) {
    //     let response = await this.executeAndValidate(agentvars, maxtries, delay);
    //     if (response) {
    //         this.emulate_code_writing(response);
    //     }
    //     return response;
    // }

    async save_code_to_project(response) { 
        for (const file of response) {
            await codebolt.fs.createFile(file.file,file.code,null);
        }
        // return file_path_dir;
    }

    async get_project_path() {
        let appState=  await codebolt.cbstate.getApplicationState(); 
        console.log(appState.state.projectState)
        return appState.state.projectState.projectPath
    }
    // response_to_markdown_prompt(response) {
    //     response = response.map(file => `File: \`${file['file']}\`:\n\`\`\`\n${file['code']}\n\`\`\``).join("\n");
    //     return `~~~\n${response}\n~~~`;
    // }


    response_to_markdown_prompt(response) {
        response = response.map(file => `File: \`${file.file}\`:\n\`\`\`\n${file.code}\n\`\`\``).join('\n');
        return `~~~\n${response}\n~~~`;
    }
    
    
    

    // async emulate_code_writing(code_set, project_name) {
    //     for (const current_file of code_set) {
    //         const file = current_file.file;
    //         const code = current_file.code;

    //         // const current_state = new AgentState().get_latest_state(project_name);
    //         // const new_state = new AgentState().new_state();
    //         new_state.browser_session = current_state.browser_session; // keep the browser session
    //         new_state.internal_monologue = "Writing code...";
    //         new_state.terminal_session.title = `Editing ${file}`;
    //         new_state.terminal_session.command = `vim ${file}`;
    //         new_state.terminal_session.output = code;
    //         // new AgentState().add_to_current_state(project_name, new_state);
    //         await new Promise(resolve => setTimeout(resolve, 2000));
    //     }
    // }

    // async execute(step_by_step_plan, user_context, search_results, project_name) {
    //     const prompt = this.render(step_by_step_plan, user_context, search_results);
    //     const response = await this.llm.inference(prompt, project_name);
        
    //     let valid_response = this.validate_response(response);
        
    //     while (!valid_response) {
    //         console.log("Invalid response from the model, trying again...");
    //         return await this.execute(step_by_step_plan, user_context, search_results, project_name);
    //     }
        
    //     console.log(valid_response);
        
    //     await this.emulate_code_writing(valid_response, project_name);

    //     return valid_response;
    // }
}


module.exports = Coder;