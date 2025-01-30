-- Enable the pgvector extension if not already enabled
create extension if not exists vector;

-- Function to insert a chunk with its embedding
create or replace function insert_chunk(
  p_document_id uuid,
  p_content text,
  p_embedding text,
  p_sequence_number integer,
  p_token_count integer
) returns void
language plpgsql
as $$
begin
  insert into chunks (
    document_id,
    content,
    embedding,
    sequence_number,
    token_count
  ) values (
    p_document_id,
    p_content,
    p_embedding::vector,
    p_sequence_number,
    p_token_count
  );
end;
$$;

-- Function to match chunks based on embedding similarity
create or replace function match_chunks(
  query_embedding vector(1536),
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