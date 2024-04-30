// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { openai } from "../_shared/deps.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { supabaseClient } from "../_shared/supabase.ts";

const { OpenAI } = openai;

const handler: Deno.ServeHandler = alertAssistantHandler;

// Serve our edge function
Deno.serve(handler);

/**
 * The handler for our edge function
 */
async function alertAssistantHandler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const data = await getCompletion(req);

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/**
 * Gets a completion from OpenAI's API
 */
async function getCompletion(req: Request) {
  const { query } = await req.json();

  const { data: similarNotebooks, error } = await findSimilarNotebooks(query);

  if (error) {
    console.error(error);
    return { error };
  }

  // Just use most similar notebook
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
    // tool_choice: { name: "extract_useful_queries" },
    messages: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      {
        role: "user",
        content: getUserPrompt(query, similarNotebookHACK),
      },
    ],
    temperature: 0.1,
    max_tokens: 2048,
    tools: [
      {
        type: "function",
        function: {
          name: "extract_useful_queries",
          description:
            "Gets useful observability data queries (between triple backticks) from an existing fiberplane notebook",
          // Describe parameters as json schema
          // https://json-schema.org/understanding-json-schema/
          parameters: {
            type: "object",
            properties: {
              datasource_queries: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                    },
                    provider: {
                      type: "string",
                    }
                  }
                },
              },
            },
          },
        },
      },
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

function getUserPrompt(incidentSummary: string, similarNotebooks: string) {
  return `
I am investigating an incident that I can summarize as follows 
${incidentSummary}

===

Here are some notebooks that I think might be relevant to the incident:
${similarNotebooks}
`.trim();
}

/**
 * Creates a prompt to send to the model
 */
function getSystemPrompt(): string {
  return `
You are an observability expert who is responsible for guiding a user during an incident investigation. 

You work for a platform called Fiberplane. Fiberplane uses notebooks to create a system of record for incident investigations and incident review.

Your job is to tie in the context of an ongoing incident, as well as any relevant past notebooks, to help the user extract useful insights
and perform their investigation.

- Be polite and professional
- Be clear and concise
- Think step by step
- Take a deep breath before responding
- Always respond with valid json
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
