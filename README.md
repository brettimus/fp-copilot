
- Install dependencies: `npm i`
- Start the database: `supabase start`
- Set environment variables: `cp .env.example .env`
- Run script...

```sh
# Create a database of notebooks locally as json files
./create-database.sh

# Create embeddings for each notebook in Postgres
node generate-embeddings.js
```
