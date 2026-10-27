-- ============================================================
-- PUPEELE · 账户中心（我的页面）
-- 前置：先执行 supabase/schema.sql（requests / enquiries 已存在）
-- 在 Supabase Dashboard → SQL Editor 整体执行一次即可，可重复执行
-- ============================================================

-- 1) 会员资料（一个账号一行）
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  company    text,
  phone      text,
  country    text,
  lang       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) 订阅方案 + 通知偏好
create table if not exists public.subscriptions (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  plan            text not null default 'none' check (plan in ('none', 'monthly', 'yearly')),
  started_at      timestamptz,
  expires_at      timestamptz,
  notify_new      boolean not null default true,
  notify_price    boolean not null default true,
  notify_lookbook boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- 3) 订阅变更记录（开通 / 续订 / 换方案 / 取消），供「订阅记录」面板展示
create table if not exists public.subscription_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  action       text not null check (action in ('subscribe', 'renew', 'change', 'cancel')),
  plan         text not null check (plan in ('none', 'monthly', 'yearly')),
  from_plan    text check (from_plan in ('none', 'monthly', 'yearly')),
  started_at   timestamptz,
  expires_at   timestamptz,
  amount_cents integer not null default 0,
  currency     text not null default 'USD',
  created_at   timestamptz not null default now()
);

create index if not exists subscription_logs_user_time
  on public.subscription_logs (user_id, created_at desc);

-- 4) 询价单 / 定制需求归属到账户 + 处理状态
alter table public.enquiries add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.enquiries add column if not exists status  text not null default 'new';
alter table public.requests  add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.requests  add column if not exists status  text not null default 'new';

-- 5) RLS：本人只能读写自己的数据
alter table public.profiles           enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.subscription_logs  enable row level security;
alter table public.enquiries          enable row level security;
alter table public.requests           enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 订阅记录：只读自己的 + 只能追加自己的
drop policy if exists "subscription_logs_select_own" on public.subscription_logs;
create policy "subscription_logs_select_own" on public.subscription_logs
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "subscription_logs_insert_own" on public.subscription_logs;
create policy "subscription_logs_insert_own" on public.subscription_logs
  for insert to authenticated with check (auth.uid() = user_id);

-- 提交：匿名可写（user_id 为空），登录用户只能写入自己的 user_id
drop policy if exists "anon_insert_enquiries" on public.enquiries;
drop policy if exists "insert_enquiries" on public.enquiries;
create policy "insert_enquiries" on public.enquiries
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());

drop policy if exists "anon_insert_requests" on public.requests;
drop policy if exists "insert_requests" on public.requests;
create policy "insert_requests" on public.requests
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());

-- 读取：只能看到自己的询价单
drop policy if exists "select_own_enquiries" on public.enquiries;
create policy "select_own_enquiries" on public.enquiries
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "select_own_requests" on public.requests;
create policy "select_own_requests" on public.requests
  for select to authenticated using (auth.uid() = user_id);

-- 6) 新用户注册时自动建资料行
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7) 回填已注册用户
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- 已有有效订阅的账号，补一条开通记录（只补一次）
insert into public.subscription_logs
  (user_id, action, plan, started_at, expires_at, amount_cents, currency, created_at)
select
  s.user_id,
  'subscribe',
  s.plan,
  s.started_at,
  s.expires_at,
  case s.plan when 'monthly' then 990 when 'yearly' then 9900 else 0 end,
  'USD',
  coalesce(s.started_at, s.updated_at)
from public.subscriptions s
where s.plan <> 'none'
  and not exists (
    select 1 from public.subscription_logs l where l.user_id = s.user_id
  );
