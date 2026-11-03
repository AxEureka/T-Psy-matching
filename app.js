"use strict";

const $ = (id) => document.getElementById(id);

const loginForm = $("login-form");
const signupForm = $("signup-form");
const loginPanel = $("login-panel");
const menuPanel = $("menu-panel");
const viewPanel = $("view-panel");

const supabaseClient = window.supabaseClient;

let currentUser = null;
let currentProjects = [];
let selectedProject = null;

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
    message.textContent = "Supabaseに接続できていません。";
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { nickname }
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
    message.textContent = "Supabaseに接続できていません。";
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
// ログイン状態の確認
// ------------------------------------

async function checkLogin() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    return;
  }

  if (data.session) {
    currentUser = data.session.user;

    const nickname =
      currentUser.user_metadata?.nickname || currentUser.email;

    showMenu(nickname);
  }
}

checkLogin();

// ------------------------------------
// 研究者・参加者メニュー
// ------------------------------------

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", async () => {
    const view = button.dataset.view;
    const isResearcher = view === "researcher";

    $("view-eyebrow").textContent =
      isResearcher ? "RESEARCHER" : "PARTICIPANT";

    $("view-title").textContent =
      isResearcher ? "研究者メニュー" : "参加者メニュー";

    $("researcher-dashboard").classList.toggle("hidden", !isResearcher);
    $("participant-dashboard").classList.toggle("hidden", isResearcher);

    viewPanel.classList.remove("hidden");

    if (isResearcher) {
      await loadProjects();
    }

    viewPanel.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });
});

// ------------------------------------
// 研究一覧の読み込み
// ------------------------------------

async function loadProjects() {
  const list = $("project-list");

  if (!supabaseClient) {
    list.textContent = "Supabaseに接続できていません。";
    return;
  }

  const { data: userData, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    list.textContent = "ログイン情報を確認できません。";
    return;
  }

  currentUser = userData.user;

  const { data, error } = await supabaseClient
    .from("research_projects")
    .select("*")
    .eq("owner_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    list.textContent = "研究一覧を読み込めませんでした：" + error.message;
    return;
  }

  currentProjects = data || [];

  renderProjectList();
}

// ------------------------------------
// 研究一覧の表示
// ------------------------------------

function renderProjectList() {
  const list = $("project-list");
  list.replaceChildren();

  if (currentProjects.length === 0) {
    const empty = document.createElement("p");
    empty.className = "notice";
    empty.textContent =
      "まだ研究が登録されていません。「新規作成」から研究を登録できます。";
    list.appendChild(empty);
    return;
  }

  currentProjects.forEach((project) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "project-card";

    const title = document.createElement("strong");
    title.textContent = project.title;

    const status = document.createElement("span");
    status.className = "status-badge status-" + project.status;
    status.textContent = getStatusLabel(project.status);

    const method = document.createElement("span");
    method.className = "project-meta";
    method.textContent =
      project.recruitment_method === "appointment"
        ? "日時予約方式"
        : "外部フォーム方式";

    const dates = document.createElement("span");
    dates.className = "project-meta";
    dates.textContent =
      "募集期間：" +
      (project.recruitment_start || "未設定") +
      " ～ " +
      (project.recruitment_end || "未設定");

    card.append(title, status, method, dates);

    card.addEventListener("click", () => {
      openProjectDetail(project.id);
    });

    list.appendChild(card);
  });
}

// ------------------------------------
// 募集状態の表示名
// ------------------------------------

function getStatusLabel(status) {
  const labels = {
    draft: "準備中",
    recruiting: "募集中",
    paused: "募集停止",
    closed: "募集終了"
  };

  return labels[status] || "不明";
}

// ------------------------------------
// 新規作成フォームを開く
// ------------------------------------

