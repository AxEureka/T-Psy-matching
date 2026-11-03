# 研究参加マッチングシステム
https://axeureka.github.io/T-Psy-matching/

大学内で研究募集・参加者とのマッチング・日時予約・参加履歴管理を行うWebアプリの試作です。

## 使用するサービス

- **GitHub**：プログラムファイルの保存・変更履歴管理
- **Supabase**：ログイン認証、データベース、募集資料の保存
- **HTML / CSS / JavaScript**：ブラウザに表示する画面と動作

## ファイル

| ファイル | 役割 |
|---|---|
| `index.html` | 画面の構造 |
| `style.css` | デザイン・スマートフォン対応 |
| `app.js` | 画面操作・今後追加する機能 |
| `supabase-config.js` | Supabase接続設定 |
| `README.md` | 開発メモ |

## 現在の状態

- ログイン画面の見た目
- 接続設定前に画面を確認するための仮ログイン
- 研究者／参加者メニューへの画面切り替え
- Supabaseの接続設定欄
- Supabase接続設定後のメールアドレス・パスワードログイン処理の入口

**まだ実装していないもの：** 新規アカウント登録、大学IDでのログイン、募集の作成・検索、予約枠、予約番号、参加履歴、権限管理、データベースのセキュリティ設定。

## 起動方法

開発中は、VS CodeのLive ServerなどのローカルWebサーバーで `index.html` を開いてください。HTMLファイルを直接開く方法では、認証やブラウザ機能の一部が正しく動かない場合があります。

## Supabase設定

`supabase-config.js` の次の2項目を、Supabaseプロジェクトの値に置き換えます。

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`（Publishable key または anon key）

ブラウザ側のコードに **service_role key / Secret key を絶対に置かないでください**。

Supabaseを使ったデータ保存を始める前に、テーブル設計とRow Level Security（RLS）を設定します。
