-- Fix the auth.users record for the bootstrap admin user
-- The issue is with NULL confirmation_token and other auth fields

UPDATE auth.users 
SET 
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change_token_current = '',
    confirmation_sent_at = email_confirmed_at,
    recovery_sent_at = NULL,
    email_change_sent_at = NULL,
    last_sign_in_at = NULL,
    phone_confirmed_at = NULL,
    phone_change_token = '',
    phone_change_sent_at = NULL,
    confirmed_at = email_confirmed_at,
    email_change_confirm_status = 0,
    banned_until = NULL,
    deleted_at = NULL
WHERE email = 'momo752@qaplatform.local'
AND confirmation_token IS NULL;