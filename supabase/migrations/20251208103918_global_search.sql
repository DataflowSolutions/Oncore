-- Create global search RPC function
-- This function searches across multiple tables in the organization
-- and returns unified results for shows, venues, people, contacts, calendar events, documents, and files

CREATE OR REPLACE FUNCTION global_search(
  p_org_id uuid,
  p_query text,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  subtitle text,
  url text,
  match_field text,
  date timestamptz,
  relevance int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Shows
  SELECT 
    s.id,
    'show'::text as type,
    s.title as title,
    COALESCE(
      TO_CHAR(s.date, 'Mon DD, YYYY') || 
      CASE WHEN v.name IS NOT NULL THEN ' • ' || v.name ELSE '' END ||
      CASE WHEN v.city IS NOT NULL THEN ', ' || v.city ELSE '' END,
      'No date'
    ) as subtitle,
    '/shows/' || s.id::text as url,
    CASE 
      WHEN s.title ILIKE '%' || p_query || '%' THEN 'title'
      WHEN s.notes ILIKE '%' || p_query || '%' THEN 'notes'
      WHEN TO_CHAR(s.date, 'YYYY-MM-DD') ILIKE '%' || p_query || '%' THEN 'date'
      ELSE 'other'
    END as match_field,
    s.date as date,
    CASE 
      WHEN s.title ILIKE p_query || '%' THEN 100
      WHEN s.title ILIKE '%' || p_query || '%' THEN 90
      WHEN TO_CHAR(s.date, 'YYYY-MM-DD') = p_query THEN 85
      WHEN TO_CHAR(s.date, 'YYYY-MM-DD') ILIKE '%' || p_query || '%' THEN 80
      ELSE 50
    END as relevance
  FROM shows s
  LEFT JOIN venues v ON s.venue_id = v.id
  WHERE s.org_id = p_org_id
    AND (
      s.title ILIKE '%' || p_query || '%'
      OR s.notes ILIKE '%' || p_query || '%'
      OR TO_CHAR(s.date, 'YYYY-MM-DD') ILIKE '%' || p_query || '%'
      OR TO_CHAR(s.date, 'Mon DD, YYYY') ILIKE '%' || p_query || '%'
      OR v.name ILIKE '%' || p_query || '%'
      OR v.city ILIKE '%' || p_query || '%'
    )

  UNION ALL

  -- Venues
  SELECT 
    v.id,
    'venue'::text as type,
    v.name as title,
    COALESCE(
      CASE WHEN v.city IS NOT NULL AND v.country IS NOT NULL THEN v.city || ', ' || v.country
           WHEN v.city IS NOT NULL THEN v.city
           WHEN v.country IS NOT NULL THEN v.country
           ELSE 'No location'
      END,
      'No location'
    ) as subtitle,
    '/network?venue=' || v.id::text as url,
    CASE 
      WHEN v.name ILIKE '%' || p_query || '%' THEN 'name'
      WHEN v.city ILIKE '%' || p_query || '%' THEN 'city'
      WHEN v.country ILIKE '%' || p_query || '%' THEN 'country'
      WHEN v.address ILIKE '%' || p_query || '%' THEN 'address'
      ELSE 'notes'
    END as match_field,
    NULL::timestamptz as date,
    CASE 
      WHEN v.name ILIKE p_query || '%' THEN 100
      WHEN v.name ILIKE '%' || p_query || '%' THEN 90
      WHEN v.city ILIKE p_query || '%' THEN 80
      ELSE 50
    END as relevance
  FROM venues v
  WHERE v.org_id = p_org_id
    AND (
      v.name ILIKE '%' || p_query || '%'
      OR v.city ILIKE '%' || p_query || '%'
      OR v.country ILIKE '%' || p_query || '%'
      OR v.address ILIKE '%' || p_query || '%'
      OR v.notes ILIKE '%' || p_query || '%'
    )

  UNION ALL

  -- People
  SELECT 
    p.id,
    'person'::text as type,
    p.name as title,
    COALESCE(
      CASE WHEN p.role_title IS NOT NULL AND p.member_type IS NOT NULL THEN p.role_title || ' • ' || INITCAP(p.member_type::text)
           WHEN p.role_title IS NOT NULL THEN p.role_title
           WHEN p.member_type IS NOT NULL THEN INITCAP(p.member_type::text)
           WHEN p.email IS NOT NULL THEN p.email
           ELSE 'Contact'
      END,
      'Contact'
    ) as subtitle,
    '/people' as url,
    CASE 
      WHEN p.name ILIKE '%' || p_query || '%' THEN 'name'
      WHEN p.email ILIKE '%' || p_query || '%' THEN 'email'
      WHEN p.phone ILIKE '%' || p_query || '%' THEN 'phone'
      WHEN p.role_title ILIKE '%' || p_query || '%' THEN 'role'
      ELSE 'other'
    END as match_field,
    NULL::timestamptz as date,
    CASE 
      WHEN p.name ILIKE p_query || '%' THEN 100
      WHEN p.name ILIKE '%' || p_query || '%' THEN 90
      WHEN p.email ILIKE p_query || '%' THEN 80
      ELSE 50
    END as relevance
  FROM people p
  WHERE p.org_id = p_org_id
    AND (
      p.name ILIKE '%' || p_query || '%'
      OR p.email ILIKE '%' || p_query || '%'
      OR p.phone ILIKE '%' || p_query || '%'
      OR p.role_title ILIKE '%' || p_query || '%'
      OR p.notes ILIKE '%' || p_query || '%'
    )

  UNION ALL

  -- Contacts/Promoters
  SELECT 
    c.id,
    CASE WHEN c.contact_type = 'promoter' THEN 'promoter' ELSE 'contact' END::text as type,
    c.name as title,
    COALESCE(
      CASE WHEN c.company IS NOT NULL AND c.city IS NOT NULL THEN c.company || ' • ' || c.city
           WHEN c.company IS NOT NULL THEN c.company
           WHEN c.city IS NOT NULL AND c.country IS NOT NULL THEN c.city || ', ' || c.country
           WHEN c.city IS NOT NULL THEN c.city
           WHEN c.email IS NOT NULL THEN c.email
           ELSE 'Contact'
      END,
      'Contact'
    ) as subtitle,
    '/network?promoter=' || c.id::text as url,
    CASE 
      WHEN c.name ILIKE '%' || p_query || '%' THEN 'name'
      WHEN c.company ILIKE '%' || p_query || '%' THEN 'company'
      WHEN c.email ILIKE '%' || p_query || '%' THEN 'email'
      WHEN c.city ILIKE '%' || p_query || '%' THEN 'city'
      ELSE 'other'
    END as match_field,
    NULL::timestamptz as date,
    CASE 
      WHEN c.name ILIKE p_query || '%' THEN 100
      WHEN c.name ILIKE '%' || p_query || '%' THEN 90
      WHEN c.company ILIKE p_query || '%' THEN 85
      WHEN c.email ILIKE p_query || '%' THEN 80
      ELSE 50
    END as relevance
  FROM contacts c
  WHERE c.org_id = p_org_id
    AND (
      c.name ILIKE '%' || p_query || '%'
      OR c.email ILIKE '%' || p_query || '%'
      OR c.phone ILIKE '%' || p_query || '%'
      OR c.company ILIKE '%' || p_query || '%'
      OR c.city ILIKE '%' || p_query || '%'
      OR c.country ILIKE '%' || p_query || '%'
      OR c.role ILIKE '%' || p_query || '%'
      OR c.notes ILIKE '%' || p_query || '%'
    )

  UNION ALL

  -- Calendar/Schedule Events
  SELECT 
    si.id,
    'event'::text as type,
    si.title as title,
    COALESCE(
      TO_CHAR(si.starts_at, 'Mon DD, YYYY HH24:MI') ||
      CASE WHEN si.location IS NOT NULL THEN ' • ' || si.location ELSE '' END,
      'No date'
    ) as subtitle,
    '/shows/' || si.show_id::text || '/day-schedule' as url,
    CASE 
      WHEN si.title ILIKE '%' || p_query || '%' THEN 'title'
      WHEN si.location ILIKE '%' || p_query || '%' THEN 'location'
      WHEN TO_CHAR(si.starts_at, 'YYYY-MM-DD') ILIKE '%' || p_query || '%' THEN 'date'
      ELSE 'notes'
    END as match_field,
    si.starts_at as date,
    CASE 
      WHEN si.title ILIKE p_query || '%' THEN 100
      WHEN si.title ILIKE '%' || p_query || '%' THEN 90
      WHEN TO_CHAR(si.starts_at, 'YYYY-MM-DD') = p_query THEN 85
      ELSE 50
    END as relevance
  FROM schedule_items si
  WHERE si.org_id = p_org_id
    AND (
      si.title ILIKE '%' || p_query || '%'
      OR si.location ILIKE '%' || p_query || '%'
      OR si.notes ILIKE '%' || p_query || '%'
      OR TO_CHAR(si.starts_at, 'YYYY-MM-DD') ILIKE '%' || p_query || '%'
      OR TO_CHAR(si.starts_at, 'Mon DD, YYYY') ILIKE '%' || p_query || '%'
    )

  UNION ALL

  -- Documents
  SELECT 
    d.id,
    'document'::text as type,
    d.label as title,
    COALESCE(
      INITCAP(d.party::text) ||
      CASE WHEN s.title IS NOT NULL THEN ' • ' || s.title ELSE '' END,
      'Document'
    ) as subtitle,
    '/shows/' || d.show_id::text || '/advancing' as url,
    CASE 
      WHEN d.label ILIKE '%' || p_query || '%' THEN 'label'
      ELSE 'type'
    END as match_field,
    d.created_at as date,
    CASE 
      WHEN d.label ILIKE p_query || '%' THEN 100
      WHEN d.label ILIKE '%' || p_query || '%' THEN 90
      ELSE 50
    END as relevance
  FROM advancing_documents d
  JOIN shows s ON d.show_id = s.id
  WHERE s.org_id = p_org_id
    AND d.label ILIKE '%' || p_query || '%'

  UNION ALL

  -- Files
  SELECT 
    f.id,
    'file'::text as type,
    COALESCE(f.advancing_ref, f.original_name) as title,
    COALESCE(
      f.original_name ||
      CASE WHEN s.title IS NOT NULL THEN ' • ' || s.title ELSE '' END,
      'File'
    ) as subtitle,
    '/shows/' || f.show_id::text || '/advancing' as url,
    CASE 
      WHEN f.original_name ILIKE '%' || p_query || '%' THEN 'filename'
      ELSE 'reference'
    END as match_field,
    f.created_at as date,
    CASE 
      WHEN f.original_name ILIKE p_query || '%' THEN 100
      WHEN f.original_name ILIKE '%' || p_query || '%' THEN 90
      WHEN f.advancing_ref ILIKE p_query || '%' THEN 85
      ELSE 50
    END as relevance
  FROM files f
  JOIN shows s ON f.show_id = s.id
  WHERE s.org_id = p_org_id
    AND (
      f.original_name ILIKE '%' || p_query || '%'
      OR f.advancing_ref ILIKE '%' || p_query || '%'
    )

  ORDER BY relevance DESC, date DESC NULLS LAST
  LIMIT p_limit;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION global_search(uuid, text, int) TO authenticated;
