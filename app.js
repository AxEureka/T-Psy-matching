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
let selectedDeletedProject = null;
let editingProjectId = null;

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
    .is("deleted_at", null)
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

    const duration = document.createElement("span");
    duration.className = "project-meta";
    duration.textContent =
      "所要時間の目安：" +
      (project.duration_estimate_minutes
        ? project.duration_estimate_minutes + "分"
        : "未設定");

    // 最終更新日時
    const updated = document.createElement("span");
    updated.className = "project-meta";
    
    updated.textContent =
      "最終更新：" +
      (project.updated_at
        ? new Date(project.updated_at).toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "未記録");
        
    card.append(title, status, method, dates, duration, updated);

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
  editingProjectId = null;
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
// 研究フォームをキャンセル
// ------------------------------------

$("cancel-project-form").addEventListener("click", () => {

  // 編集中の場合
  if (editingProjectId !== null) {

    // 編集状態を解除
    editingProjectId = null;

    // 編集フォームを閉じる
    $("research-form-panel").classList.add("hidden");

    // 研究詳細画面に戻る
    $("research-detail-panel").classList.remove("hidden");

  } else {

    // 新規作成中の場合は研究一覧に戻る
    $("research-form-panel").classList.add("hidden");
    $("research-list-panel").classList.remove("hidden");
  }

  // 入力内容をリセット
  $("research-form").reset();
  $("research-form-message").textContent = "";

  // 見出しとボタンを元に戻す
  $("research-form-panel").querySelector("h3").textContent =
    "新しい研究を作成";

  $("research-form").querySelector('button[type="submit"]').textContent =
    "保存する";

  // 募集方式の入力欄を初期状態に戻す
  updateRecruitmentMethodFields();
});

// ------------------------------------
// 研究の新規保存・編集保存
// ------------------------------------

