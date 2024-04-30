import fs from "node:fs";
import path from "node:path";

/**
 * Helper function to iterate all json files in a directory and yield their (parsed) contents to a callback
 */
export function forEachJsonFile(directory, callback) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      return console.error(`Unable to scan directory: ${err}`);
    }

    const jsonFiles = files.filter((file) => path.extname(file) === ".json");

    jsonFiles.forEach((file, index) => {
      fs.readFile(path.join(directory, file), "utf8", async (err, contents) => {
        if (err) {
          return console.error(`Unable to read file: ${err}`);
        }

        callback(JSON.parse(contents), index);
      });
    });
  });
}
