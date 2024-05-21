const Planner = require('./planner');
const Researcher = require('./researcher');
const Formatter = require('./formatter');
const Coder = require('./coder');
const Action = require('./action');
const InternalMonologue = require('./internal_monologue');
const Answer = require('./answer');
const Runner = require('./runner');
const Feature = require('./feature');
const Patcher = require('./patcher');
const Reporter = require('./reporter');
const Decision = require('./decision');

const ProjectManager = require('./src/project');
const AgentState = require('./src/state');
const Logger = require('./src/logger');

const { SentenceBert } = require('./src/bert/sentence');
const KnowledgeBase = require('./src/memory');
const {  GoogleSearch } = require('./src/browser/search');
const Browser = require('./src/browser');
const { startInteraction } = require('./src/browser');
const ReadCode = require('./src/filesystem');
const { Netlify } = require('./src/services');
const { PDF } = require('./src/documenter/pdf');

const tiktoken = require('tiktoken');
const json = require('json');
const platform = require('platform');
const EventEmitter = require('events');

const emitAgent = require('./src/socket_instance').emit_agent;

class Agent extends EventEmitter {
    constructor(baseModel, searchEngine, browser = null) {
        super();
        if (!baseModel) {
            throw new Error("base_model is required");
        }

        this.logger = new Logger();

        this.collectedContextKeywords = [];

        this.planner = new Planner({ baseModel });
        this.researcher = new Researcher({ baseModel });
        this.formatter = new Formatter({ baseModel });
        this.coder = new Coder({ baseModel });
        this.action = new Action({ baseModel });
        this.internalMonologue = new InternalMonologue({ baseModel });
        this.answer = new Answer({ baseModel });
        this.runner = new Runner({ baseModel });
        this.feature = new Feature({ baseModel });
        this.patcher = new Patcher({ baseModel });
        this.reporter = new Reporter({ baseModel });
        this.decision = new Decision({ baseModel });

        this.projectManager = new ProjectManager();
        this.agentState = new AgentState();
        this.engine = searchEngine;
        this.tokenizer = tiktoken.get_encoding("cl100k_base");
    }

    async openPage(projectName, url) {
        const browser = await Browser.start();

        await browser.goTo(url);
        const [_, raw] = await browser.screenshot(projectName);
        const data = await browser.extractText();
        await browser.close();

        return { browser, raw, data };
    }

    async searchQueries(queries, projectName) {
        const results = {};

        const knowledgeBase = new KnowledgeBase();

        let webSearch;
        switch (this.engine) {
            case "bing":
                webSearch = new BingSearch();
                break;
            case "google":
                webSearch = new GoogleSearch();
                break;
            default:
                webSearch = new DuckDuckGoSearch();
        }

        this.logger.info(`\nSearch Engine :: ${this.engine}`);

        for (const query of queries) {
            const lowerCaseQuery = query.trim().toLowerCase();

            const loop = new EventEmitter();
            setImmediate(async () => {
                loop.emit('start');
            });

            loop.on('start', async () => {
                webSearch.search(lowerCaseQuery);

                const link = webSearch.getFirstLink();
                console.log("\nLink :: ", link, '\n');
                if (!link) {
                    return;
                }
                const { browser, raw, data } = await this.openPage(projectName, link);
                emitAgent("screenshot", { "data": raw, "project_name": projectName }, false);
                results[lowerCaseQuery] = this.formatter.execute(data, projectName);

                this.logger.info(`got the search results for : ${lowerCaseQuery}`);
            });
        }
        return results;
    }

    updateContextualKeywords(sentence) {
        const keywords = new SentenceBert(sentence).extractKeywords();
        for (const keyword of keywords) {
            this.collectedContextKeywords.push(keyword[0]);
        }

        return this.collectedContextKeywords;
    }

