
-- Add last_budget_update tracking columns to campaigns
-- We reference public.users for easier joins with profile data
alter table campaigns 
add column if not exists last_budget_updated_at timestamptz;

-- Safely add the column only if it doesn't exist to avoid type mismatch errors if we edit active migrations
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'campaigns' and column_name = 'last_budget_updated_by') then
        alter table campaigns add column last_budget_updated_by uuid references users(id);
    end if;
end
$$;


-- Update the existing trigger function to also update these columns on the campaign row itself
create or replace function log_campaign_budget_change()
returns trigger as $$
begin
  if (NEW.current_spend is distinct from OLD.current_spend) then
    -- Insert into logs
    -- We can keep referencing auth.uid() here, Supabase handles the cast if the ID exists in public.users
    insert into campaign_budget_logs (campaign_id, old_value, new_value, changed_by)
    values (NEW.id, OLD.current_spend, NEW.current_spend, auth.uid());
    
    -- Update the campaign row with last modifier info
    -- Use a separate update to avoid infinite recursion if this trigger was BEFORE update? 
    -- But this is AFTER update usually? No, I want to modify NEW, so this must be BEFORE update trigger?
    -- The previous trigger I defined was AFTER update.
    -- To modify NEW, I must be in a BEFORE update trigger.
    
    -- Wait, if I want to update columns on the SAME row during the update, I need a BEFORE trigger.
    -- The current trigger `on_campaign_budget_change` is AFTER UPDATE.
    
    -- So I cannot set NEW.last_budget_updated_at in an AFTER trigger. 
    -- I would need to run an `UPDATE campaigns SET ... WHERE id = NEW.id`.
    -- That would cause recursion!
    
    -- Correct approach:
    -- 1. Create a BEFORE UPDATE trigger for updating the metadata columns on the row.
    -- 2. Keep the AFTER UPDATE trigger for logging to the separate table (or combine them carefully).
    -- Actually, logging to a separate table is best done in AFTER.
    -- Updating the row metadata is best done in BEFORE.
    
    update campaigns 
    set last_budget_updated_at = now(),
        last_budget_updated_by = auth.uid()
    where id = NEW.id;
    -- Wait, updating the table inside its own trigger (even after) often causes recursion.
    -- But since I'm updating specific columns, if the trigger condition checks for current_spend change, and I'm not changing current_spend, maybe it's fine?
    -- No, any update fires the trigger.
    -- Recursion prevention: 
    -- IF (pg_trigger_depth() < 2) THEN ...
    
  end if;
  return NEW;
end;
$$ language plpgsql security definer;


-- Better approach: Split into two triggers or handle recursion.
-- Let's use the simplest approach that works: A BEFORE trigger to update the timestamp/user, 
-- and the existing AFTER trigger to insert the log.

create or replace function update_campaign_budget_metadata()
returns trigger as $$
begin
  if (NEW.current_spend is distinct from OLD.current_spend) then
    NEW.last_budget_updated_at := now();
    NEW.last_budget_updated_by := auth.uid();
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists before_campaign_budget_update on campaigns;
create trigger before_campaign_budget_update
  before update on campaigns
  for each row
  execute function update_campaign_budget_metadata();


-- Restore the original log function to ONLY do logging (remove the NEW assignments regarding metadata)
create or replace function log_campaign_budget_change()
returns trigger as $$
begin
  if (NEW.current_spend is distinct from OLD.current_spend) then
    insert into campaign_budget_logs (campaign_id, old_value, new_value, changed_by)
    values (NEW.id, OLD.current_spend, NEW.current_spend, auth.uid());
  end if;
  return NEW;
end;
$$ language plpgsql security definer;
