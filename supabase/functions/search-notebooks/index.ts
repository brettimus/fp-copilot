// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/v135/@supabase/functions-js@2.3.1/src/edge-runtime.d.ts" />

import { supabaseClient } from "../_shared/supabase.ts";

const session = new Supabase.ai.Session("gte-small");

Deno.serve(async (req) => {
  const { query } = await req.json();
  console.log("Embedding for query!", query);

  const embedding = await session.run(query, {
    mean_pool: true,
    normalize: true,
  });

  console.log("Embedding!", embedding);

  const { data: notebooks, error } = await supabaseClient.rpc(
    "match_notebooks",
    {
      query_embedding: embedding,
      match_threshold: 0.80,
      match_count: 5,
    },
  );

  if (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify(notebooks),
    { headers: { "Content-Type": "application/json" } },
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/search-notebooks' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
