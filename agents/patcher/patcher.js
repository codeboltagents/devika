/*
conversation,
code_markdown,
commands,
error,
system_os
*/

const BaseAgent = require('../BaseAgent');

const codebolt = require('@codebolt/codeboltjs').default;
class Patcher extends BaseAgent{

    templatePath = `${__dirname}/prompt.handlebars`;

    validate_response(response) {
        response = response.trim();
        let start = response.indexOf("~~~") + 3;
        let end = response.lastIndexOf("~~~");
        response = response.slice(start, end).trim();
        response = response.trim();
        let result = [];
        let current_file = null;
        let current_code = [];
        let code_block = false;

        for (let line of response.split("\n")) {
            if (line.startsWith("File: ")) {
                if (current_file && current_code.length) {
                    result.push({"file": current_file, "code": current_code.join("\n")});
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
            result.push({"file": current_file, "code": current_code.join("\n")});
        }

        return result;
    }
    async saveCodeToProject(response) { 
        for (const file of response) {
            await codebolt.fs.createFile(file.file,file.code,null);
        }
        // return file_path_dir;
    }
}

module.exports = Patcher;
