const codebolt = require('@codebolt/codeboltjs').default;
const { GoogleSearch } = require('./browser/serarch');
const os = require('os');

const osType = os.type();
const {
  Answer,
  Action,
  Coder,
  Decision,
  Feature,
  Formatter,
  InternalMonologue,
  Patcher,
  Planner,
  Reporter,
  Runner,
  Researcher
} = require('./agents');
const { ReadCode } = require('./utils/code');
const { processKeywords } = require('./utils/keyword');
const { getAllMessagesFormatted } = require('./utils/message')

//Agents 
const coder = new Coder();
const decision = new Decision();
const actionAgent = new Action();
const reporter = new Reporter();
const formatter = new Formatter();
const patcher = new Patcher();
const planner = new Planner();
const answer = new Answer();
const internalMonologue = new InternalMonologue();
const feature = new Feature();
const researcher = new Researcher();
const runner = new Runner()

//agent




// codebolt.chat.eventEmitter.addListener()
// }
/**
 * 
 * @param {*} url 
 * @returns 
 */
async function openPage(url) {
  await codebolt.waitForConnection();
  await codebolt.browser.newPage();
  await codebolt.browser.goToPage(url);
  const { text } = await codebolt.browser.extractText();
  await codebolt.browser.close();
  return { data: text }


}
/**
 * 
 * @param {*} queries 
 * @param {*} projectName 
 * @returns 
 */
async function searchQueries(queries, projectName) {
  let results = {};

  let webSearch = new GoogleSearch();

  for (let query of queries) {
    query = query.trim().toLowerCase();



    await webSearch.search(query);
    const link = webSearch.getFirstLink()
    console.log("\nLink :: ", link, '\n');
    if (!link) {
      continue;
    }
    const [data] = await openPage(link);
    // emitAgent("screenshot", { "data": raw, "project_name": projectName }, false);
    results[query] = await formatter.execute(data);

    // this.logger.info(`got the search results for : ${query}`);
    // knowledgeBase.addKnowledge(tag=query, contents=results[query]);
  }
  return results;
}
/**
 * 
 * @param {*} prompt 
 * @param {*} projectName 
 */
async function subsequentExecute(prompt, projectName) {
  try {


    // const newMessage = this.projectManager.newMessage();
    // newMessage.message = prompt;
    // newMessage.fromDevika = false;
    // this.projectManager.addMessageFromUser(projectName, newMessage.message);
    // codebolt.chat.processStarted();
    const osSystem = osType;

    // this.agentState.setAgentActive(projectName, true);
    let projectPath;
    const appState = await codebolt.cbstate.getApplicationState();
    projectPath = appState.state.projectState.projectPath;
    let { chats } = await codebolt.chat.getChatHistory();
    const conversation = await getAllMessagesFormatted(chats);
    conversation.push((`User: ${prompt}`))
    // projectPath = await codebolt.cbstate.getApplicationState();
    const { markdown } = await codebolt.codeutils.getAllFilesAsMarkDown()
    let codeMarkdown = markdown;
    console.log(codeMarkdown);
    let { response, action } = await actionAgent.execute({ conversation: conversation });
    console.log(response);
    console.log("\naction :: ", action, '\n');
    await codebolt.chat.sendMessage(response);
    //
    if (action === "run") {
      await runner.execute({
        conversation: conversation,
        code_markdown: codeMarkdown,
        system_os: osSystem,
        projectPath,
        projectName
      });
    }
    else if (action === "answer") {
      const response = await answer.execute({
        conversation,
        code_markdown: codeMarkdown,
        projectName
      });
      codebolt.chat.sendMessage(response);
    } else if (action === "deploy") {
      // const deployMetadata = Netlify.deploy(projectName);
      // const deployUrl = deployMetadata.deployUrl;

      // const response = {
      //     message: "Done! I deployed your project on Netlify.",
      //     deployUrl
      // };
      // this.projectManager.addMessageFromDevika(projectName, JSON.stringify(response, null, 4));
    } else if (action === "feature") {
      const code = await feature.execute({
        conversation,
        code_markdown: codeMarkdown,
        systemOs: osType,
        projectName
      });
      console.log("\nfeature code :: ", code, '\n');
      feature.saveCodeToProject(code, projectName);
      codebolt.chat.sendMessage("I have added the new feature you asked for.")
      codebolt.git.commit("newFeaturAdded")
    } else if (action === "bug") {
      const code = await patcher.execute({
        conversation,
        code_markdown: codeMarkdown,
        commands: null,
        error: prompt,
        systemOs: osSystem,
        projectName
      });
      console.log("\nbug code :: ", code, '\n');
      patcher.saveCodeToProject(code, projectName);
      codebolt.chat.sendMessage("I have resovled bug in your code")
    } else if (action === "report") {
      const markdown = await reporter.execute(conversation, codeMarkdown, projectName);

      // const outPdfFile = PDF.markdownToPdf(markdown, projectName);

      // const projectNameSpaceUrl = projectName.replace(" ", "%20");
      // const pdfDownloadUrl = `http://127.0.0.1:1337/api/download-project-pdf?project_name=${projectNameSpaceUrl}`;
      // const response = `I have generated the PDF document. You can download it from here: ${pdfDownloadUrl}`;

      // // await this.openPage(projectName, pdfDownloadUrl);

      // this.projectManager.addMessageFromDevika(projectName, response);
    }
    codebolt.chat.stopProcess();

    // this.agentState.setAgentActive(projectName, false);
    // this.agentState.setAgentCompleted(projectName, true);
  } catch (error) {
    codebolt.chat.sendMessage("An error occurred. Please try again later.");
    codebolt.chat.stopProcess();
  }
}



