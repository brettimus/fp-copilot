// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { openai } from "../_shared/deps.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { supabaseClient } from "../_shared/supabase.ts";
import {
  extractUsefulQueries,
  summarizeSimilarNotebooks,
} from "../_shared/tools.ts";

const { OpenAI } = openai;

const handler: Deno.ServeHandler = alertAssistantHandler;

// Serve our edge function
Deno.serve(handler);

/**
 * The handler for our edge function
 */
async function alertAssistantHandler(req: Request): Promise<Response> {
  // Allows us to make requests from the frontend
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const response = await getCompletionByAction(req);

  if ("error" in response) {
    console.error("Error getting completion!", response.error);
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// NOTE - Instead of having the frontend send the `action` as a string,
//        We could also just call different edge functions with different functionality
async function getCompletionByAction(req: Request) {
  const { action, payload, query } = await req.json();

  switch (action) {
    case "SEARCH_SIMILAR_NOTEBOOKS":
      return searchSimilarNotebooks(payload);
    case "ANALYZE_SIMILAR_NOTEBOOKS":
      return analyzeSimilarNotebooks(payload);
    case "SUMMARIZE_NOTEBOOK":
      return summarizeNotebook(payload);
    default:
      return getGenericCompletion(query);
  }
}

/**
 * Uses the `summarize_similar_notebooks` tool to get a function-call completion from OpenAI's API
 */

// biome-ignore lint/suspicious/noExplicitAny: TODO - prototyping, fix type later
async function searchSimilarNotebooks(payload: any) {
  const { incidentSummary } = payload;
  const { data: similarNotebooks, error } = await findSimilarNotebooks(
    incidentSummary,
  );

  if (error) {
    return { error };
  }

  // HACK - Just use most similar notebook for now
  const similarNotebook = similarNotebooks[0];
  console.log("Most similar notebook:", similarNotebook);

  const similarNotebookHACK = similarNotebook?.markdown ??
    "No similar notebooks found";
  const similarNotebookId = similarNotebook?.notebook_id ?? undefined;

  const openaiClient = new OpenAI();

  const response = await openaiClient.chat.completions.create({
    // NOTE - This model guarantees function calling to have json output
    model: "gpt-4-turbo-preview",
    // NOTE - We are restricting the repsonse to be from this single tool call
    tool_choice: {
      type: "function",
      function: { name: "summarize_similar_notebooks" },
    },
    messages: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      {
        role: "user",
        content: getSimilarNotebooksPrompt(
          incidentSummary,
          similarNotebookHACK,
          similarNotebookId,
        ),
      },
    ],
    temperature: 0,
    max_tokens: 2048,
    tools: [
      summarizeSimilarNotebooks,
    ],
  });

  const {
    id,
    choices: [{ message }],
  } = response;

  // TODO - use `tool_calls`
  //
  // const { content, tool_calls } = message;
  // message.tool_calls.forEach((toolCall) => {
  //   const toolName = toolCall.function.name;
  //   const toolArgs = toolCall.function.arguments;
  //   const parsedArgs = JSON.parse(toolArgs);
  //   const notebook = parsedArgs.notebooks[0];
  // });

  return { id, message, response: response };
}

/**
 * Uses the `extract_useful_queries` tool to get a function-call completion from OpenAI's API
 *
 * TODO - Perform analysis beyond useful queries
 */
// deno-lint-ignore no-explicit-any
async function analyzeSimilarNotebooks(payload: any) {
  const { notebookId, incidentSummary } = payload;

  const { data: notebookToAnalyze, error } = await getNotebookByFpNotebookId(
    notebookId,
  );

  if (error) {
    return { error };
  }

  if (!notebookToAnalyze) {
    return {
      error: "Similar notebook not found",
    };
  }

  const openaiClient = new OpenAI();

  const response = await openaiClient.chat.completions.create({
    // NOTE - This model guarantees function calling to have json output
    model: "gpt-4-turbo-preview",
    // NOTE - We are restricting the repsonse to be from this single tool call
    tool_choice: {
      type: "function",
      function: { name: "extract_useful_queries" },
    },
    messages: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      {
        role: "user",
        content: getAnalyzeSimilarNotebookPrompt(
          incidentSummary,
          notebookToAnalyze.markdown,
        ),
      },
    ],
    temperature: 0,
    max_tokens: 2048,
    tools: [
      extractUsefulQueries,
    ],
  });

  const {
    id,
    choices: [{ message }],
  } = response;

  // TODO - use `tool_calls`
  //
  // const { content, tool_calls } = message;
  // message.tool_calls.forEach((toolCall) => {
  //   const toolName = toolCall.function.name;
  //   const toolArgs = toolCall.function.arguments;
  //   const parsedArgs = JSON.parse(toolArgs);
  //   const query = parsedArgs.datasource_queries[0];
  // });

  return { id, message, response: response };
}

/**
 * Uses the `summarize_similar_notebooks` tool to get a function-call completion from OpenAI's API
 */

