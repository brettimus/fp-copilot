import fs from "node:fs";

import { supabase } from "./supabase-client.js";

// testSimilarNotebooks();
testAnalyzeNotebook();

function testSimilarNotebooks() {
  const incidentSummary = "Slowness on api service for animalbuttons";
  return supabase.functions
    .invoke("copilot", {
      body: {
        action: "SEARCH_SIMILAR_NOTEBOOKS",
        payload: {
          incidentSummary,
        },
      },
    })
    .then((result) => {
      if (result.error) {
        console.error("ERROR", result.error);
        return;
      }
      const message = result.data.message;

      write(message);

      console.log("We have a tool call folks!");
      // biome-ignore lint/complexity/noForEach: get off my back
      message.tool_calls.forEach((toolCall) => {
        const toolName = toolCall.function.name;
        console.log("Calling", toolName);
        const toolArgs = toolCall.function.arguments;
        console.log("> using arguments:", toolArgs);

        const parsedArgs = JSON.parse(toolArgs);
        const notebook = parsedArgs.notebooks[0];

        console.log("> Similar notebook:", notebook);
      });
    });
}

function testAnalyzeNotebook() {
  const notebookId = "JrxQznGXRj-F8r3PRmRhvA";
  const incidentSummary = "Slowness on api service for animalbuttons";
  return supabase.functions
    .invoke("copilot", {
      body: {
        action: "ANALYZE_SIMILAR_NOTEBOOKS",
        payload: {
          notebookId,
          incidentSummary,
        },
      },
    })
    .then((result) => {
      if (result.error) {
        console.error("ERROR", result.error);
        return;
      }
      const message = result.data.message;
      // console.log("Message:", message);
      write(message);

      if (message.tool_calls) {
        console.log("We have a tool call folks!");
        // biome-ignore lint/complexity/noForEach: get off my back
        message.tool_calls.forEach((toolCall) => {
          const toolName = toolCall.function.name;
          console.log("Calling", toolName);
          const toolArgs = toolCall.function.arguments;
          console.log("> using arguments:", toolArgs);

          const parsedArgs = JSON.parse(toolArgs);
          const query = parsedArgs.datasource_queries[0];

          console.log("> Query:", query);
        });
      } else if (message.content) {
        console.log(message.content);
      }
    });
}

// TODO
function testGenericQuery() {
  const CURRENT_INCIDENT_DESCRIPTION = "Slowness on api service for animalbuttons";

  return supabase.functions
    .invoke("copilot", { body: { query: CURRENT_INCIDENT_DESCRIPTION } })
    .then((result) => {
      if (result.error) {
        console.error("ERROR", result.error);
        return;
      }
      const message = result.data.message;
      // console.log("Message:", message);
      write(message);

      if (message.tool_calls) {
        console.log("We have a tool call folks!");
        // biome-ignore lint/complexity/noForEach: get off my back
        message.tool_calls.forEach((toolCall) => {
          const toolName = toolCall.function.name;
          console.log("Calling", toolName);
          const toolArgs = toolCall.function.arguments;
          console.log("> using arguments:", toolArgs);

          const parsedArgs = JSON.parse(toolArgs);
          const query = parsedArgs.datasource_queries[0];

          console.log("> using query:", query);
          // console.log(decodeURI(query));
          // console.log(decodeURIComponent(query));
        });
      } else if (message.content) {
        console.log(message.content);
      }
    });
}

function write(message) {
  const stringifiedMessage = JSON.stringify(message, null, 2);
  const logContents = `\n${stringifiedMessage}\n`;
  fs.appendFileSync("copilot.log", logContents);
}