$("research-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = $("research-form-message");
  const isEditing = editingProjectId !== null;

  message.textContent = isEditing
    ? "変更を保存しています..."
    : "保存しています...";

  const { data: userData, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    message.textContent = "ログイン情報を確認できません。";
    return;
  }

  currentUser = userData.user;

  // 保存する研究情報
  const project = {
    title: $("project-title").value.trim(),
    summary: $("project-summary").value.trim(),
    target: $("project-target").value.trim(),
    duration_estimate_minutes:
      $("project-duration-estimate").value
        ? Number($("project-duration-estimate").value)
        : null,
    recruitment_method: $("project-method").value,
    recruitment_start: $("project-start").value || null,
    recruitment_end: $("project-end").value || null,

    // 実験実施期間
    appointment_date_start:
      $("appointment-date-start").value || null,
    appointment_date_end:
      $("appointment-date-end").value || null,

    // 実験場所
    appointment_location_type:
      $("appointment-location-type").value || "specified",
    appointment_location:
      $("appointment-location").value.trim() || null,
    
    // 日別の予約設定
    appointment_days: appointmentDays,
    
    external_url: $("project-url").value.trim() || null,
    updated_at: new Date().toISOString()
    
    external_url: $("project-url").value.trim() || null,
    updated_at: new Date().toISOString()
  };
  let error;

    // ------------------------------------
  // 研究タイトルの重複チェック
  // ------------------------------------

  const { data: existingProjects, error: checkError } =
    await supabaseClient
      .from("research_projects")
      .select("id, title")
      .eq("owner_id", currentUser.id);

  if (checkError) {
    console.error(checkError);
    message.textContent =
      "重複チェックに失敗しました：" + checkError.message;
    return;
  }

  const normalizedTitle = project.title.toLowerCase().trim();

  const duplicate = (existingProjects || []).some((existing) => {
    if (isEditing && existing.id === editingProjectId) {
      return false;
    }

    return existing.title.toLowerCase().trim() === normalizedTitle;
  });

  if (duplicate) {
    message.textContent =
      "同じタイトルの研究が既に登録されています。別のタイトルを入力してください。";
    return;
  }

  if (isEditing) {
    // 既存の研究を更新
    const result = await supabaseClient
      .from("research_projects")
      .update(project)
      .eq("id", editingProjectId)
      .eq("owner_id", currentUser.id);

    error = result.error;

  } else {
    // 新しい研究を作成
    const result = await supabaseClient
      .from("research_projects")
      .insert({
        ...project,
        owner_id: currentUser.id,
        status: "draft"
      });

    error = result.error;
  }

  if (error) {
    console.error(error);
    message.textContent =
      "保存できませんでした：" + error.message;
    return;
  }

  // 編集状態を解除
  const savedProjectId = editingProjectId;
  editingProjectId = null;

  // フォームを初期化
  $("research-form").reset();
  $("research-form-panel").classList.add("hidden");

  $("research-form-panel").querySelector("h3").textContent =
    "新しい研究を作成";

  $("research-form").querySelector('button[type="submit"]').textContent =
    "保存する";

  // 最新の研究一覧を取得
  await loadProjects();

  if (isEditing) {
    alert("研究内容を更新しました。");

    // 更新した研究の詳細画面に戻る
    openProjectDetail(savedProjectId);

  } else {
    alert("研究を保存しました。現在の状態は「準備中」です。");

    // 新規作成した研究の詳細画面を開く
    const newProject = currentProjects[0];

    if (newProject) {
      openProjectDetail(newProject.id);
    } else {
      $("research-list-panel").classList.remove("hidden");
    }
  }
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

  const duration = document.createElement("p");
  duration.textContent =
    "所要時間の目安：" +
    (selectedProject.duration_estimate_minutes
      ? selectedProject.duration_estimate_minutes + "分"
      : "未設定");

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

  content.append(title, status, summary, target, duration, method, dates);

  if (selectedProject.external_url) {
    const url = document.createElement("p");
    url.textContent = "外部フォーム：" + selectedProject.external_url;
    content.appendChild(url);
  }

  $("project-detail-message").textContent = "";

   // ------------------------------------
  // 研究状態ごとのボタン表示
  // ------------------------------------

  const projectStatus = selectedProject.status;

  // 募集開始・再開
  const startButton = $("start-project-button");
  startButton.classList.toggle(
    "hidden",
    !["draft", "paused"].includes(projectStatus)
  );

  startButton.textContent =
    projectStatus === "paused" ? "募集再開" : "募集開始";

  // 募集停止
  $("pause-project-button").classList.toggle(
    "hidden",
    projectStatus !== "recruiting"
  );

  // 募集終了
  $("close-project-button").classList.toggle(
    "hidden",
    !["recruiting", "paused"].includes(projectStatus)
  );

  // 再募集設定ボタン
  const reRecruitmentButton = $("re-recruitment-button");
  
  reRecruitmentButton.classList.toggle(
    "hidden",
    projectStatus !== "closed"
  );
  
  // 再募集設定欄は最初は閉じておく
  $("re-recruitment-panel").classList.add("hidden");
  $("re-recruitment-message").textContent = "";

  // 編集
  $("edit-project-button").classList.toggle(
    "hidden",
    !["draft", "paused"].includes(projectStatus)
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
// 研究の編集画面を開く
// ------------------------------------

$("edit-project-button").addEventListener("click", () => {
  if (!selectedProject) return;

  // 編集できる状態か確認
  if (!["draft", "paused"].includes(selectedProject.status)) {
    alert("この研究は現在編集できません。");
    return;
  }

  // 編集する研究IDを記録
  editingProjectId = selectedProject.id;

  // 既存の研究情報をフォームに読み込む
  $("project-title").value = selectedProject.title || "";
  $("project-summary").value = selectedProject.summary || "";
  $("project-target").value = selectedProject.target || "";
  $("project-duration-estimate").value =
    selectedProject.duration_estimate_minutes ?? "";
  $("project-method").value = selectedProject.recruitment_method || "";
  updateRecruitmentMethodFields();
  $("project-start").value = selectedProject.recruitment_start || "";
  $("project-end").value = selectedProject.recruitment_end || "";
  
  // 実験実施期間
  $("appointment-date-start").value =
    selectedProject.appointment_date_start || "";
  $("appointment-date-end").value =
    selectedProject.appointment_date_end || "";
  
  $("project-url").value = selectedProject.external_url || "";
  // 編集画面の見出しとボタンを変更
  $("research-form-panel").querySelector("h3").textContent = "研究を編集";
  $("research-form").querySelector('button[type="submit"]').textContent =
    "変更を保存";

  // 画面を切り替える
  $("research-detail-panel").classList.add("hidden");
  $("research-form-panel").classList.remove("hidden");

  $("research-form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});
  
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
    "この募集を終了しますか？\n\n終了後は通常の募集再開ができなくなります。再募集する場合は、同じ研究の募集期間を延長できます。"
  );

  if (!confirmed) return;

  updateProjectStatus("closed");
}); 

// ------------------------------------
// 研究の論理削除
// ------------------------------------

$("delete-project-button").addEventListener("click", async () => {
  if (!selectedProject) return;

  const projectId = selectedProject.id;
  const projectTitle = selectedProject.title;

  const confirmed = confirm(
    `「${projectTitle}」を削除しますか？\n\n` +
    "削除した研究は通常の研究一覧から非表示になります。\n" +
    "参加者の予約・参加履歴は保持されます。\n\n" +
    "削除済みの研究一覧から復元することもできます。"
  );

  if (!confirmed) return;

  const message = $("project-detail-message");
  message.textContent = "削除しています...";

  const { data, error } = await supabaseClient
    .from("research_projects")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId)
    .eq("owner_id", currentUser.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    message.textContent =
      "削除できませんでした。" +
      (error ? error.message : "研究情報を確認してください。");
    return;
  }

  selectedProject = null;

  alert("研究を削除しました。");

  $("research-detail-panel").classList.add("hidden");
  $("research-list-panel").classList.remove("hidden");

  await loadProjects();
});

// ------------------------------------
// 再募集設定画面を開く
// ------------------------------------

$("re-recruitment-button").addEventListener("click", () => {
  if (!selectedProject) return;

  if (selectedProject.status !== "closed") {
    alert("募集終了した研究のみ再募集できます。");
    return;
  }

  $("re-recruitment-start").value = "";
  $("re-recruitment-end").value = "";
  $("re-recruitment-message").textContent = "";

  $("re-recruitment-panel").classList.remove("hidden");

  $("re-recruitment-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});


// ------------------------------------
// 再募集を開始
// ------------------------------------

$("save-re-recruitment").addEventListener("click", async () => {
  if (!selectedProject) return;

  const startDate = $("re-recruitment-start").value;
  const endDate = $("re-recruitment-end").value;
  const message = $("re-recruitment-message");

  if (!startDate || !endDate) {
    message.textContent = "募集開始日と募集終了日を入力してください。";
    return;
  }

  if (startDate > endDate) {
    message.textContent = "募集終了日は募集開始日以降に設定してください。";
    return;
  }

  const confirmed = confirm(
    "この研究の再募集を開始しますか？"
  );

  if (!confirmed) return;

  message.textContent = "再募集を開始しています...";

  const projectId = selectedProject.id;

  const { data, error } = await supabaseClient
    .from("research_projects")
    .update({
      recruitment_start: startDate,
      recruitment_end: endDate,
      status: "recruiting",
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId)
    .eq("owner_id", currentUser.id)
    .eq("status", "closed")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    message.textContent =
      "再募集を開始できませんでした。" +
      (error ? error.message : "研究情報を確認してください。");
    return;
  }

  $("re-recruitment-panel").classList.add("hidden");

  await loadProjects();

  alert("再募集を開始しました！");

  openProjectDetail(projectId);
});


// ------------------------------------
// 再募集設定をキャンセル
// ------------------------------------

$("cancel-re-recruitment").addEventListener("click", () => {
  $("re-recruitment-panel").classList.add("hidden");
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

// ------------------------------------
// 削除済み研究の詳細画面
// ------------------------------------

function openDeletedProjectDetail(project) {
  selectedDeletedProject = project;

  const content = $("deleted-project-detail-content");

  const deletedDate = project.deleted_at
    ? new Date(project.deleted_at).toLocaleString("ja-JP")
    : "";

  content.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = project.title;

  const status = document.createElement("p");
  status.textContent = "削除済み";

  const summary = document.createElement("p");
  summary.textContent = `研究概要：${project.summary || "未設定"}`;

  const target = document.createElement("p");
  target.textContent = `募集対象：${project.target || "未設定"}`;

  const method = document.createElement("p");
  method.textContent =
    `募集方式：${
      project.recruitment_method === "appointment"
        ? "日時予約方式"
        : "外部フォーム方式"
    }`;

  const deleted = document.createElement("p");
  deleted.textContent = `削除日：${deletedDate}`;

  content.appendChild(title);
  content.appendChild(status);
  content.appendChild(summary);
  content.appendChild(target);
  content.appendChild(method);
  content.appendChild(deleted);

  $("deleted-projects-panel").classList.add("hidden");
  $("deleted-project-detail-panel").classList.remove("hidden");
}

// ------------------------------------
// 削除済み研究一覧
// ------------------------------------

async function loadDeletedProjects() {
  const { data, error } = await supabaseClient
    .from("research_projects")
    .select("*")
    .eq("owner_id", currentUser.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const list = $("deleted-project-list");
  list.innerHTML = "";

  if (error) {
    console.error(error);
    list.textContent = "削除済み研究を読み込めませんでした。";
    return;
  }

  if (!data || data.length === 0) {
    list.textContent = "削除済みの研究はありません。";
    return;
  }

  data.forEach((project) => {
    const item = document.createElement("div");
    item.className = "project-card";

    const deletedDate = project.deleted_at
      ? new Date(project.deleted_at).toLocaleString("ja-JP")
      : "";

    const title = document.createElement("h3");
    title.textContent = project.title;
    
    const date = document.createElement("p");
    date.textContent = `削除日：${deletedDate}`;
    
    item.appendChild(title);
    item.appendChild(date);
    
    item.style.cursor = "pointer";
    
    item.addEventListener("click", () => {
      openDeletedProjectDetail(project);
    });
    
    list.appendChild(item);
  });
}

// 削除済み研究一覧を開く
$("show-deleted-projects-button").addEventListener("click", async () => {
  $("research-list-panel").classList.add("hidden");
  $("deleted-projects-panel").classList.remove("hidden");

  await loadDeletedProjects();
});

// 通常の研究一覧に戻る
console.log("戻るボタンの取得結果：", $("back-to-active-projects-button"));
$("back-to-active-projects-button").addEventListener("click", () => {
  $("deleted-projects-panel").classList.add("hidden");
  $("research-list-panel").classList.remove("hidden");
});

// 削除済み研究の詳細から一覧に戻る
$("back-to-deleted-project-list").addEventListener("click", () => {
  $("deleted-project-detail-panel").classList.add("hidden");
  $("deleted-projects-panel").classList.remove("hidden");
});

// ------------------------------------
// 削除済み研究の復元
// ------------------------------------

$("restore-project-button").addEventListener("click", async () => {
  if (!selectedDeletedProject) return;

  const projectId = selectedDeletedProject.id;
  const projectTitle = selectedDeletedProject.title;

  const confirmed = confirm(
    `「${projectTitle}」を復元しますか？\n\n` +
    "復元後は通常の研究一覧に戻ります。\n" +
    "研究の状態は「募集停止」になります。"
  );

  if (!confirmed) return;

  const message = $("deleted-project-detail-message");
  message.textContent = "復元しています...";

  const { data, error } = await supabaseClient
    .from("research_projects")
    .update({
      deleted_at: null,
      status: "paused",
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId)
    .eq("owner_id", currentUser.id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    message.textContent =
      "復元できませんでした。" +
      (error ? error.message : "研究情報を確認してください。");
    return;
  }

  alert("研究を復元しました。");

  selectedDeletedProject = null;

  $("deleted-project-detail-panel").classList.add("hidden");
  $("deleted-projects-panel").classList.remove("hidden");

  await loadDeletedProjects();
  await loadProjects();
});

// ------------------------------------
// 研究の完全削除
// ------------------------------------

$("permanently-delete-project-button").addEventListener(
  "click",
  async () => {
    if (!selectedDeletedProject) return;

    const projectId = selectedDeletedProject.id;
    const projectTitle = selectedDeletedProject.title;


    // 2回目の確認
    const confirmed = confirm(
      `本当に「${projectTitle}」を完全削除しますか？\n\n` +
      "完全削除した研究は元に戻せません。\n" +
      "この研究のデータも削除されます。"
    );
    
    if (!confirmed) return;

    const message = $("deleted-project-detail-message");
    message.textContent = "完全削除しています...";

    const { data, error } = await supabaseClient
      .from("research_projects")
      .delete()
      .eq("id", projectId)
      .eq("owner_id", currentUser.id)
      .not("deleted_at", "is", null)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error(error);

      message.textContent =
        "完全削除できませんでした。" +
        (error ? error.message : "対象の研究を確認してください。");

      return;
    }

    alert("研究を完全削除しました。");

    selectedDeletedProject = null;

    $("deleted-project-detail-panel").classList.add("hidden");
    $("deleted-projects-panel").classList.remove("hidden");

    await loadDeletedProjects();
    await loadProjects();
  }
);

// ------------------------------------
// 募集方式による入力欄の切り替え
// ------------------------------------

function updateRecruitmentMethodFields() {
  const method = $("project-method").value;

  const externalSettings = $("external-form-settings");
  const appointmentSettings = $("appointment-settings");

  if (method === "external_form") {
    externalSettings.classList.remove("hidden");
    appointmentSettings.classList.add("hidden");
  } else {
    externalSettings.classList.add("hidden");
    appointmentSettings.classList.remove("hidden");
  }
}

// 募集方式が変更されたとき
$("project-method").addEventListener(
  "change",
  updateRecruitmentMethodFields
);

// ------------------------------------
// 予約枠の長さ：カスタム入力欄の切り替え
// ------------------------------------

function updateCustomIntervalField() {
  const interval = $("appointment-interval").value;
  const customSettings = $("custom-interval-settings");

  if (interval === "custom") {
    customSettings.classList.remove("hidden");
  } else {
    customSettings.classList.add("hidden");
  }
}

// 予約枠の長さが変更されたとき
$("appointment-interval").addEventListener(
  "change",
  updateCustomIntervalField
);


// ------------------------------------
// 日別の予約設定：日付生成と切り替え
// ------------------------------------

let appointmentDays = [];
let currentAppointmentDayIndex = 0;


// 日付を YYYY-MM-DD 形式にする
function formatAppointmentDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// 日付を日本語表示にする
function displayAppointmentDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${year}年${month}月${day}日（${weekdays[date.getDay()]}）`;
}


// 時刻を分に変換
function timeToMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}


// 分を HH:MM に変換
function minutesToTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return (
    String(hour).padStart(2, "0") +
    ":" +
    String(minute).padStart(2, "0")
  );
}


// 予約枠の長さを取得
function getAppointmentInterval() {
  const selected = $("appointment-interval").value;

  if (selected === "custom") {
    return Number($("custom-interval").value);
  }

  return Number(selected);
}


// 開始時刻から終了時刻を計算
function getSlotEndTime(startTime) {
  const interval = getAppointmentInterval();

  if (!startTime || !interval || interval <= 0) {
    return "—";
  }

  return minutesToTime(
    timeToMinutes(startTime) + interval
  );
}


// 現在の日の状態を保存
function saveCurrentAppointmentDayInput() {
  if (appointmentDays.length === 0) return;

  const day = appointmentDays[currentAppointmentDayIndex];

  day.isOff = $("appointment-day-off").checked;
}


// 日別設定画面を表示
function renderAppointmentDay() {
  if (appointmentDays.length === 0) return;

  const day = appointmentDays[currentAppointmentDayIndex];

  $("appointment-day-date").textContent =
    displayAppointmentDate(day.date);

  $("appointment-day-off").checked = day.isOff;

  $("appointment-day-slots-area").classList.toggle(
    "hidden",
    day.isOff
  );

  $("previous-appointment-day").disabled =
    currentAppointmentDayIndex === 0;

  $("next-appointment-day").disabled =
    currentAppointmentDayIndex === appointmentDays.length - 1;

  $("appointment-day-message").textContent = "";

  renderAppointmentSlots(day);
}


// 予約枠一覧を表示
function renderAppointmentSlots(day) {
  const list = $("appointment-day-slot-list");
  list.replaceChildren();

  // 見出し
  const header = document.createElement("div");
  header.className = "appointment-slot-header";

  ["開始時刻", "終了時刻", "定員", ""].forEach((label) => {
    const item = document.createElement("span");
    item.textContent = label;
    header.appendChild(item);
  });

  list.appendChild(header);


  day.slots.forEach((slot, index) => {

    const row = document.createElement("div");
    row.className = "appointment-slot-row";

    // 開始時刻
    const startArea = document.createElement("div");
    startArea.className = "appointment-slot-start";

    const [hour, minute] = slot.startTime.split(":");

    const hourInput = document.createElement("input");
    hourInput.type = "number";
    hourInput.min = "0";
    hourInput.max = "23";
    hourInput.value = Number(hour);
    hourInput.className = "slot-time-input";
    hourInput.setAttribute("aria-label", "開始時刻の時");

    const colon = document.createElement("span");
    colon.textContent = ":";

    const minuteInput = document.createElement("input");
    minuteInput.type = "number";
    minuteInput.min = "0";
    minuteInput.max = "59";
    minuteInput.value = minute;
    minuteInput.className = "slot-time-input";
    minuteInput.setAttribute("aria-label", "開始時刻の分");

    startArea.append(hourInput, colon, minuteInput);


    // 終了時刻（自動計算）
    const endArea = document.createElement("div");
    endArea.className = "appointment-slot-end";

    const endText = document.createElement("strong");
    endText.textContent = getSlotEndTime(slot.startTime);

    endArea.appendChild(endText);


    // 定員
    const capacityArea = document.createElement("div");
    capacityArea.className = "appointment-slot-capacity";

    const capacityInput = document.createElement("input");
    capacityInput.type = "number";
    capacityInput.min = "1";
    capacityInput.value = slot.capacity;
    capacityInput.className = "slot-capacity-input";
    capacityInput.setAttribute("aria-label", "予約枠の定員");

    capacityArea.appendChild(capacityInput);


    // 削除ボタン
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "slot-delete-button";
    deleteButton.textContent = "×";
    deleteButton.title = "この予約枠を削除";


    // 開始時刻を変更
    function updateStartTime() {
      const h = hourInput.value;
      const m = minuteInput.value;

      const valid =
        h !== "" &&
        m !== "" &&
        Number(h) >= 0 &&
        Number(h) <= 23 &&
        Number(m) >= 0 &&
        Number(m) <= 59;

      if (!valid) {
        endText.textContent = "—";
        return;
      }

      slot.startTime =
        String(Number(h)).padStart(2, "0") +
        ":" +
        String(Number(m)).padStart(2, "0");

      endText.textContent = getSlotEndTime(slot.startTime);
    }

    hourInput.addEventListener("input", updateStartTime);
    minuteInput.addEventListener("input", updateStartTime);


    // 定員を変更
    capacityInput.addEventListener("change", () => {
      const value = Number(capacityInput.value);

      if (!Number.isInteger(value) || value < 1) {
        alert("定員は1人以上の整数にしてください。");
        capacityInput.value = slot.capacity;
        return;
      }

      slot.capacity = value;
    });


    // 予約枠を削除
    deleteButton.addEventListener("click", () => {
      if (!confirm("この予約枠を削除しますか？")) return;

      day.slots.splice(index, 1);
      renderAppointmentSlots(day);
    });


    row.append(
      startArea,
      endArea,
      capacityArea,
      deleteButton
    );

    list.appendChild(row);
  });
}


// 日別設定を作成
$("generate-appointment-days-button").addEventListener("click", () => {

  const startValue = $("appointment-date-start").value;
  const endValue = $("appointment-date-end").value;

  if (!startValue || !endValue) {
    alert("実験開始日と終了日を入力してください。");
    return;
  }

  if (endValue < startValue) {
    alert("終了日は開始日以降の日付にしてください。");
    return;
  }

  const startTime = $("appointment-time-start").value || "10:00";
  const endTime = $("appointment-time-end").value || "16:00";

  const interval = getAppointmentInterval();

  if (!interval || !Number.isInteger(interval) || interval < 1) {
    alert("予約枠の長さを正しく入力してください。");
    return;
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    alert("1日の終了時刻は開始時刻より後にしてください。");
    return;
  }

  const startDate = new Date(startValue + "T12:00:00");
  const endDate = new Date(endValue + "T12:00:00");

  appointmentDays = [];

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {

    const slots = [];

    // 開始時刻を基準に予約枠を連続生成
    // 終了時刻を超える場合も、最後の枠として生成する
    let cursor = startMinutes;

    while (cursor < endMinutes) {
      slots.push({
        startTime: minutesToTime(cursor),
        capacity: Number($("appointment-default-capacity").value) || 1
      });
      cursor += interval;
    }

    appointmentDays.push({
      date: formatAppointmentDate(currentDate),
      isOff: false,
      slots: slots
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  currentAppointmentDayIndex = 0;

  $("appointment-day-editor").classList.remove("hidden");

  renderAppointmentDay();

});


// 前の日へ
$("previous-appointment-day").addEventListener("click", () => {

  saveCurrentAppointmentDayInput();

  if (currentAppointmentDayIndex > 0) {
    currentAppointmentDayIndex--;
    renderAppointmentDay();
  }

});


// 次の日へ
$("next-appointment-day").addEventListener("click", () => {

  saveCurrentAppointmentDayInput();

  if (currentAppointmentDayIndex < appointmentDays.length - 1) {
    currentAppointmentDayIndex++;
    renderAppointmentDay();
  }

});


// 実施しない日の切り替え
$("appointment-day-off").addEventListener("change", () => {
  saveCurrentAppointmentDayInput();
  renderAppointmentDay();
});


// 日ごとの設定を一時保存
$("save-appointment-day-button").addEventListener("click", () => {

  saveCurrentAppointmentDayInput();

  $("appointment-day-message").textContent =
    "この日の設定を一時保存しました。";

});


// ------------------------------------
// 実験場所の入力欄切り替え
// ------------------------------------

function updateAppointmentLocationField() {
  const type = $("appointment-location-type").value;

  $("appointment-location-input-area").classList.toggle(
    "hidden",
    type === "later"
  );
}

$("appointment-location-type").addEventListener(
  "change",
  updateAppointmentLocationField
);

updateAppointmentLocationField();


// 初期表示
updateCustomIntervalField();
