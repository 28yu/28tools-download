-- =====================================================================
-- 28tools セキュリティ設定（ステップ1）
-- Supabase の SQL Editor に全部貼り付けて「Run」を押す。何度実行しても安全。
--
-- この SQL がすること
--   1. 解析画面を見てよい人の名簿（admins）を作る
--   2. 名簿の人だけが訪問記録を読める許可を「追加」する
--      ※ 誰でも読める今の許可はまだ残す（解析画面が急に見られなくなるのを防ぐ）
--      ※ 消すのは 3-close-public-read.sql（ログイン確認後に実行）
--   3. 不審な操作を記録する表（security_events）と、記録用の関数を作る
-- =====================================================================

-- 1. 管理者の名簿 ---------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admin reads self" on public.admins;
create policy "admin reads self" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- ログイン中の人が名簿に載っているか
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. 名簿の人だけが読める許可 --------------------------------------------
drop policy if exists "admin read" on public.downloads;
drop policy if exists "admin read" on public.pageviews;
drop policy if exists "admin read" on public.ga4_history;
create policy "admin read" on public.downloads   for select to authenticated using ((select public.is_admin()));
create policy "admin read" on public.pageviews   for select to authenticated using ((select public.is_admin()));
create policy "admin read" on public.ga4_history for select to authenticated using ((select public.is_admin()));

-- 3. セキュリティ記録 -----------------------------------------------------
create table if not exists public.security_events (
  id        bigserial primary key,
  ts        timestamptz not null default now(),  -- 最初に起きた日時
  last_seen timestamptz not null default now(),  -- 最後に起きた日時
  hits      integer     not null default 1,      -- 1時間以内の同じ内容はまとめて回数で数える
  kind      text        not null,                -- 種類（下の関数を参照）
  page      text,                                -- 起きたページ
  detail    text,                                -- 中身（読み込もうとした URL など）
  ua        text,                                -- ブラウザの情報
  ip_masked text,                                -- IP アドレス（末尾を伏せたもの）
  country   text
);
create index if not exists security_events_last_seen_idx on public.security_events (last_seen desc);
create index if not exists security_events_dedupe_idx    on public.security_events (kind, page, last_seen desc);
alter table public.security_events enable row level security;
drop policy if exists "admin read" on public.security_events;
create policy "admin read" on public.security_events
  for select to authenticated using ((select public.is_admin()));
-- 表へ直接書き込む許可は誰にも与えない（書き込みは下の関数だけ）

-- サイトから呼ぶ記録用の関数
--   kind に使える値:
--     csp_violation     … 禁止している読み込み・送信をブラウザが止めた
--     unexpected_script … 許可していない場所からプログラムが読み込まれた
--     not_found         … 存在しないページへのアクセス
--     probe             … 攻撃でよく狙われる場所（/wp-admin や /.env など）へのアクセス
--     login_failed      … 解析画面のログイン失敗
--     login_success     … 解析画面のログイン成功
create or replace function public.log_security_event(p_kind text, p_page text default null, p_detail text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  h        json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip     text := trim(split_part(coalesce(h->>'cf-connecting-ip', h->>'x-forwarded-for', ''), ',', 1));
  v_mask   text;
  v_page   text := left(p_page, 300);
  v_detail text := left(p_detail, 1000);
  v_id     bigint;
begin
  if p_kind is null or p_kind not in
     ('csp_violation','unexpected_script','not_found','probe','login_failed','login_success') then
    return;
  end if;

  -- IP の末尾を伏せる（IPv4 は最後の数字、IPv6 は後ろ半分）
  if v_ip ~ '^\d{1,3}(\.\d{1,3}){3}$' then
    v_mask := regexp_replace(v_ip, '\.\d+$', '.0');
  elsif position(':' in v_ip) > 0 then
    v_mask := array_to_string((string_to_array(v_ip, ':'))[1:3], ':') || '::';
  end if;

  -- 同じ内容が1時間以内にあれば、回数だけ増やす
  select id into v_id from public.security_events
   where kind = p_kind
     and page      is not distinct from v_page
     and detail    is not distinct from v_detail
     and ip_masked is not distinct from v_mask
     and last_seen > now() - interval '1 hour'
   order by last_seen desc limit 1;
  if v_id is not null then
    update public.security_events set hits = hits + 1, last_seen = now() where id = v_id;
    return;
  end if;

  -- 大量に送りつけられても表が膨らまないよう、10分で300件まで
  if (select count(*) from public.security_events where last_seen > now() - interval '10 minutes') >= 300 then
    return;
  end if;

  insert into public.security_events (kind, page, detail, ua, ip_masked, country)
  values (p_kind, v_page, v_detail, left(h->>'user-agent', 400), v_mask, left(h->>'cf-ipcountry', 8));

  -- 180日より古い記録は消す
  delete from public.security_events where last_seen < now() - interval '180 days';
end $$;
revoke all on function public.log_security_event(text, text, text) from public;
grant execute on function public.log_security_event(text, text, text) to anon, authenticated;
