/**
 * A simple way to inspect the conversion of cells to markdown
 * This just iterates over all the json files in the db directory
 */

import { inspect } from "node:util";

import { notebookToMarkdown } from "./notebook-utils.js";
import { DB_DIRECTORY } from "./constants.js";
import { forEachJsonFile } from "./files-utils.js";

forEachJsonFile(DB_DIRECTORY, (notebook) => {
  const markdown = notebookToMarkdown(notebook);

  console.log(inspect(markdown, { depth: 5 }));
});

