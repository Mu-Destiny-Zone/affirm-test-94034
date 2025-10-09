-- Fix the email_change field for the admin user that's causing login errors
UPDATE auth.users 
SET email_change = '' 
WHERE email = 'momo752@qaplatform.local' 
AND email_change IS NULL;