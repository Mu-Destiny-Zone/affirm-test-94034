-- First, let's check if the user is already a member of the org
DO $$
DECLARE
    current_user_id UUID := '3caf0f48-bace-4ad8-ac6a-d55a64286a6b';
    org_uuid UUID := 'dccff9c1-b9f9-46c5-a8f2-c20dd2177f69';
    existing_membership UUID;
BEGIN
    -- Check if membership already exists
    SELECT id INTO existing_membership 
    FROM org_members 
    WHERE profile_id = current_user_id 
    AND org_id = org_uuid 
    AND deleted_at IS NULL;
    
    -- If no membership exists, create one
    IF existing_membership IS NULL THEN
        INSERT INTO public.org_members (org_id, profile_id, role)
        VALUES (org_uuid, current_user_id, 'admin')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Added user % as admin to org %', current_user_id, org_uuid;
    ELSE
        RAISE NOTICE 'User % is already a member of org %', current_user_id, org_uuid;
    END IF;
END $$;