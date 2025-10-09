-- Create bootstrap admin user and organization
DO $$
DECLARE
    user_id UUID;
    org_id UUID;
BEGIN
    -- Generate UUID for the user
    user_id := gen_random_uuid();
    
    -- Insert into auth.users (this requires service role privileges)
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        role,
        aud,
        raw_user_meta_data
    ) VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        'momo752@qaplatform.local',
        crypt('gtm52f9abc', gen_salt('bf')),
        now(),
        now(),
        now(),
        'authenticated',
        'authenticated',
        '{"display_name": "Admin User"}'::jsonb
    );

    -- Insert into profiles (this will be handled by the trigger, but let's ensure it)
    INSERT INTO public.profiles (id, email, display_name, locale, theme)
    VALUES (
        user_id,
        'momo752@qaplatform.local', 
        'Admin User',
        'en',
        'dark'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name;

    -- Create default organization
    INSERT INTO public.orgs (id, name, slug, owner_id)
    VALUES (
        gen_random_uuid(),
        'QA Team',
        'qa-team',
        user_id
    ) RETURNING id INTO org_id;

    -- Add user as admin of the organization
    INSERT INTO public.org_members (org_id, profile_id, role)
    VALUES (org_id, user_id, 'admin');

    -- Log the successful creation
    RAISE NOTICE 'Bootstrap admin user created successfully with ID: %', user_id;
    RAISE NOTICE 'Organization created with ID: %', org_id;

END $$;