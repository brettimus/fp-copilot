/**
 * Allows you to pipe notebook json to this script, which will create json files of each notebook
 */

import process from "node:process";
import fs from "node:fs";
import path from "node:path";
// import { inspect } from "node:util";

// Create a variable to hold the JSON input that's piped to the command
let jsonInput = '';

process.stdin.on('data', (chunk) => {
  // Append the chunk to jsonInput
  jsonInput += chunk;
});

process.stdin.on('end', () => {
  // Parse the JSON input
  const notebook = JSON.parse(jsonInput);

  // console.log("Hello World", inspect(notebook, false, null, true));
  // console.log(data);

  const fileName = `notebook-${notebook.id}.json`;
  writeFile(fileName, jsonInput);
});

function writeFile(fileName, data) {
  const filePath = path.join("db", fileName);
  fs.writeFile(filePath, data, (err) => {
    if (err) throw err;
    console.log("Saved!");
  });
}