$("new-project-button").addEventListener("click", () => {
  $("research-form").reset();
  $("research-form-message").textContent = "";

  $("research-list-panel").classList.add("hidden");
  $("research-detail-panel").classList.add("hidden");
  $("research-form-panel").classList.remove("hidden");

  $("research-form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

// ------------------------------------
// 新規作成フォームを閉じる
// ------------------------------------

$("cancel-project-form").addEventListener("click", () => {
  $("research-form-panel").classList.add("hidden");
});

// ------------------------------------
// 研究の新規保存
// ------------------------------------

$("research-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = $("research-form-message");
  message.textContent = "保存しています...";

  const { data: userData, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    message.textContent = "ログイン情報を確認できません。";
    return;
  }

  currentUser = userData.user;

  const project = {
    owner_id: currentUser.id,
    title: $("project-title").value.trim(),
    summary: $("project-summary").value.trim(),
    target: $("project-target").value.trim(),
    recruitment_method: $("project-method").value,
    status: "draft",
    recruitment_start: $("project-start").value || null,
    recruitment_end: $("project-end").value || null,
    external_url: $("project-url").value.trim() || null
  };

  const { error } = await supabaseClient
    .from("research_projects")
    .insert(project);

  if (error) {
    console.error(error);
    message.textContent = "保存できませんでした：" + error.message;
    return;
  }

  $("research-form").reset();
  $("research-form-panel").classList.add("hidden");

  await loadProjects();

  alert("研究を保存しました。現在の状態は「準備中」です。");
});

// ------------------------------------
// 研究詳細画面
// ------------------------------------

function openProjectDetail(projectId) {
  selectedProject = currentProjects.find(
    (project) => project.id === projectId
  );

  if (!selectedProject) return;

  const content = $("project-detail-content");
  content.replaceChildren();

  const title = document.createElement("h3");
  title.textContent = selectedProject.title;

  const status = document.createElement("p");
  status.className =
    "status-badge status-" + selectedProject.status;
  status.textContent = getStatusLabel(selectedProject.status);

  const summary = document.createElement("p");
  summary.textContent =
    selectedProject.summary || "概要は未登録です。";

  const target = document.createElement("p");
  target.textContent =
    "募集対象：" + (selectedProject.target || "未設定");

  const method = document.createElement("p");
  method.textContent =
    "募集方式：" +
    (selectedProject.recruitment_method === "appointment"
      ? "日時予約方式"
      : "外部フォーム方式");

  const dates = document.createElement("p");
  dates.textContent =
    "募集期間：" +
    (selectedProject.recruitment_start || "未設定") +
    " ～ " +
    (selectedProject.recruitment_end || "未設定");

  content.append(title, status, summary, target, method, dates);

  if (selectedProject.external_url) {
    const url = document.createElement("p");
    url.textContent = "外部フォーム：" + selectedProject.external_url;
    content.appendChild(url);
  }

  $("project-detail-message").textContent = "";

    // 募集開始・再開ボタン
  const startButton = $("start-project-button");
  startButton.classList.toggle(
    "hidden",
    !["draft", "paused"].includes(selectedProject.status)
  );

  startButton.textContent =
    selectedProject.status === "paused"
      ? "募集再開"
      : "募集開始";

  // 募集停止ボタン
  const pauseButton = $("pause-project-button");
  if (pauseButton) {
    pauseButton.classList.toggle(
      "hidden",
      selectedProject.status !== "recruiting"
    );
  }

  // 募集終了ボタン
  $("close-project-button").classList.toggle(
    "hidden",
    !["recruiting", "paused"].includes(selectedProject.status)
  );

  // 編集ボタン
  $("edit-project-button").classList.toggle(
    "hidden",
    !["draft", "paused"].includes(selectedProject.status)
  );

  $("research-list-panel").classList.add("hidden");
  $("research-form-panel").classList.add("hidden");
  $("research-detail-panel").classList.remove("hidden");
  
  $("research-detail-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ------------------------------------
// 募集状態の更新
// ------------------------------------

async function updateProjectStatus(newStatus) {
  if (!selectedProject) return;

  const message = $("project-detail-message");
  message.textContent = "更新しています...";

  const { error } = await supabaseClient
    .from("research_projects")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", selectedProject.id)
    .eq("owner_id", currentUser.id);

  if (error) {
    console.error(error);
    message.textContent = "更新できませんでした：" + error.message;
    return;
  }

  await loadProjects();

  const updatedProject = currentProjects.find(
    (project) => project.id === selectedProject.id
  );

  if (updatedProject) {
    openProjectDetail(updatedProject.id);
  }
}

// 募集開始・再開
$("start-project-button").addEventListener("click", () => {
  const isRestart = selectedProject?.status === "paused";

  const confirmed = window.confirm(
    isRestart
      ? "募集を再開しますか？\n\n再開すると、参加者側に研究が公開されます。"
      : "この研究の募集を開始しますか？\n\n開始すると、参加者側に研究が公開されます。"
  );

  if (!confirmed) return;

  updateProjectStatus("recruiting");
});

// 募集一時停止
// ※ボタンはindex.htmlに追加するよ
const pauseButton = $("pause-project-button");

if (pauseButton) {
  pauseButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "募集を一時停止しますか？\n\n停止すると、参加者側に研究が表示されなくなります。募集再開はいつでもできます。"
    );

    if (!confirmed) return;

    updateProjectStatus("paused");
  });
}

// 募集終了
$("close-project-button").addEventListener("click", () => {
  const confirmed = window.confirm(
    "この募集を終了しますか？\n\n終了すると、この募集は再開できなくなります。再募集する場合は、新しい募集を作成します。"
  );

  if (!confirmed) return;

  updateProjectStatus("closed");
});

// ------------------------------------
// 研究一覧に戻る
// ------------------------------------

$("back-to-project-list").addEventListener("click", () => {
  $("research-detail-panel").classList.add("hidden");
  $("research-list-panel").classList.remove("hidden");
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

  currentUser = null;
  currentProjects = [];
  selectedProject = null;

  loginForm.reset();
  signupForm.reset();

  $("login-message").textContent = "";
  $("signup-message").textContent = "";

  menuPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");

  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
});
