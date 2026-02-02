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
create policy "用户可查看自己的团队" on public.teams
    for select using (auth.uid() = created_by);

create policy "用户可创建团队" on public.teams
    for insert with check (auth.uid() = created_by);

-- 位置表策略 - 简化为允许用户操作自己的位置记录
create policy "用户可查看团队位置" on public.locations
    for select using (
        team_id in (select id from public.teams where created_by = auth.uid())
        or user_id = auth.uid()
    );

create policy "用户可更新自己的位置" on public.locations
    for update using (user_id = auth.uid());

create policy "用户可插入自己的位置" on public.locations
    for insert with check (user_id = auth.uid());

create policy "用户可删除自己的位置" on public.locations
    for delete using (user_id = auth.uid());

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
