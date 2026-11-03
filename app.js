"use strict";

const $ = (id) => document.getElementById(id);

const loginForm = $("login-form");
const signupForm = $("signup-form");
const loginPanel = $("login-panel");
const menuPanel = $("menu-panel");
const viewPanel = $("view-panel");

const supabaseClient = window.supabaseClient;

// ------------------------------------
// ログイン・新規登録画面の切り替え
// ------------------------------------

$("show-signup").addEventListener("click", () => {
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
  $("signup-message").textContent = "";
});

$("show-login").addEventListener("click", () => {
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  $("login-message").textContent = "";
});

// ------------------------------------
// 新規登録
// ------------------------------------

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nickname = $("signup-nickname").value.trim();
  const email = $("signup-email").value.trim();
  const password = $("signup-password").value;

  const message = $("signup-message");
  message.textContent = "";

  if (!supabaseClient) {
    message.textContent = "Supabaseに接続できていません。設定を確認してください。";
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        nickname: nickname
      }
    }
  });

  if (error) {
    message.textContent = "登録できませんでした：" + error.message;
    return;
  }

  if (data.session) {
    signupForm.reset();
    showMenu(nickname);
    return;
  }

  message.textContent =
    "登録を受け付けました。大学メールに届いた確認メールを開いてください。";
});

// ------------------------------------
// ログイン
// ------------------------------------

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  const message = $("login-message");
  message.textContent = "";

  if (!supabaseClient) {
    message.textContent = "Supabaseに接続できていません。設定を確認してください。";
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = "ログインできませんでした：" + error.message;
    return;
  }

  const nickname =
    data.user?.user_metadata?.nickname || data.user?.email || email;

  showMenu(nickname);
});

// ------------------------------------
// ログイン後のメニュー表示
// ------------------------------------

function showMenu(label) {
  $("signed-in-label").textContent = label;

  loginPanel.classList.add("hidden");
  menuPanel.classList.remove("hidden");
  viewPanel.classList.add("hidden");
}

// ------------------------------------
// すでにログイン中か確認
// ------------------------------------

async function checkLogin() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    return;
  }

  if (data.session) {
    const user = data.session.user;
    const nickname =
      user.user_metadata?.nickname || user.email;

    showMenu(nickname);
  }
}

checkLogin();

// ------------------------------------
// 研究者・参加者メニュー
// ------------------------------------

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    const isResearcher = view === "researcher";

    $("view-eyebrow").textContent =
      isResearcher ? "RESEARCHER" : "PARTICIPANT";

    $("view-title").textContent =
      isResearcher ? "研究者メニュー" : "参加者メニュー";

    $("view-description").textContent = isResearcher
      ? "募集の作成・編集、予約状況や参加状況の確認を行う画面です。"
      : "募集中の研究を探し、予約や参加履歴を確認する画面です。";

    viewPanel.classList.remove("hidden");
    viewPanel.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });
});

// ------------------------------------
// メニューに戻る
// ------------------------------------

$("back-to-menu").addEventListener("click", () => {
  viewPanel.classList.add("hidden");
});

// ------------------------------------
// ログアウト
// ------------------------------------

$("logout-button").addEventListener("click", async () => {
  if (supabaseClient) {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      alert("ログアウトできませんでした：" + error.message);
      return;
    }
  }

  loginForm.reset();
  signupForm.reset();

  $("login-message").textContent = "";
  $("signup-message").textContent = "";

  menuPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");

  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
});
