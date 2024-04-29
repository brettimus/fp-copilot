
## Setup

- Install dependencies: `npm i`
- Set environment variables: `cp .env.example .env`
- Serve edge functions `supabase functions serve`

### Database Setup

- Start the database: `supabase start`

- Enable embeddings in pg (see: https://supabase.com/docs/guides/ai/vector-columns)

- Create a table to hold the embeddings

```sql
create table notebooks (
  id serial primary key,
  title text not null,
  notebook_id text not null,
  embedding vector(384)
);
```

- Create a matching function 

```sql
create or replace function match_notebooks (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  title text,
  notebook_id text,
  similarity float
)
language sql stable
as $$
  select
    notebooks.id,
    notebooks.notebook_id,
    notebooks.title,
    1 - (notebooks.embedding <=> query_embedding) as similarity
  from notebooks
  where 1 - (notebooks.embedding <=> query_embedding) > match_threshold
  order by (notebooks.embedding <=> query_embedding) asc
  limit match_count;
$$;
```


## Trying it out

```sh
# Create a database of notebooks locally as json files
./create-database.sh

# Create embeddings for each notebook in Postgres
node generate-embeddings.js

# Search embeddings
node search-notebooks.js "hello world"
```