// (async () => {

//   await execute()

// })();



codebolt.chat.onActionMessage().on("userMessage", async (req, response) => {
  
  try {


    await codebolt.waitForConnection();
    // Create State
    let { payload } = await codebolt.cbstate.getAgentState();

    if (payload && payload.mainTaskFinished) {
      let userChatLister = codebolt.chat.userMessageListener();
      userChatLister.on("userMessage", (message) => {
        subsequentExecute(message);
      })
     
    }
    else {
     
      let prompt = req.message.userMessage;
      // console.log(prompt)
      // codebolt.chat.processStarted();

      // this.agentState.createState({ project: projectName });
      await codebolt.cbstate.addToAgentState('mainTaskFinished', false);
      const plannerResponse = await planner.raw_execute({ prompt });
      let validatePlannerResponse = await planner.validate_response(plannerResponse);
      const { reply, focus, plans, summary } = validatePlannerResponse;

      codebolt.chat.sendMessage(reply);


      for (const plan in plans) {
        codebolt.taskplaner.addTask(plans[plan])

      }
      codebolt.chat.sendNotificationEvent('Plan Has Been Generated','planner');

      codebolt.chat.sendMessage(`In summary: ${summary}`);

      // this.updateContextualKeywords(focus);
      // console.log("\ncontext_keywords :: ", this.collectedContextKeywords, '\n');

      // const internalMonologueResponse = internalMonologue.execute({ current_prompt: plan });
      // console.log("\ninternal_monologue :: ", internalMonologueResponse, '\n');

      // const newState = this.agentState.newState();
      // newState.internalMonologue = internalMonologue;
      // this.agentState.addToCurrentState(projectName, newState);

      // const research = researcher.execute(plan, this.collectedContextKeywords, { projectName });
      let keywords = await processKeywords(focus);
      let keywords_str = keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(", ");
      let research = await researcher.execute({
        "step_by_step_plan": plannerResponse,
        "contextual_keywords": keywords_str
      });
      console.log("\nresearch :: ", research, '\n');

      let { queries, ask_user } = research;
      queries=[];
      const queriesCombined = queries.join(", ");
      // In case you missed this part in the original code
      if ((queries && queries.length > 0) || ask_user !== "") {
        codebolt.chat.sendMessage(
          `I am browsing the web to research the following queries: ${queriesCombined}.
        \n If I need anything, I will make sure to ask you.`
        );
      }
      if (queries.length === 0) {
        codebolt.chat.sendMessage(
          "I think I can proceed without searching the web."
        );
      }

      let askUserPrompt = "Nothing from the user.";

      if (ask_user !== "" && ask_user !== null) {
        // this.projectManager.addMessageFromDevika(projectName, askUser);
        // this.agentState.setAgentActive(projectName, false);
        // let gotUserQuery = false;

        // while (!gotUserQuery) {
        //   this.logger.info("Waiting for user query...");

        //   const latestMessageFromUser = this.projectManager.getLatestMessageFromUser(projectName);
        //   const validateLastMessageIsFromUser = this.projectManager.validateLastMessageIsFromUser(projectName);

        //   if (latestMessageFromUser && validateLastMessageIsFromUser) {
        //     askUserPrompt = latestMessageFromUser.message;
        //     gotUserQuery = true;
        //     this.projectManager.addMessageFromDevika(projectName, "Thanks! 🙌");
        //   }
        //   setTimeout(() => { }, 5000);
        // }
      }

      // this.agentState.setAgentActive(projectName, true);

      const searchResults = {}; // queries && queries.length > 0 ? await searchQueries(queries) : {};
      console.log(searchResults)

      const code = await coder.execute({
        "step_by_step_plan": plannerResponse,
        "user_context": askUserPrompt,
        "search_results": searchResults,
        "query": prompt
      });
      // console.log("\ncode :: ", code, '\n');

      coder.save_code_to_project(code);

      // this.agentState.setAgentActive(projectName, false);
      // this.agentState.setAgentCompleted(projectName, true);
      codebolt.chat.sendMessage(`I have completed the my task. \n
    if you would like me to do anything else, please let me know. \n`
      );

      codebolt.chat.stopProcess();
      await codebolt.cbstate.addToAgentState('mainTaskFinished', true);
      codebolt.git.commit("mainTaskFinished")

      let userChatLister = codebolt.chat.userMessageListener();
      userChatLister.on("userMessage", (message) => {
        subsequentExecute(message);
      })
    }
  }
  catch (error) {
    codebolt.chat.sendMessage("An error occurred. Please try again later.");
    codebolt.chat.stopProcess();
  }
  })

