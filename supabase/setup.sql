-- Enable pgvector extension
create extension if not exists vector;

-- Drop existing tables if they exist
drop table if exists chunks;
drop table if exists documents;

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  size integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'processing' not null -- 'processing', 'completed', 'error'
);

-- Chunks table with vector embeddings
create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  content text not null,
  embedding vector(3072), -- text-embedding-3-large has 3072 dimensions
  sequence_number integer not null,
  token_count integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a function to update the updated_at column
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create a trigger to automatically update updated_at
create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at_column();

-- Create an index for similarity search using HNSW
-- HNSW is more efficient for high-dimensional vectors
create index on chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Function to match chunks based on embedding similarity
create or replace function match_chunks(
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    chunks.id,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where 1 - (chunks.embedding <=> query_embedding) > match_threshold
  order by chunks.embedding <=> query_embedding
  limit match_count;
end;
$$; 