// biome-ignore lint/suspicious/noExplicitAny: TODO - prototyping, fix type later
async function summarizeNotebook(payload: any) {
  const { notebook, investigationActions } = payload;

  const openaiClient = new OpenAI();

  const response = await openaiClient.chat.completions.create({
    // NOTE - This model guarantees function calling to have json output
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      {
        role: "user",
        content: getSummarizeNotebookPrompt(
          notebook,
          investigationActions
        ),
      },
    ],
    temperature: 0,
    max_tokens: 2048,
    tools: [
      summarizeSimilarNotebooks,
    ],
  });

  const {
    id,
    choices: [{ message }],
  } = response;

  // TODO - use `tool_calls`
  //
  // const { content, tool_calls } = message;
  // message.tool_calls.forEach((toolCall) => {
  //   const toolName = toolCall.function.name;
  //   const toolArgs = toolCall.function.arguments;
  //   const parsedArgs = JSON.parse(toolArgs);
  //   const notebook = parsedArgs.notebooks[0];
  // });

  return { id, message, response: response };
}


/**
 * Gets a completion from OpenAI's API
 */
async function getGenericCompletion(query: string) {
  const { data: similarNotebooks, error } = await findSimilarNotebooks(query);

  if (error) {
    return { error };
  }

  // HACK - Just use most similar notebook for now
  console.log("Most similar notebook:", similarNotebooks[0]);
  const similarNotebookHACK = similarNotebooks[0]?.markdown ??
    "No similar notebooks found";

  const openaiClient = new OpenAI();

  const response = await openaiClient.chat.completions.create({
    // model: "gpt-3.5-turbo-0125", // This model guarantees function calling to have json output
    // model: "gpt-4",
    model: "gpt-4-turbo-preview", // This model guarantees function calling to have json output
    response_format: { type: "json_object" },
    tool_choice: "auto",
    // NOTE - To restrict to a single tool, use the following:
    // tool_choice: { name: "extract_useful_queries" },
    messages: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      {
        role: "user",
        content: getSimilarNotebooksPrompt(query, similarNotebookHACK),
      },
    ],
    temperature: 0.1,
    max_tokens: 2048,
    tools: [
      extractUsefulQueries,
    ],
  });

  const {
    id,
    choices: [{ message }],
  } = response;

  // TODO - use `tool_calls`
  //
  // const { content, tool_calls } = message;
  // const function_call = tool_calls?.[0]?.function;

  return { id, message, response: response };
}

/**
 * Creates a prompt from the user's inquiry
 *
 * Right now, assumes we're looking at a single similar notebook
 */
function getSimilarNotebooksPrompt(
  incidentSummary: string,
  similarNotebook: string,
  notebookId?: string,
) {
  return `
I am investigating an incident that I can summarize as follows 
${incidentSummary}

===

Here is a notebook that I think might be relevant to the incident. 
Remember to look for the commander in the frontmatter block:

${notebookId ? `ID: ${notebookId}` : ""}

${similarNotebook}
`.trim();
}

function getAnalyzeSimilarNotebookPrompt(
  incidentSummary: string,
  notebookToAnalyze: string,
) {
  return `
I am investigating an incident that I can summarize as follows 
${incidentSummary}

===

Here is a notebooks that might be relevant to resolving the incident:
${notebookToAnalyze}
`.trim();
}

function getSummarizeNotebookPrompt(notebook: string, investigationActions?: string[]) {
  return `
I have invesetigated an incident, and recorded the contents in a Fiberplane notebook.

${investigationActions?.reduce((actionSummary, action) => {
  return `${actionSummary}\n- ${action}`
}, "These are the actions I took while resolving:")}

Here is the notebook:

${notebook}

Please respond with a detailed summary of the notebook, in markdown. 

This summary will go at the bottom of the notebook, so you do not need to recap things like the notebook title, notebook id, or current status.

When you reference any similar notebooks, use a link with JSX syntax, like this:

<NotebookReference notebookId="123">Notebook Title</NotebookReference>

When you reference another user, like the commander, use a link with JSX syntax, like this:

<UserReference userId="456">Commander Name</UserReference>

Avoid platitudes, generalizations, and high-flying language, and focus on the incident at hand.

DO NOT RESPOND IN JSON please. I only need markdown.

I'll tip you $100 for a good response.
`.trim();
}

/**
 * Creates a system prompt for the copilot
 * I made this a function so we could inject additional context as we see fit
 */
function getSystemPrompt(): string {
  return `
You are an observability expert who is responsible for guiding a user during an incident investigation. 

You work for a platform called Fiberplane. Fiberplane uses notebooks to create a system of record for incident investigations and incident review.

Your job is to tie in the context of an ongoing incident, as well as any relevant past notebooks, to help the user extract useful insights
and perform their investigation.

You have several tools at your disposal, which you can choose depending on the user's inquiry:

- extract_useful_queries
- summarize_similar_notebooks

Here are your instructions:

- Be polite and professional
- Be clear and concise
- Think step by step
- Take a deep breath before responding
- Always respond with valid json, unless otherwise specified
`.trim();
}

function findSimilarNotebooks(query: string) {
  return supabaseClient.functions.invoke(
    "search-notebooks",
    {
      body: { query },
    },
  );
}

function getNotebookByFpNotebookId(notebookId: string) {
  return supabaseClient.from("notebooks").select().eq("notebook_id", notebookId)
    .single();
}
