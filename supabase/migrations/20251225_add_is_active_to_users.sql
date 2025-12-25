-- Add is_active column to users table
alter table users 
add column if not exists is_active boolean default true;

-- Update RLS policies to restrict inactive users if needed 
-- (Assuming application level check is sufficient for Dashboard presence, 
--  but good to know for login - though Supabase Auth is separate from public.users table)
-- For now, just modifying the public table structure.
