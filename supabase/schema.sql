-- 启用UUID扩展
create extension if not exists "uuid-ossp";

-- 团队表
create table if not exists public.teams (
    id uuid default uuid_generate_v4() primary key,
    code varchar(10) unique not null,
    name varchar(100) not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz default now()
);

-- 成员位置表
create table if not exists public.locations (
    id uuid default uuid_generate_v4() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    user_name varchar(100),
    lat double precision not null,
    lng double precision not null,
    address varchar(500),
    updated_at timestamptz default now(),
    unique(team_id, user_id)
);

-- 索引
create index if not exists idx_locations_team_id on public.locations(team_id);
create index if not exists idx_locations_user_id on public.locations(user_id);
create index if not exists idx_teams_code on public.teams(code);

-- 启用行级安全策略
alter table public.teams enable row level security;
alter table public.locations enable row level security;

-- 团队表策略
create policy "团队成员可查看团队" on public.teams
    for select using (
        exists (
            select 1 from public.locations
            where public.locations.team_id = public.teams.id
            and public.locations.user_id = auth.uid()
        )
    );

create policy "用户可创建团队" on public.teams
    for insert with check (auth.uid() = created_by);

-- 位置表策略
create policy "团队成员可查看位置" on public.locations
    for select using (
        exists (
            select 1 from public.locations l2
            where l2.team_id = public.locations.team_id
            and l2.user_id = auth.uid()
        )
    );

create policy "团队成员可更新位置" on public.locations
    for update using (
        exists (
            select 1 from public.locations l2
            where l2.team_id = public.locations.team_id
            and l2.user_id = auth.uid()
        )
    );

create policy "团队成员可插入位置" on public.locations
    for insert with check (
        exists (
            select 1 from public.locations l
            where l.team_id = public.locations.team_id
            and l.user_id = auth.uid()
        )
    );

-- 允许匿名读取（可选，用于公开团队）
create policy "公开团队可被任何人查看" on public.teams
    for select using (true);

-- 触发器：在插入位置时自动更新updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_locations_updated_at
    before update on public.locations
    for each row
    execute function update_updated_at_column();
