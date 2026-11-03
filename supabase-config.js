/*
 * Supabase接続設定
 *
 * 1. Supabaseで新しいプロジェクトを作成
 * 2. Project URL と Publishable key（または anon key）を確認
 * 3. 下の2か所に設定値を貼り付ける
 *
 * 注意：
 * - ブラウザに置いてよいのは Publishable key / anon key です。
 * - service_role key や Secret key は絶対にここへ貼らないでください。
 */

"use strict";

const SUPABASE_URL = "ここにSupabaseのProject URLを貼り付け";
const SUPABASE_ANON_KEY = "ここにPublishable keyを貼り付け";

window.supabaseClient = null;

if (
  window.supabase &&
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_ANON_KEY.startsWith("ここに")
) {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  console.info("Supabaseクライアントを初期化しました");
} else {
  console.info("Supabase接続設定はまだ未入力です。画面の試作モードで起動します。");
}
