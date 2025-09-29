-- Row Level Security (RLS) policies for Oncore (Oncore)
-- Enable RLS and create helper functions and policies

-- =====================================
-- HELPER FUNCTIONS
-- =====================================

-- Note: auth.jwt() and auth.uid() are built-in Supabase functions

-- Helper function to check org membership
create or replace function public.is_org_member(p_org uuid) returns boolean language sql stable as $$
  select exists(select 1 from org_members where org_id=p_org and user_id=auth.uid());
$$;

-- Helper function to check show access
create or replace function public.has_show_access(p_show uuid, min_role text) returns boolean
language sql stable as $$
  with me as (
    select role from show_collaborators where show_id=p_show and user_id=auth.uid()
  )
  select case
    when (select role from me) is null then false
    when min_role='view' then true
    when min_role='edit' then (select role from me) in ('promoter_editor')
    else false
  end;
$$;

-- =====================================
-- ENABLE RLS ON ALL TABLES
-- =====================================

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table artists enable row level security;
alter table venues enable row level security;
alter table shows enable row level security;
alter table show_collaborators enable row level security;
alter table advancing_sessions enable row level security;
alter table advancing_fields enable row level security;
alter table advancing_comments enable row level security;
alter table advancing_documents enable row level security;
alter table files enable row level security;
alter table people enable row level security;
alter table show_assignments enable row level security;
alter table schedule_items enable row level security;

-- =====================================
-- ORGANIZATIONS POLICIES
-- =====================================

create policy org_select on organizations for select using (public.is_org_member(id));
create policy org_insert on organizations for insert with check (true); -- Anyone can create an org
create policy org_update on organizations for update using (public.is_org_member(id));
create policy org_delete on organizations for delete using (
  exists(select 1 from org_members where org_id=id and user_id=auth.uid() and role='owner')
);

-- =====================================
-- ORG MEMBERS POLICIES
-- =====================================

create policy org_members_select on org_members for select using (public.is_org_member(org_id));
create policy org_members_insert on org_members for insert with check (
  exists(select 1 from org_members where org_id=org_members.org_id and user_id=auth.uid() and role in ('owner','admin'))
);
create policy org_members_update on org_members for update using (
  exists(select 1 from org_members where org_id=org_members.org_id and user_id=auth.uid() and role in ('owner','admin'))
);
create policy org_members_delete on org_members for delete using (
  exists(select 1 from org_members where org_id=org_members.org_id and user_id=auth.uid() and role in ('owner','admin'))
);

-- =====================================
-- SHOWS POLICIES
-- =====================================

create policy shows_select on shows for select
  using (public.is_org_member(org_id) or public.has_show_access(id,'view'));
create policy shows_insert on shows for insert with check (public.is_org_member(org_id));
create policy shows_update on shows for update using (public.is_org_member(org_id));
create policy shows_delete on shows for delete using (public.is_org_member(org_id));

-- =====================================
-- SHOW COLLABORATORS POLICIES
-- =====================================

create policy show_collaborators_select on show_collaborators for select
  using (exists(select 1 from shows s where s.id=show_id and (public.is_org_member(s.org_id) or public.has_show_access(s.id,'view'))));
create policy show_collaborators_insert on show_collaborators for insert
  with check (exists(select 1 from shows s where s.id=show_id and public.is_org_member(s.org_id)));
create policy show_collaborators_update on show_collaborators for update
  using (exists(select 1 from shows s where s.id=show_id and public.is_org_member(s.org_id)));
create policy show_collaborators_delete on show_collaborators for delete
  using (exists(select 1 from shows s where s.id=show_id and public.is_org_member(s.org_id)));

-- =====================================
-- ADVANCING SESSIONS POLICIES
-- =====================================

create policy adv_sessions_select on advancing_sessions for select
  using (public.is_org_member(org_id) or public.has_show_access(show_id,'view'));
create policy adv_sessions_insert on advancing_sessions for insert with check (public.is_org_member(org_id));
create policy adv_sessions_update on advancing_sessions for update using (public.is_org_member(org_id));
create policy adv_sessions_delete on advancing_sessions for delete using (public.is_org_member(org_id));

