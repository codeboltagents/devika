/*
{
    conversation,
    code_markdown,
    system_os,
}*/
const codebolt = require('@codebolt/codeboltjs').default;
const BaseAgent = require('../BaseAgent');
const Patcher = require('./../patcher/patcher');
const ReRunner = require('./../rerunner/rerunner')
const { spawn } = require('child_process');

const { exec } = require("child_process");
// const AgentState = require("./AgentState");
// const ProjectManager = require("./ProjectManager");
// const Patcher = require("./Patcher");
const time = require("timers/promises");

class Runner extends BaseAgent {
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

        return response.commands || false;
    }
   async runCode(commands, project_path, project_name, conversation, code_markdown, system_os) {
    let retries = 0;
    let command = commands.join(" && ");
    let command_failed = false;
    let command_output = "";

    let commandResponse = await codebolt.terminal.executeCommandRunUntilError(command);
    command_output = commandResponse.response;
    command_failed = true;

    await new Promise(resolve => setTimeout(resolve, 1000));

    while (command_failed && retries < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        let valid_response = await new ReRunner().execute({
            conversation,
            code_markdown,
            system_os,
            commands: command,
            error: command_output
        });

        let action = valid_response["action"];
        codebolt.chat.sendMessage(valid_response.response);

        if (action === "command") {
            let reRunnerCommand = valid_response["command"];
            command_failed = false;

            let commandResponse = await codebolt.terminal.executeCommandRunUntilError(reRunnerCommand);
            command_failed = commandResponse.type === "commandError";
            command_output = commandResponse.response;

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (command_failed) {
                retries += 1;
            } else {
                break;
            }
        } else if (action === "patch") {
            let code = await new Patcher().execute({
                conversation,
                code_markdown,
                commands: command,
                error: command_output,
                system_os,
                project_name
            });

            new Patcher().saveCodeToProject(code, project_name);
            command_failed = false;

            let commandResponse = await codebolt.terminal.executeCommandRunUntilError(command);
            command_failed = commandResponse.type === "commandError";
            command_output = commandResponse.response;

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (command_failed) {
                retries += 1;
            } else {
                break;
            }
        }
    }
    }
// }



// async  runCode(commands, projectPath, project_name, conversation, code_markdown, system_os) {
//     let retries = 0;

//     for (let command of commands) {
//         let commandSet = command.split(" ");
//         let commandFailed = false;

//         let process = spawn(commandSet[0], commandSet.slice(1), {
//             cwd: projectPath,
//             shell: true
//         });

//         let commandOutput = '';

//         process.stdout.on('data', (data) => {
//             commandOutput += data.toString();
//         });

//         process.stderr.on('data', (data) => {
//             commandOutput += data.toString();
//         });

//         await new Promise(resolve => {
//             process.on('exit', (code) => {
//                 commandFailed = code !== 0;
//                 resolve();
//             });
//         });
//         await new Promise(resolve => setTimeout(resolve, 1000));
//         while (commandFailed && retries < 2) {

//             await new Promise(resolve => setTimeout(resolve, 1000));
//             let validResponse = await new ReRunner().execute({
//                 conversation,
//                 code_markdown,
//                 system_os,
//                 commands,
//                 error: commandOutput
//             })
//             if (!validResponse) {
//                 return false;
//             }
//             let action = validResponse.action;

//             if (action === "command") {
//                 command = validResponse.command;
//                 let response = validResponse.response;
//                 commandSet = command.split(" ");
//                 commandFailed = false;
//                 codebolt.chat.sendMessage(response)

//                 process = spawn(commandSet[0], commandSet.slice(1), {
//                     cwd: projectPath,
//                     shell: true
//                 });

//                 commandOutput = '';

//                 process.stdout.on('data', (data) => {
//                     commandOutput += data.toString();
//                 });

//                 process.stderr.on('data', (data) => {
//                     commandOutput += data.toString();
//                 });

//                 await new Promise(resolve => {
//                     process.on('exit', (code) => {
//                         commandFailed = code !== 0;
//                         resolve();
//                     });
//                 });

//                 newAgentState = {
//                     internal_monologue: "Running code...",
//                     terminal_session: {
//                         title: "Terminal",
//                         command: command,
//                         output: commandOutput
//                     }
//                 };

//                 await new Promise(resolve => setTimeout(resolve, 1000));

//                 if (commandFailed) {
//                     retries++;
//                 } else {
//                     break;
//                 }
//             } else if (action === "patch") {
//                let  response = validResponse.response;

//                codebolt.chat.sendMessage(response)
//                 let code = await new Patcher().execute({
//                     conversation: conversation,
//                     code_markdown: code_markdown,
//                     commands: commands,
//                     error: command_output,
//                     system_os: system_os,
//                     project_name: project_name
//                 });


//                 new Patcher().saveCodeToProject(code, project_name);

//                 commandSet = command.split(" ");
//                 commandFailed = false;

//                 process = spawn(commandSet[0], commandSet.slice(1), {
//                     cwd: projectPath,
//                     shell: true
//                 });

//                 commandOutput = '';

//                 process.stdout.on('data', (data) => {
//                     commandOutput += data.toString();
//                 });

//                 process.stderr.on('data', (data) => {
//                     commandOutput += data.toString();
//                 });

//                 await new Promise(resolve => {
//                     process.on('exit', (code) => {
//                         commandFailed = code !== 0;
//                         resolve();
//                     });
//                 });
//                 await new Promise(resolve => setTimeout(resolve, 1000));

//                 if (commandFailed) {
//                     retries++;
//                 } else {
//                     break;
//                 }
//             }
//         }
//     }
// }

   

    async execute(agentvars, maxtries = 5, delay = 1000) {
        let response = await this.executeAndValidate(agentvars, maxtries, delay);
        let { project_name, conversation, code_markdown, system_os } = agentvars
        this.runCode(response,"/Users/ravirawat/Desktop/testing" ,'testing', conversation, code_markdown, system_os)
        return response;
    }
}

module.exports = Runner;
