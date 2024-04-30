import { exportCellsAsMarkdown } from "./cells-utils.js";
import { supabase } from "./client.js";
import { forEachJsonFile } from "./files-utils.js";

const directoryPath = "./db";

forEachJsonFile(directoryPath, async (notebook) => {
  const notebookAsMarkdown = exportCellsAsMarkdown(notebook.cells);
  const { data: embeddingResponse, error } = await supabase.functions.invoke(
    "notebook-to-embeddings",
    {
      body: { notebook: notebookAsMarkdown },
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
    markdown: notebookAsMarkdown,
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
