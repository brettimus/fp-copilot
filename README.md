## Overview

This project sets up a toy database that can create embeddings from an existing fiberplane workspace, and then expose LLM-powered actions on those notebooks. 

It uses Supabase to store markdown representations of notebooks alongside their embeddings, which are generated using an Edge function.

You need Supabase and the fiberplane CLI to make things work.

There are also scripts to create a few test notebooks on a fresh workspaces. Read this document in its entirety to see how to do that.

Some scripts also rely on having the command-line utility `jq` installed.

## Setup

- Install dependencies: `npm i`
- Set environment variables for fp-based scripts: `cp .env.example .env` and add your workspace ID, as well as base url (if you're not working in production)
  * NOTE: If you follow the "Wokring Locally" section below, we have scripts to do this for you
- Set environment variables for the edge functions `cp supabase/functions/.env.example supabase/functions/.env` (add an OpenAI api key)
- Serve edge functions `supabase functions serve` to be able to create embeddings and execute copilot actions

### Database Setup

- Start the database: `supabase start`

- Visit `http://localhost:54323` and enable the `vector` extension in pg to store embeddings (see: https://supabase.com/docs/guides/ai/vector-columns)

- Create a table to hold the embeddings (execute this in the SQL console in the local supabase dashboard)

```sql
create table notebooks (
  id serial primary key,
  title text not null,
  notebook_id text not null,
  markdown text not null,
  embedding vector(384)
);
```

- Create a matching function for searching notebook embeddings (again, copy-paste this into sql editor)

```sql
create or replace function match_notebooks (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  notebook_id text,
  title text,
  markdown text,
  similarity float
)
language sql stable
as $$
  select
    notebooks.id,
    notebooks.notebook_id,
    notebooks.title,
    notebooks.markdown,
    1 - (notebooks.embedding <=> query_embedding) as similarity
  from notebooks
  where 1 - (notebooks.embedding <=> query_embedding) > match_threshold
  order by (notebooks.embedding <=> query_embedding) asc
  limit match_count;
$$;
```

## Try it out

```sh
# Creates copies of notebooks locally as json files (contents are saved as individual files to the `db` directory)
# Then, creates embeddings for each notebook in Postgres,
# while saving a hacky markdown representation of the notebook
make setup

# Search embeddings
npm run search "hello world"

# Do copilot-y actions
# Check the file for some test functions
npm run copilot 
```

## Notes

- Notebooks are converted from a json array of cells into markdown, using some heuristics copied over from studio as well as a few homegrown heuristics in this repo. This is all very hacky.

- You may want to delete all the notebooks in the `db` directory, as well as the embeddings in postgres, before running the script to re-create them. You can use `make clean` to delete everything, or `make reset` to clean up and recreate all data.


- If you ever need to regenerate types from the database (for use in edge functions):

```sh
# https://supabase.com/docs/guides/api/rest/generating-types
supabase gen types typescript --local > supabase/functions/_shared/database.types.ts
```

- To add a commander to a notebook's frontmatter in prod

```sh
fp nb fm append --key commander --value-type user
```

### Working Locally

This describes how to set up a fresh workspace locally that can be used to test some copilot actions.

We'll create a workspace called `animalbuttons` which uses observability data from `animalbuttons.biz`

```sh
# Login to local setup
API_BASE=http://localhost:1234 fp login

# Create workspace
WORKSPACE_CREATE_RESULT=$(API_BASE=http://localhost:1234 fp workspaces create -n animalbuttons -d Animalbuttons --output=json)

WORKSPACE_ID=$(echo $WORKSPACE_CREATE_RESULT | jq -r '.id')

# Set up your .env file so fp commands know to use your local setup in the animalbuttons workspace
echo -e "\nAPI_BASE=http://localhost:1234" >> .env
echo -e "\nWORKSPACE_ID=$WORKSPACE_ID" >> .env

# Set up a local environment with animalbuttons prometheus
API_BASE=http://localhost:1234 \
WORKSPACE_ID=$WORKSPACE_ID \
  fp datasource create -n animalbuttons-prometheus -d "Production prometheus" --provider-type prometheus --provider-config '{ "url": "https://prometheus.animalbuttons.biz" }'

# Create timestamps for example notebooks
resolved_notebook_start=$(date -u -v-48H +"%Y-%m-%dT%H:%M:%SZ")
resolved_notebook_end=$(date -u -v-32H +"%Y-%m-%dT%H:%M:%SZ")
open_notebook_start=$(date -u -v-16H +"%Y-%m-%dT%H:%M:%SZ")
open_notebook_end=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Add a (resolved) notebook to reference during current investigation
API_BASE=http://localhost:1234 \
WORKSPACE_ID=$WORKSPACE_ID \
  fp template expand templates/resolved_slowness_on_animalbuttons_api.jsonnet \
  start=$resolved_notebook_start,end=$resolved_notebook_end

# Now, set up embeddings, etc., so copilot has data to work with
make setup

# Add current notebook to investigate open incident
API_BASE=http://localhost:1234 \
WORKSPACE_ID=$WORKSPACE_ID \
  fp template expand templates/open_slowness_on_animalbuttons_api.jsonnet \
  start=$open_notebook_start,end=$open_notebook_end

# If you ever need to add the commander frontmatter back to a notebook (like if you accidentally delete it)
API_BASE=http://localhost:1234 fp nb fm append --key commander --value-type user
```