    makeDecision(prompt, projectName) {
        const decision = this.decision.execute(prompt, projectName);

        for (const item of decision) {
            const { function: func, args, reply } = item;

            this.projectManager.addMessageFromDevika(projectName, reply);

            switch (func) {
                case "git_clone":
                    const { url } = args;
                    // Implement git clone functionality here
                    break;

                case "generate_pdf_document":
                    const { user_prompt } = args;
                    // Call the reporter agent to generate the PDF document
                    const markdown = this.reporter.execute([user_prompt], "", projectName);
                    const outPdfFile = new PDF().markdownToPdf(markdown, projectName);

                    const projectUrl = encodeURIComponent(projectName);
                    const pdfDownloadUrl = `http://127.0.0.1:1337/api/download-project-pdf?project_name=${projectUrl}`;
                    const response = `I have generated the PDF document. You can download it from here: ${pdfDownloadUrl}`;

                    // this.openPage(projectName, pdfDownloadUrl);

                    this.projectManager.addMessageFromDevika(projectName, response);
                    break;

                case "browser_interaction":
                    const { user_prompt: userPrompt } = args;
                    // Call the interaction agent to interact with the browser
                    startInteraction(this.baseModel, userPrompt, projectName);
                    break;

                case "coding_project":
                    const { user_prompt: userPromptCoding } = args;
                    // Call the planner, researcher, coder agents in sequence
                    const plan = this.planner.execute(userPromptCoding, projectName);
                    const plannerResponse = this.planner.parseResponse(plan);

                    const research = this.researcher.execute(plan, this.collectedContextKeywords, projectName);
                    const searchResults = this.searchQueries(research.queries, projectName);

                    const code = this.coder.execute({
                        stepByStepPlan: plan,
                        userContext: research.ask_user,
                        searchResults,
                        projectName
                    });
                    this.coder.saveCodeToProject(code, projectName);
                    break;
            }
        }
    }

    subsequentExecute(prompt, projectName) {
        const newMessage = this.projectManager.newMessage();
        newMessage.message = prompt;
        newMessage.fromDevika = false;
        this.projectManager.addMessageFromUser(projectName, newMessage.message);

        const osSystem = platform.platform();

        this.agentState.setAgentActive(projectName, true);

        const conversation = this.projectManager.getAllMessagesFormatted(projectName);
        const codeMarkdown = ReadCode(projectName).codeSetToMarkdown();

        const [response, action] = this.action.execute(conversation, projectName);

        this.projectManager.addMessageFromDevika(projectName, response);

        console.log("\naction :: ", action, '\n');

        switch (action) {
            case "answer":
                const answerResponse = this.answer.execute({
                    conversation,
                    codeMarkdown,
                    projectName
                });
                this.projectManager.addMessageFromDevika(projectName, answerResponse);
                break;

            case "run":
                const projectPath = this.projectManager.getProjectPath(projectName);
                this.runner.execute({
                    conversation,
                    codeMarkdown,
                    osSystem,
                    projectPath,
                    projectName
                });
                break;

            case "deploy":
                const deployMetadata = Netlify.deploy(projectName);
                const deployUrl = deployMetadata.deploy_url;

                const deployResponse = {
                    message: "Done! I deployed your project on Netlify.",
                    deploy_url: deployUrl
                };
                this.projectManager.addMessageFromDevika(projectName, JSON.stringify(deployResponse, null, 4));
                break;

            case "feature":
                const featureCode = this.feature.execute({
                    conversation,
                    codeMarkdown,
                    systemOs: osSystem,
                    projectName
                });
                console.log("\nfeature code :: ", featureCode, '\n');
                this.feature.saveCodeToProject(featureCode, projectName);
                break;

            case "bug":
                const bugCode = this.patcher.execute({
                    conversation,
                    codeMarkdown,
                    commands: null,
                    error: prompt,
                    systemOs: osSystem,
                    projectName
                });
                console.log("\nbug code :: ", bugCode, '\n');
                this.patcher.saveCodeToProject(bugCode, projectName);
                break;

            case "report":
                const reportMarkdown = this.reporter.execute(conversation, codeMarkdown, projectName);

                const outPdfFile = new PDF().markdownToPdf(reportMarkdown, projectName);

                const projectNameSpaceUrl = encodeURIComponent(projectName);
                const pdfDownloadUrl = `http://127.0.0.1:1337/api/download-project-pdf?project_name=${projectNameSpaceUrl}`;
                const reportResponse = `I have generated the PDF document. You can download it from here: ${pdfDownloadUrl}`;

                // this.openPage(projectName, pdfDownloadUrl);

                this.projectManager.addMessageFromDevika(projectName, reportResponse);
                break;
        }

        this.agentState.setAgentActive(projectName, false);
        this.agentState.setAgentCompleted(projectName, true);
    }

