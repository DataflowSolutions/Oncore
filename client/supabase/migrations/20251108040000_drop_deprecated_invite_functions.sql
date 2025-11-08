-- Drop all versions of app_accept_show_invite
-- These functions are using old show_collaborators structure that no longer has
-- invite_token or accepted_at columns

DROP FUNCTION IF EXISTS app_accept_show_invite(text);
DROP FUNCTION IF EXISTS app_accept_show_invite(uuid, text);

COMMENT ON SCHEMA public IS 'app_accept_show_invite functions removed - show invitations should be handled through the invitations table';
