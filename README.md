
## Setup

- Install dependencies: `npm i`
- Set environment variables: `cp .env.example .env` and add your workspace ID
- Serve edge functions `supabase functions serve` to be able to create embeddings

### Database Setup

- Start the database: `supabase start`

- Visit `http://localhost:54323` and enable the `vector` extension in pg to store embeddings (see: https://supabase.com/docs/guides/ai/vector-columns)

- Create a table to hold the embeddings (execute this in teh SQL console in the local supabase dashboard)

```sql
create table notebooks (
  id serial primary key,
  title text not null,
  notebook_id text not null,
  markdown text not null,
  embedding vector(384)
);
```

- Create a matching function (again, copy-paste this into sql editor)

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
# Create copies of notebooks locally as json files
# Contents are saved as individual files to the `db` directory
./fetch-notebooks.sh

# Create embeddings for each notebook in Postgres
npm run embeddings:create

# Search embeddings
npm run search "hello world"
```

## Notes

- Notebooks are converted from a json array of cells into markdown, using some heuristics copied over from studio. This is very hacky.

- You may want to delete all the notebooks in the `db` directory, as well as the embeddings in postgres, before running the script to re-create them. You can use `npm run reset` to do this.