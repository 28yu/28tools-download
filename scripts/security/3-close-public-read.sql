-- =====================================================================
-- ステップ3: 「誰でも読める」許可を消す
-- 解析画面（analytics/dashboard.html）にログインして、データが表示されることを
-- 確かめてから実行する。これで訪問記録は名簿の人しか読めなくなる。
-- =====================================================================
drop policy if exists "allow anon read" on public.downloads;
drop policy if exists "allow anon read" on public.pageviews;
drop policy if exists "anon read"       on public.ga4_history;

-- 確認: anon（ログインしていない人）向けの許可が 0 行なら成功
select tablename, policyname, roles from pg_policies
 where schemaname = 'public' and 'anon' = any(roles);

-- 元に戻したいとき（緊急用）:
-- create policy "allow anon read" on public.downloads   for select to anon using (true);
-- create policy "allow anon read" on public.pageviews   for select to anon using (true);
-- create policy "anon read"       on public.ga4_history for select to anon using (true);
