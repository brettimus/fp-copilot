/**
 * Allows you to pipe notebook json to this script, which will create json files of each notebook.
 * 
 * Used by `create-database.sh` in conjunction with a call to `fp notebook get --notebook-id=<NOTEBOOK_ID>`
 */

import process from "node:process";
import fs from "node:fs";
import path from "node:path";

import { DB_DIRECTORY } from "./constants.js";

// Create a variable to hold the JSON input that's piped to the command
let jsonInput = '';

process.stdin.on('data', (chunk) => {
  jsonInput += chunk;
});

process.stdin.on('end', () => {
  const notebook = JSON.parse(jsonInput);
  const fileName = `notebook-${notebook.id}.json`;
  writeFile(fileName, jsonInput);
});

function writeFile(fileName, data) {
  const filePath = path.join(DB_DIRECTORY, fileName);
  fs.writeFile(filePath, data, (err) => {
    if (err) throw err;
    console.log("Saved!", filePath);
  });
}
