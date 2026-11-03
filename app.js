/*
 * 研究参加マッチングシステム
 * 初期版：画面の表示切り替えのみ。認証・データ保存は次の段階で実装します。
 */

"use strict";

const $ = (id) => document.getElementById(id);

const loginForm = $("login-form");
const loginPanel = $("login-panel");
const menuPanel = $("menu-panel");
const viewPanel = $("view-panel");
const loginMessage = $("login-message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  // Supabase接続設定が済んでいる場合は、実際のログインを試みます。
  if (window.supabaseClient) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginMessage.textContent = "ログインできませんでした：" + error.message;
      return;
    }

    showMenu(data.user?.email || email);
    return;
  }

  // 接続設定前でも画面を試せるようにした仮ログインです。
  // この仮ログインではアカウント認証やデータ保存は行われません。
  showMenu(email + "（試作モード）");
});

function showMenu(label) {
  $("signed-in-label").textContent = label;
  loginPanel.classList.add("hidden");
  menuPanel.classList.remove("hidden");
  viewPanel.classList.add("hidden");
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    const isResearcher = view === "researcher";

    $("view-eyebrow").textContent = isResearcher ? "RESEARCHER" : "PARTICIPANT";
    $("view-title").textContent = isResearcher
      ? "研究者メニュー"
      : "参加者メニュー";
    $("view-description").textContent = isResearcher
      ? "募集の作成・編集、予約状況や参加状況の確認を行う画面です。"
      : "募集中の研究を探し、予約や参加履歴を確認する画面です。";

    viewPanel.classList.remove("hidden");
    viewPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

$("back-to-menu").addEventListener("click", () => {
  viewPanel.classList.add("hidden");
});

$("logout-button").addEventListener("click", async () => {
  if (window.supabaseClient) {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) {
      alert("ログアウトできませんでした：" + error.message);
      return;
    }
  }

  loginForm.reset();
  loginMessage.textContent = "";
  menuPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
});
