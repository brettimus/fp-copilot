import { supabase } from "./client.js";

// const query = "getting started"
const [_0, _1, ...queryTerms] = process.argv;
const query = queryTerms.join(" ");

const { data: matches, error } = await supabase.functions.invoke(
  "search-notebooks",
  {
    body: { query },
  }
);

console.log(matches)