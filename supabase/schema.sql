-- PUPEELE · Supabase 建表脚本
-- 在 Supabase Dashboard → SQL Editor 里整体执行一次即可

-- 1) 定制需求表单（/request 页面提交）
create table if not exists public.requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lang       text,
  doll_type  text,
  size       text,
  style      text,
  colorway   text,
  categories text[] not null default '{}',
  qty        text,
  target     text,
  lead       text,
  name       text,
  contact    text not null,
  notes      text
);

-- 2) 询价篮（顶部「询价」抽屉发送）
create table if not exists public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lang       text,
  item_count int not null default 0,
  items      jsonb not null default '[]'::jsonb,
  text       text
);

-- 3) RLS：开启，只允许匿名「插入」，不允许读取 / 改动
alter table public.requests enable row level security;
alter table public.enquiries enable row level security;

drop policy if exists "anon_insert_requests" on public.requests;
create policy "anon_insert_requests" on public.requests
  for insert to anon, authenticated with check (true);

drop policy if exists "anon_insert_enquiries" on public.enquiries;
create policy "anon_insert_enquiries" on public.enquiries
  for insert to anon, authenticated with check (true);
