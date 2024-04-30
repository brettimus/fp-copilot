import { supabase } from "./supabase-client.js";

// const query = "getting started"
const [_0, _1, ...queryTerms] = process.argv;
const query = queryTerms.join(" ");

const { data: matches, error } = await supabase.functions.invoke(
  "search-notebooks",
  {
    body: { query },
  }
);

console.log("Searching: ", query);
console.log("Matches:", "\n", matches.map((match) => match.title).join("\n"));