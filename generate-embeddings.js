import fs from "node:fs";
import path from "node:path";

import { supabase } from "./client.js";

const directoryPath = "./db";

forEachJsonFile(directoryPath, async (notebook) => {
  const { data: embeddingResponse, error } = await supabase.functions.invoke(
    "notebook-to-embeddings",
    {
      body: { notebook },
    }
  );

  // TODO - handle error
  if (error) {
    console.error(
      `Error creating embedding for notebook ${notebook.title} (${notebook.id})`,
      error
    );
    return;
  }

  const notebookEmbedding = {
    notebook_id: notebook.id,
    embedding: embeddingResponse.embedding,
    title: notebook.title,
  };

  // Store the vector in Postgres
  const { data, error: insertError } = await supabase
    .from("notebooks")
    .insert(notebookEmbedding);

  if (insertError) {
    console.error(
      `Error inserting notebook embedding  ${notebook.title} (${notebook.id})`,
      insertError
    );
    return;
  }

  console.log(`Created embeddings for ${notebook.title}`);
  console.log(data);
});

function forEachJsonFile(directory, callback) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      return console.error(`Unable to scan directory: ${err}`);
    }

    const jsonFiles = files.filter((file) => path.extname(file) === ".json");

    for (const file of jsonFiles) {
      fs.readFile(path.join(directory, file), "utf8", async (err, contents) => {
        if (err) {
          return console.error(`Unable to read file: ${err}`);
        }

        callback(JSON.parse(contents));
      });
    }
  });

}

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
