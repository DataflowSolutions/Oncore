-- Oncore Seed Data
SET session_replication_role = 'replica';


-- auth.users
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', 'a43f0f1c-1b37-4119-89d8-cbad45122958', 'authenticated', 'authenticated', 'testacc@gmail.com', '$2a$10$np1qDyD1gXZ6CLVWkH8vs.FratQfzti04DY3sCdNHwuB9z7JOfxJ.', '2025-10-01 16:46:57.975022+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-10-01 16:47:04.90424+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "a43f0f1c-1b37-4119-89d8-cbad45122958", "email": "testacc@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-10-01 16:46:57.963399+00', '2025-10-01 16:47:04.906186+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);

-- auth.identities
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('a43f0f1c-1b37-4119-89d8-cbad45122958', 'a43f0f1c-1b37-4119-89d8-cbad45122958', '{"sub": "a43f0f1c-1b37-4119-89d8-cbad45122958", "email": "testacc@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-10-01 16:46:57.970523+00', '2025-10-01 16:46:57.970557+00', '2025-10-01 16:46:57.970557+00', '903432a7-8a14-49d9-93d1-702683a634d1');

-- public.organizations
INSERT INTO public.organizations (id, slug, name, created_at, created_by) VALUES ('db78a629-d2c4-4031-affc-09987c9bc37e', 'dataflow-solutions', 'Dataflow Solutions', '2025-10-01 16:47:09.771331+00', 'a43f0f1c-1b37-4119-89d8-cbad45122958');

-- public.venues
INSERT INTO public.venues (id, org_id, name, address, city, country, capacity, contacts, created_at, updated_at) VALUES ('b1216d05-b54d-4609-9476-b90934614ba6', 'db78a629-d2c4-4031-affc-09987c9bc37e', 'Alive', 'Galaxen Borlange', 'Borlange', NULL, NULL, NULL, '2025-10-01 16:50:41.984782+00', '2025-10-01 16:50:41.984782+00');

-- public.shows
INSERT INTO public.shows (id, org_id, artist_id, venue_id, date, doors_at, set_time, status, title, notes, created_at, updated_at) VALUES ('380f36c2-b89b-4f01-9a35-3414fa36a637', 'db78a629-d2c4-4031-affc-09987c9bc37e', NULL, 'b1216d05-b54d-4609-9476-b90934614ba6', '2025-10-29', NULL, '2025-10-29 19:00:00+00', 'draft', 'Alive', 'Need big crew', '2025-10-01 16:50:41.996643+00', '2025-10-01 16:50:41.996643+00');

-- public.org_members
INSERT INTO public.org_members (org_id, user_id, role, invited_email, created_at) VALUES ('db78a629-d2c4-4031-affc-09987c9bc37e', 'a43f0f1c-1b37-4119-89d8-cbad45122958', 'owner', NULL, '2025-10-01 16:47:09.771331+00');

-- public.org_subscriptions
INSERT INTO public.org_subscriptions (org_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at) VALUES ('db78a629-d2c4-4031-affc-09987c9bc37e', 'solo_artist', 'trialing', NULL, NULL, '2025-10-01 16:47:09.771331+00', '2025-10-08 16:47:09.771331+00', false, '2025-10-01 16:47:09.771331+00', '2025-10-01 16:47:09.771331+00');

-- public.people
INSERT INTO public.people (id, org_id, user_id, name, email, phone, role_title, notes, created_at, updated_at, member_type) VALUES ('014440bf-ba15-440d-85ad-d7beb6b89011', 'db78a629-d2c4-4031-affc-09987c9bc37e', NULL, 'John Doe', 'johndoe@gmail.com', '728494839', 'Lead Artist', 'Great singer!', '2025-10-01 16:47:51.022895+00', '2025-10-01 16:47:51.022895+00', 'Artist');

-- public.people
INSERT INTO public.people (id, org_id, user_id, name, email, phone, role_title, notes, created_at, updated_at, member_type) VALUES ('18137ab6-0fad-40b7-9b58-b169caf5e1ad', 'db78a629-d2c4-4031-affc-09987c9bc37e', NULL, 'Johnny Doe', 'johnnydoe@gmail.com', '0709489383', 'Sound Engineer', 'Experience: 20 years', '2025-10-01 16:48:26.462503+00', '2025-10-01 16:48:26.462503+00', 'Crew');

-- public.people
INSERT INTO public.people (id, org_id, user_id, name, email, phone, role_title, notes, created_at, updated_at, member_type) VALUES ('a9245852-2c4c-4472-9212-7d0c324e55e8', 'db78a629-d2c4-4031-affc-09987c9bc37e', NULL, 'Albin Hasanaj', 'albinhasanaj06@gmail.com', '728775359', NULL, 'Experience: 19 years - The best in the world!', '2025-10-01 16:48:59.697542+00', '2025-10-01 16:48:59.697542+00', 'Manager');

-- public.people
INSERT INTO public.people (id, org_id, user_id, name, email, phone, role_title, notes, created_at, updated_at, member_type) VALUES ('b126246c-424d-4f09-ab4d-6af74c39049b', 'db78a629-d2c4-4031-affc-09987c9bc37e', NULL, 'The Rock', 'therock@gmail.com', '07070403094', 'Elite Talent Agency', 'The rock', '2025-10-01 16:49:28.524988+00', '2025-10-01 16:49:28.524988+00', 'Agent');

SET session_replication_role = 'origin';
