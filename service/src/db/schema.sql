-- ================================================
-- 用户角色权限系统 Schema
-- ================================================

-- 1. 角色表 (roles)
create table if not exists public.roles (
  role_id bigserial not null,
  role_name character varying(50) not null,
  role_description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint roles_pkey primary key (role_id),
  constraint roles_name_key unique (role_name)
) tablespace pg_default;

-- 创建角色表的更新时间触发器
create trigger update_roles_updated_at before
update on roles for each row
execute function update_updated_at_column ();

-- 插入默认角色
insert into public.roles (role_name, role_description) values
  ('admin', '管理员，拥有所有权限'),
  ('user', '普通用户，拥有基本权限')
on conflict (role_name) do nothing;

-- 2. 用户-角色关联表 (user_roles)
create table if not exists public.user_roles (
  user_role_id bigserial not null,
  user_id bigint not null,
  role_id bigint not null,
  created_at timestamp with time zone null default now(),
  constraint user_roles_pkey primary key (user_role_id),
  constraint user_roles_unique unique (user_id, role_id),
  constraint fk_user foreign key (user_id) references public.users (user_id) on delete cascade,
  constraint fk_role foreign key (role_id) references public.roles (role_id) on delete cascade
) tablespace pg_default;

-- 创建索引以提升查询性能
create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_user_roles_role_id on public.user_roles (role_id);

-- 3. 更新现有用户表，添加 Clerk ID 字段（用于 Clerk 集成）
alter table public.users 
  add column if not exists clerk_id character varying(255) null,
  add column if not exists avatar_url character varying(500) null,
  add column if not exists provider character varying(50) null;

-- 为 clerk_id 创建唯一索引
create unique index if not exists users_clerk_id_key on public.users (clerk_id) where clerk_id is not null;

-- 4. 创建自动分配角色的触发器函数
create or replace function assign_default_role()
returns trigger as $$
begin
  -- 为新用户自动分配 'user' 角色
  insert into public.user_roles (user_id, role_id)
  select new.user_id, role_id
  from public.roles
  where role_name = 'user';
  
  return new;
end;
$$ language plpgsql;

-- 创建触发器：用户创建后自动分配默认角色
drop trigger if exists assign_default_role_trigger on public.users;
create trigger assign_default_role_trigger
after insert on public.users
for each row
execute function assign_default_role();

-- 5. 创建辅助视图：用户及其角色
create or replace view public.v_users_with_roles as
select 
  u.user_id,
  u.username,
  u.email,
  u.phone,
  u.status,
  u.login_method,
  u.clerk_id,
  u.avatar_url,
  u.provider,
  u.created_at,
  u.updated_at,
  u.last_login_at,
  array_agg(r.role_name) as roles,
  array_agg(r.role_id) as role_ids
from public.users u
left join public.user_roles ur on u.user_id = ur.user_id
left join public.roles r on ur.role_id = r.role_id
group by u.user_id, u.username, u.email, u.phone, u.status, u.login_method, 
         u.clerk_id, u.avatar_url, u.provider, u.created_at, u.updated_at, u.last_login_at;

-- 6. RLS (Row Level Security) 策略示例（可选）
-- 启用 RLS
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

-- 允许所有人读取角色（因为角色是公开的）
create policy "Allow public read access to roles"
on public.roles for select
using (true);

-- 用户只能查看自己的信息（管理员除外）
create policy "Users can view own data"
on public.users for select
using (
  auth.uid()::text = clerk_id or
  exists (
    select 1 from public.user_roles ur
    join public.roles r on ur.role_id = r.role_id
    where ur.user_id = user_id and r.role_name = 'admin'
  )
);

-- 用户可以更新自己的信息
create policy "Users can update own data"
on public.users for update
using (auth.uid()::text = clerk_id);

-- 只有管理员可以删除用户
create policy "Only admins can delete users"
on public.users for delete
using (
  exists (
    select 1 from public.user_roles ur
    join public.roles r on ur.role_id = r.role_id
    join public.users u on ur.user_id = u.user_id
    where u.clerk_id = auth.uid()::text and r.role_name = 'admin'
  )
);

-- 用户可以查看自己的角色关联
create policy "Users can view own roles"
on public.user_roles for select
using (
  exists (
    select 1 from public.users
    where users.user_id = user_roles.user_id
    and users.clerk_id = auth.uid()::text
  ) or
  exists (
    select 1 from public.user_roles ur
    join public.roles r on ur.role_id = r.role_id
    join public.users u on ur.user_id = u.user_id
    where u.clerk_id = auth.uid()::text and r.role_name = 'admin'
  )
);

-- 为现有用户分配默认角色
insert into public.user_roles (user_id, role_id)
select u.user_id, r.role_id
from public.users u
cross join public.roles r
where r.role_name = 'user'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.user_id
  )
on conflict (user_id, role_id) do nothing;

-- ================================================
-- 说明：
-- 1. roles 表：存储系统角色（管理员、普通用户等）
-- 2. user_roles 表：用户与角色的多对多关系
-- 3. users 表：添加 clerk_id 用于 Clerk 认证集成
-- 4. 触发器：新用户自动分配 'user' 角色
-- 5. 视图：方便查询用户及其角色
-- 6. RLS 策略：行级安全控制数据访问
-- ================================================

