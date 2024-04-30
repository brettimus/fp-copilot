import { inspect } from "node:util";

import { exportCellsAsMarkdown } from "./cells-utils.js";
import { forEachJsonFile } from "./files-utils.js";

const directoryPath = "./db";

forEachJsonFile(directoryPath, (notebook) => {
  const cells = notebook.cells;
  const markdown = exportCellsAsMarkdown(cells);

  console.log(inspect(markdown, { depth: 5 }));
});

