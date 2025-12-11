-- Fix get_advancing_documents to return documents with their files

-- Drop the old function first (can't change return type with create or replace)
drop function if exists get_advancing_documents(uuid);

-- Create a type for the document with files response (drop if exists first)
do $$ 
begin
  if exists (select 1 from pg_type where typname = 'advancing_document_with_files') then
    drop type advancing_document_with_files cascade;
  end if;
end $$;

create type advancing_document_with_files as (
  id uuid,
  show_id uuid,
  party advancing_party,
  label text,
  created_by uuid,
  created_at timestamptz,
  files jsonb
);

-- Replace the function to return documents with files
create or replace function get_advancing_documents(p_session_id uuid)
returns setof advancing_document_with_files
language sql
security definer
set search_path = public
as $$
  select 
    ad.id,
    ad.show_id,
    ad.party,
    ad.label,
    ad.created_by,
    ad.created_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', f.id,
            'original_name', f.original_name,
            'content_type', f.content_type,
            'size_bytes', f.size_bytes,
            'storage_path', f.storage_path,
            'created_at', f.created_at
          )
          order by f.created_at desc
        )
        from files f
        where f.advancing_document_id = ad.id
      ),
      '[]'::jsonb
    ) as files
  from advancing_documents ad 
  where ad.show_id = (select show_id from show_advancing where id = p_session_id);
$$;
