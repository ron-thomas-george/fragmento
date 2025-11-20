-- Core entities
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists token_sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  level int not null check (level in (0,1,2)),
  description text,
  created_at timestamptz default now()
);

create table if not exists tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  token_set_id uuid not null references token_sets(id) on delete cascade,
  name text not null,
  type text not null,
  value jsonb not null,
  resolved_value jsonb,
  description text,
  source text not null check (source in ('web_app','figma','auto_generated')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists token_references (
  id uuid primary key default gen_random_uuid(),
  from_token_id uuid not null references tokens(id) on delete cascade,
  to_token_id uuid not null references tokens(id) on delete cascade
);

create table if not exists changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  token_id uuid references tokens(id) on delete set null,
  source text not null check (source in ('web_app','figma')),
  change_type text not null check (change_type in ('created','modified','deleted','renamed')),
  before jsonb,
  after jsonb,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version text not null,
  kind text not null check (kind in ('major','minor','patch')),
  message text not null,
  notes text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists github_integrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  repo_owner text not null,
  repo_name text not null,
  default_branch text not null default 'main',
  created_at timestamptz default now()
);

create table if not exists slack_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  webhook_url text not null,
  channel text not null,
  created_at timestamptz default now()
);