    execute(prompt, projectName) {
        if (projectName) {
            this.projectManager.addMessageFromUser(projectName, prompt);
        }

        this.agentState.createState({ project: projectName });

        const plan = this.planner.execute(prompt, projectName);
        console.log("\nplan :: ", plan, '\n');

        const plannerResponse = this.planner.parseResponse(plan);
        const { reply, focus, plans, summary } = plannerResponse;

        this.projectManager.addMessageFromDevika(projectName, reply);
        this.projectManager.addMessageFromDevika(projectName, JSON.stringify(plans, null, 4));
        // this.projectManager.addMessageFromDevika(projectName, `In summary: ${summary}`);

        this.updateContextualKeywords(focus);
        console.log("\ncontext_keywords :: ", this.collectedContextKeywords, '\n');

        const internalMonologue = this.internalMonologue.execute({ currentPrompt: plan, projectName });
        console.log("\ninternal_monologue :: ", internalMonologue, '\n');

        const newState = this.agentState.newState();
        newState.internalMonologue = internalMonologue;
        this.agentState.addToCurrentState(projectName, newState);

        const research = this.researcher.execute(plan, this.collectedContextKeywords, { projectName });
        console.log("\nresearch :: ", research, '\n');

        const { queries, askUser } = research;
        const queriesCombined = queries.join(", ");
        // In case you missed this part in the original code
        if ((queries && queries.length > 0) || askUser !== "") {
            this.projectManager.addMessageFromDevika(
                projectName,
                `I am browsing the web to research the following queries: ${queriesCombined}.
                \n If I need anything, I will make sure to ask you.`
            );
        }
        if (!queries && queries.length === 0) {
            this.projectManager.addMessageFromDevika(
                projectName,
                "I think I can proceed without searching the web."
            );
        }

        let askUserPrompt = "Nothing from the user.";

        if (askUser !== "" && askUser !== null) {
            this.projectManager.addMessageFromDevika(projectName, askUser);
            this.agentState.setAgentActive(projectName, false);
            let gotUserQuery = false;

            while (!gotUserQuery) {
                this.logger.info("Waiting for user query...");

                const latestMessageFromUser = this.projectManager.getLatestMessageFromUser(projectName);
                const validateLastMessageIsFromUser = this.projectManager.validateLastMessageIsFromUser(projectName);

                if (latestMessageFromUser && validateLastMessageIsFromUser) {
                    askUserPrompt = latestMessageFromUser.message;
                    gotUserQuery = true;
                    this.projectManager.addMessageFromDevika(projectName, "Thanks! 🙌");
                }
                setTimeout(() => {}, 5000);
            }
        }

        this.agentState.setAgentActive(projectName, true);

        const searchResults = queries && queries.length > 0 ? this.searchQueries(queries, projectName) : {};

        const code = this.coder.execute({
            stepByStepPlan: plan,
            userContext: askUserPrompt,
            searchResults,
            projectName
        });
        console.log("\ncode :: ", code, '\n');

        this.coder.saveCodeToProject(code, projectName);

        this.agentState.setAgentActive(projectName, false);
        this.agentState.setAgentCompleted(projectName, true);
        this.projectManager.addMessageFromDevika(
            projectName,
            "I have completed the my task. \n"
            "if you would like me to do anything else, please let me know. \n"
        );
    }
}

module.exports = Agent;
