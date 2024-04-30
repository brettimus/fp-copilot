import fs from 'node:fs';
import path from 'node:path';

import { DB_DIRECTORY } from './constants.js';
import { supabase } from './supabase-client.js';

clearDbDirectory();
clearPostgres();

function clearPostgres() {
  supabase
    .from("notebooks")
    .delete()
    .neq("id", 0) // HACK - Supabase has safeguards against deleting everything
    .then(
      () => {
        console.log("Cleared Postgres");
      },
      (err) => {
        console.error("Error clearing Postgres", err);
      }
    );
}

function clearDbDirectory() {
  fs.readdir(DB_DIRECTORY, (err, files) => {
    if (err) {
      return console.error(`Unable to scan directory: ${err}`);
    }

    // biome-ignore lint/complexity/noForEach: simple script, get off my back
    files.forEach((file) => {
      if (path.extname(file) === ".json") {
        fs.unlink(path.join(DB_DIRECTORY, file), (err) => {
          if (err) {
            return console.error(`Unable to delete file: ${err}`);
          }
          console.log(`Deleted file: ${file}`);
        });
      }
    });
  });
}