-- =====================================
-- ADVANCING FIELDS POLICIES
-- =====================================

create policy adv_fields_select on advancing_fields for select
  using (exists (select 1 from advancing_sessions s
        where s.id=session_id and (public.is_org_member(s.org_id) or public.has_show_access(s.show_id,'view'))));
create policy adv_fields_insert on advancing_fields for insert with check (
  exists (select 1 from advancing_sessions s
        where s.id=session_id and (public.is_org_member(s.org_id) or public.has_show_access(s.show_id,'edit')))
);
create policy adv_fields_update on advancing_fields for update using (
  exists (select 1 from advancing_sessions s
        where s.id=session_id and (public.is_org_member(s.org_id) or public.has_show_access(s.show_id,'edit')))
);
create policy adv_fields_delete on advancing_fields for delete using (
  exists (select 1 from advancing_sessions s
        where s.id=session_id and public.is_org_member(s.org_id))
);

-- =====================================
-- ADVANCING COMMENTS POLICIES
-- =====================================

create policy adv_comments_select on advancing_comments for select
  using (exists (select 1 from advancing_fields f
                join advancing_sessions s on s.id=f.session_id
                where f.id=field_id and (public.is_org_member(s.org_id) or public.has_show_access(s.show_id,'view'))));
create policy adv_comments_insert on advancing_comments for insert with check (
  exists (select 1 from advancing_fields f
                join advancing_sessions s on s.id=f.session_id
                where f.id=field_id and (public.is_org_member(s.org_id) or public.has_show_access(s.show_id,'edit')))
);

-- =====================================
-- FILES POLICIES
-- =====================================

create policy files_select on files for select
  using (public.is_org_member(org_id) or 
         (session_id is not null and exists(select 1 from advancing_sessions s
                                           where s.id=session_id and public.has_show_access(s.show_id,'view'))));
create policy files_insert on files for insert with check (
  public.is_org_member(org_id) or 
  (session_id is not null and exists(select 1 from advancing_sessions s
                                    where s.id=session_id and public.has_show_access(s.show_id,'edit')))
);
create policy files_delete on files for delete using (
  public.is_org_member(org_id)
);

-- =====================================
-- ARTISTS, VENUES, PEOPLE POLICIES
-- =====================================

create policy artists_select on artists for select using (public.is_org_member(org_id));
create policy artists_insert on artists for insert with check (public.is_org_member(org_id));
create policy artists_update on artists for update using (public.is_org_member(org_id));
create policy artists_delete on artists for delete using (public.is_org_member(org_id));

create policy venues_select on venues for select using (public.is_org_member(org_id));
create policy venues_insert on venues for insert with check (public.is_org_member(org_id));
create policy venues_update on venues for update using (public.is_org_member(org_id));
create policy venues_delete on venues for delete using (public.is_org_member(org_id));

create policy people_select on people for select using (public.is_org_member(org_id));
create policy people_insert on people for insert with check (public.is_org_member(org_id));
create policy people_update on people for update using (public.is_org_member(org_id));
create policy people_delete on people for delete using (public.is_org_member(org_id));

-- =====================================
-- SCHEDULE AND ASSIGNMENTS POLICIES
-- =====================================

create policy schedule_items_select on schedule_items for select using (public.is_org_member(org_id));
create policy schedule_items_insert on schedule_items for insert with check (public.is_org_member(org_id));
create policy schedule_items_update on schedule_items for update using (public.is_org_member(org_id));
create policy schedule_items_delete on schedule_items for delete using (public.is_org_member(org_id));

create policy show_assignments_select on show_assignments for select
  using (exists(select 1 from shows s where s.id=show_id and public.is_org_member(s.org_id)));
create policy show_assignments_insert on show_assignments for insert
  with check (exists(select 1 from shows s where s.id=show_id and public.is_org_member(s.org_id)));
create policy show_assignments_update on show_assignments for update
  using (exists(select 1 from shows s where s.id=show_id and public.is_org_member(s.org_id)));
create policy show_assignments_delete on show_assignments for delete
  using (exists(select 1 from shows s where s.id=show_id and public.is_org_member(s.org_id)));