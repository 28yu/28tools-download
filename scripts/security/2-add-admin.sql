-- =====================================================================
-- ステップ2: 自分を管理者の名簿に入れる
-- 先に Supabase の Authentication → Users →「Add user」→「Create new user」で
-- 自分のメールアドレスとパスワードを登録しておく（Auto Confirm User にチェック）。
-- 下の 'ここに自分のメールアドレス' を書き換えてから Run。
-- ※ このファイルにメールアドレスを書いて保存・コミットしないこと（リポジトリは公開）
-- =====================================================================
insert into public.admins (user_id, note)
select id, '運営者' from auth.users where email = 'ここに自分のメールアドレス'
on conflict (user_id) do nothing;

-- 確認: 1 行出れば成功
select a.user_id, u.email, a.created_at
  from public.admins a join auth.users u on u.id = a.user_id;
