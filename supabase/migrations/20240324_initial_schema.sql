-- Drop existing objects
drop function if exists match_chunks cascade;
drop function if exists upsert_document cascade;
drop function if exists toggle_document_visibility cascade;
drop function if exists update_updated_at_column cascade;
drop trigger if exists update_documents_updated_at on documents;
drop trigger if exists update_chunks_updated_at on chunks;
drop table if exists chunks cascade;
drop table if exists documents cascade;
drop type if exists document_status cascade;
drop type if exists document_visibility cascade;

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- Create enums
create type document_status as enum ('processing', 'complete', 'failed');
create type document_visibility as enum ('enabled', 'disabled');

-- Create collections table for organizing documents
create table if not exists collections (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    metadata jsonb default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create documents table
create table documents (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    type text not null,
    size integer not null,
    status document_status not null default 'processing',
    visibility document_visibility not null default 'enabled',
    error_message text,
    metadata jsonb default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create chunks table
create table chunks (
    id uuid primary key default uuid_generate_v4(),
    document_id uuid references documents(id) on delete cascade not null,
    content text not null,
    embedding vector(1536),
    sequence_number integer not null,
    token_count integer not null,
    created_at timestamptz not null default now()
);

-- Create indexes
create index idx_documents_status on documents(status);
create index idx_documents_visibility on documents(visibility);
create index idx_chunks_document_id on chunks(document_id);
create index idx_chunks_sequence on chunks(document_id, sequence_number);
create index idx_chunks_embedding on chunks using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for documents updated_at
create trigger update_documents_updated_at
    before update on documents
    for each row
    execute function update_updated_at_column();

-- Function to insert document
create or replace function upsert_document(
    p_name text,
    p_type text,
    p_size integer,
    p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
    v_document_id uuid;
begin
    insert into documents (
        name,
        type,
        size,
        metadata
    )
    values (
        p_name,
        p_type,
        p_size,
        p_metadata
    )
    returning id into v_document_id;
    
    return v_document_id;
end;
$$;

-- Function to toggle document visibility
create or replace function toggle_document_visibility(
    p_document_id uuid
)
returns document_visibility
language plpgsql
as $$
declare
    v_new_visibility document_visibility;
begin
    update documents
    set visibility = case 
        when visibility = 'enabled' then 'disabled'::document_visibility
        else 'enabled'::document_visibility
    end
    where id = p_document_id
    returning visibility into v_new_visibility;
    
    return v_new_visibility;
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
    document_id uuid,
    document_name text,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        c.id,
        c.content,
        c.document_id,
        d.name as document_name,
        1 - (c.embedding <=> query_embedding) as similarity
    from chunks c
    join documents d on c.document_id = d.id
    where 
        d.status = 'complete'
        and d.visibility = 'enabled'
        and 1 - (c.embedding <=> query_embedding) > match_threshold
    order by c.embedding <=> query_embedding
    limit match_count;
end;
$$; 