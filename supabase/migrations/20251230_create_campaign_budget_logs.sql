
create table if not exists campaign_budget_logs (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  old_value numeric,
  new_value numeric,
  changed_at timestamptz default now() not null,
  changed_by uuid references auth.users(id)
);

-- Index for faster lookups
create index if not exists idx_campaign_budget_logs_campaign_id on campaign_budget_logs(campaign_id);

-- Trigger function
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

-- Trigger
drop trigger if exists on_campaign_budget_change on campaigns;
create trigger on_campaign_budget_change
  after update on campaigns
  for each row
  execute function log_campaign_budget_change();
