import fs from "node:fs";
// import { inspect } from "node:util";

import { supabase } from "./supabase-client.js";

const CURRENT_INCIDENT_DESCRIPTION = `
Slowness on api service for animalbuttons
`.trim();

supabase.functions
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

function write(message) {
  // fs.appendFileSync("messages.txt", inspect(message, { depth: null }));
  const stringifiedMessage = JSON.stringify(message, null, 2);
  const logContents = `\n${stringifiedMessage}\n`;
  fs.appendFileSync("messages.txt", logContents);
}
