-- Storage buckets and policies for Oncore (Oncore)
-- Creates buckets for documents, advancing files, and images

-- =====================================
-- CREATE STORAGE BUCKETS
-- =====================================

-- Bucket for general documents (contracts, riders, etc.)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Bucket for advancing session files
insert into storage.buckets (id, name, public)
values ('advancing-files', 'advancing-files', false)
on conflict (id) do nothing;

-- Bucket for images (logos, photos, etc.)
insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

-- Note: Storage policies are created in a later migration after tables exist