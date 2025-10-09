-- Fix the auth.users record by setting required string fields to empty strings instead of NULL
UPDATE auth.users 
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    email_change_confirm_status = COALESCE(email_change_confirm_status, 0)
WHERE email = 'momo752@qaplatform.local';