import { exportCellsAsMarkdown } from "./cells-utils.js";
import { DB_DIRECTORY } from "./constants.js";
import { supabase } from "./supabase-client.js";
import { forEachJsonFile } from "./files-utils.js";

forEachJsonFile(DB_DIRECTORY, async (notebook) => {
  const cellsAsMarkdown = exportCellsAsMarkdown(notebook.cells);
  const notebookAsMarkdown = `# ${notebook.title} \n ${cellsAsMarkdown}`;

  const { data: embeddingResponse, error } = await supabase.functions.invoke(
    "notebook-to-embeddings",
    {
      body: { notebook: notebookAsMarkdown },
    }
  );

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

  // Store the vector (embeddings) in Postgres
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
