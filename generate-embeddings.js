import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const HOST = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// Create a single supabase client for interacting with your database
const supabase = createClient(HOST, ANON_KEY);

const directoryPath = "./db";


fs.readdir(directoryPath, (err, files) => {
  if (err) {
    return console.error(`Unable to scan directory: ${err}`);
  }

  for (const file of files) {
    if (path.extname(file) === ".json") {
      fs.readFile(path.join(directoryPath, file), "utf8", (err, contents) => {
        if (err) {
          return console.error(`Unable to read file: ${err}`);
        }
        console.log(`Contents of ${file}:`);
        const notebook = JSON.parse(contents);
        console.log(notebook.id);

        supabase.functions.invoke("notebook-to-embeddings", {
          body: { notebook },
        })
      });
    }
  }
});

/**
 * Helper that can create embeddings for each "chunk" of a notebook
 * Right now chunking is very rudimentary, we just look at sections with different headings
 */
function chunkNotebook(notebook) {
  const sections = [];

  let currentSection = [];

  for (const cell of notebook.cells) {
    // Start a new section for each heading...
    if (currentSection.length > 0 && cell.type === "heading") {
      sections.push(currentSection);
      currentSection = [cell];
    } else {
      currentSection.push(cell);
    }
  }

  sections.push(currentChunk);

  return sections;
}