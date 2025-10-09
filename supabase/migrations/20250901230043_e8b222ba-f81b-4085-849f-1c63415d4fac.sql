-- Make email optional in profiles table
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Update the handle_new_user function to handle optional email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email, -- Can be NULL now
        COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email, 'User')
    );
    RETURN NEW;
END;
$$;