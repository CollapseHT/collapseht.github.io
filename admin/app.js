/* =========================================================
   子彈の貓窩 ‧ 後台應用程式
   - GitHub 直接提交 / Pull Request 兩種發布方式
   - 角色權限（擁有者 / 各區編輯）
   - 圖片上傳（瀏覽器壓縮 WebP 後一起 commit）
   - 本機檔案模式
   ========================================================= */
(function () {
  "use strict";

  var Core = window.AdminCore;
  var LS_KEY = "mogumogu-admin-v1";
  var FILES = { update: "update.html", blog: "blog.html", group: "group.html" };
  var LABELS = { update: "更新歷程", blog: "部落格", group: "放浪團" };
  var SECTION_FILE = { updates: "update", posts: "blog", group: "group" };
  var LIST_SECTION = { updates: "updates", posts: "posts", news: "group", main: "group", sub: "group" };
  var ROLES = {
    owner: { label: "擁有者", sections: ["updates", "posts", "group"] },
    editor: { label: "內容編輯", sections: ["updates", "posts", "group"] },
    group: { label: "放浪團編輯", sections: ["group"] },
    posts: { label: "部落格編輯", sections: ["posts"] },
    updates: { label: "更新歷程編輯", sections: ["updates"] }
  };
  var API_BASE = (typeof window !== "undefined" && window.__ADMIN_API_BASE__) || "https://api.github.com";
  var POST_ICONS = [
    "laptop-code", "code", "gamepad", "music", "book", "camera", "film", "palette",
    "server", "database", "terminal", "bug", "wrench", "rocket", "star", "heart",
    "cat", "mug-hot", "lightbulb", "robot", "pen-nib", "globe", "chart-line"
  ];
  var ROLE_ICONS = [
    "gamepad", "music", "robot", "face-smile", "moon", "tree", "cat", "feather",
    "snowflake", "crown", "people-group", "desktop", "keyboard", "car", "compact-disc",
    "fish", "dragon", "gun", "code", "star", "heart", "utensils", "book", "camera", "paintbrush"
  ];

  var state = {
    mode: "github",
    token: "",
    owner: "",
    repo: "",
    branch: "main",
    role: "owner",
    publishMode: "direct",
    files: { update: "", blog: "", group: "" },
    data: null,
    loaded: null,
    dirty: false,
    busy: false,
    lastCommit: "",
    localDir: null,
    initialTab: "",
    activeTab: "updates",
    pr: null,
    uploads: {}
  };

  var el = {};
  var toastTimer = null;

  if (!Core) {
    document.body.innerHTML = '<p style="padding:30px;font-family:sans-serif">找不到 admin/core.js，請確認檔案存在。</p>';
    return;
  }

  /* ---------------- 小工具 ---------------- */
  function $(sel) { return document.querySelector(sel); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function esc(value) { return Core.esc(value); }
  function pad(n) { return ("0" + n).slice(-2); }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function nowStamp() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function stampCompact() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function randomSuffix() {
    return Math.random().toString(36).slice(2, 8);
  }
  function isLocalEnv() {
    return location.protocol === "file:" ||
      /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  }
  function assetUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path) || path.charAt(0) === "/") return path;
    return "../" + path;
  }
  function previewUrl(path) {
    return state.uploads[path] && state.uploads[path].url ? state.uploads[path].url : assetUrl(path);
  }
  function toast(message, type, ms) {
    el.toast.textContent = message;
    el.toast.className = "show " + (type || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.className = ""; }, ms || 3500);
  }
  function showError(message) {
    el.setupError.textContent = message || "";
    el.setupError.hidden = !message;
  }
  function setBusy(busy, message) {
    state.busy = busy;
    el.overlay.hidden = !busy;
    if (busy) el.overlayText.textContent = message || "處理中…";
    el.connectBtn.disabled = busy;
    updateSavebar();
  }
  function makeApiError(status, message, data) {
    var error = new Error(message || ("HTTP " + status));
    error.name = "ApiError";
    error.status = status;
    error.data = data;
    return error;
  }
  function formatError(error) {
    if (!error) return "未知錯誤";
    if (error.status === 401) return "GitHub 權杖無效或已過期，請重新產生一組。";
    if (error.status === 403) return "權限不足或 GitHub API 次數已用完：" + error.message;
    if (error.status === 404) return "找不到 repo 或檔案，請確認 owner/repo 與權杖的 repo 權限。";
    if (error.status === 409 || error.status === 422) {
      return "遠端內容有變動，請按「重新載入」後再儲存。（" + error.message + "）";
    }
    return error.message || String(error);
  }

  /* ---------------- 權限 ---------------- */
  function roleInfo() { return ROLES[state.role] || ROLES.owner; }
  function allowedSections() { return roleInfo().sections; }
  function canEdit(section) { return allowedSections().indexOf(section) >= 0; }
  function allowedKeys() {
    return allowedSections().map(function (section) { return SECTION_FILE[section]; });
  }
  function isPrMode() {
    return state.mode === "local" ? false : (state.role !== "owner" || state.publishMode === "pr");
  }

  /* ---------------- GitHub API ---------------- */
  async function gh(method, path, body) {
    var headers = {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + state.token
    };
    if (body) headers["Content-Type"] = "application/json";
    var response = await fetch(API_BASE + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    });
    var text = await response.text();
    var data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = null; }
    }
    if (!response.ok) {
      throw makeApiError(response.status, data && data.message ? data.message : ("HTTP " + response.status), data);
    }
    return data;
  }

  function b64decode(b64) {
    var binary = atob(String(b64 || "").replace(/\s/g, ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  async function getContent(path) {
    var data = await gh("GET", "/repos/" + state.owner + "/" + state.repo + "/contents/" + path + "?ref=" + encodeURIComponent(state.branch));
    if (Array.isArray(data)) throw new Error(path + " 是資料夾，不是檔案。");
    return { text: b64decode(data.content), sha: data.sha };
  }

  async function loadFiles() {
    var result = await Promise.all([getContent(FILES.update), getContent(FILES.blog), getContent(FILES.group)]);
    state.files = { update: result[0].text, blog: result[1].text, group: result[2].text };
  }

  /* ---------------- 設定 ---------------- */
  function readConfig() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { return null; }
  }
  function writeConfig() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        token: state.token,
        owner: state.owner,
        repo: state.repo,
        branch: state.branch,
        role: state.role,
        publishMode: state.publishMode
      }));
    } catch (e) { /* 忽略 */ }
  }
  function clearConfig() {
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* 忽略 */ }
  }

  /* ---------------- 連線 ---------------- */
  function parseRepoInput() {
    var raw = el.repoInput.value.trim()
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/\.git$/i, "")
      .replace(/\/+$/, "");
    var parts = raw.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error("Repository 請填 owner/repo，例如 CollapseHT/collapseht.github.io");
    }
    return { owner: parts[0], repo: parts[1] };
  }

  function syncRoleUI() {
    var role = el.roleInput.value;
    var info = ROLES[role] || ROLES.owner;
    var owner = role === "owner";
    el.publishInput.disabled = !owner;
    if (!owner) el.publishInput.value = "pr";
    if (owner) {
      el.roleHint.textContent = "擁有者可以選擇直接提交 main，或建立 Pull Request 後自行合併。";
    } else {
      el.roleHint.textContent = "非擁有者一律透過 Pull Request 送出，只能編輯：" +
        info.sections.map(function (section) {
          return { updates: "更新歷程", posts: "部落格", group: "放浪團" }[section];
        }).join("、") +
        "。建議在 GitHub 對 main 開啟分支保護（Require a pull request），這樣權限才是真正被限制。";
    }
  }

  async function connectGitHub() {
    try {
      showError("");
      var target = parseRepoInput();
      var token = el.tokenInput.value.trim();
      if (!token) throw new Error("請先貼上 GitHub token。");
      var role = el.roleInput.value;
      if (!ROLES[role]) throw new Error("權限模式不正確。");
      state.mode = "github";
      state.token = token;
      state.owner = target.owner;
      state.repo = target.repo;
      state.branch = el.branchInput.value.trim() || "main";
      state.role = role;
      state.publishMode = role === "owner" ? (el.publishInput.value === "pr" ? "pr" : "direct") : "pr";
      state.pr = null;
      clearUploads();
      setBusy(true, "驗證權杖與讀取內容…");

      var info = await gh("GET", "/repos/" + state.owner + "/" + state.repo);
      if (!info.permissions || !info.permissions.push) {
        throw new Error("這組權杖沒有寫入權限，請確認 Fine-grained token 的 Contents 設為 Read and write。");
      }
      el.setupHint.textContent = "讀取 update.html / blog.html / group.html…";
      await loadFiles();
      state.data = Core.parseAll(state.files);
      state.loaded = clone(state.data);
      state.dirty = false;
      state.lastCommit = "";
      writeConfig();
      enterEditor();
      toast("已載入 " + state.owner + "/" + state.repo, "ok");
    } catch (error) {
      showError(formatError(error));
      el.setupHint.textContent = "";
    } finally {
      setBusy(false);
    }
  }

  async function connectLocal() {
    try {
      showError("");
      if (location.protocol === "file:") {
        throw new Error("本機模式無法在 file:// 底下讀取檔案。請在 collapseht.github.io 資料夾執行「node admin/serve.mjs」，再開 http://127.0.0.1:5173/admin/");
      }
      setBusy(true, "讀取本機前台檔案…");
      var names = ["update", "blog", "group"];
      var texts = await Promise.all(names.map(function (key) {
        return fetch("../" + FILES[key], { cache: "no-store" }).then(function (response) {
          if (!response.ok) throw new Error("讀不到 ../" + FILES[key]);
          return response.text();
        });
      }));
      state.mode = "local";
      state.role = "owner";
      state.publishMode = "direct";
      state.pr = null;
      clearUploads();
      state.files = { update: texts[0], blog: texts[1], group: texts[2] };
      state.data = Core.parseAll(state.files);
      state.loaded = clone(state.data);
      state.dirty = false;
      state.lastCommit = "";
      enterEditor();
      toast("本機模式：已讀取目前資料夾的前台", "ok");
    } catch (error) {
      showError(formatError(error));
    } finally {
      setBusy(false);
    }
  }

  function enterEditor() {
    el.setupView.hidden = true;
    el.editorView.hidden = false;
    el.savebar.hidden = false;
    el.repoBadge.hidden = false;
    el.reloadBtn.hidden = false;
    el.logoutBtn.hidden = state.mode === "local";
    el.modeBadge.hidden = state.mode !== "local";
    el.modeBadge.textContent = state.mode === "local" ? "本機模式" : "";
    el.modeBadge.className = "badge local";
    el.repoBadge.classList.toggle("local", state.mode === "local");
    el.repoBadge.textContent = state.mode === "local"
      ? "本機檔案模式"
      : state.owner + "/" + state.repo + " · " + state.branch + " · " + roleInfo().label;
    el.loadInfo.innerHTML = state.mode === "local"
      ? "本機模式：讀取目前資料夾的 update.html / blog.html / group.html（不會 commit）"
      : "已載入 <strong>" + esc(state.owner + "/" + state.repo) + "</strong>（" + esc(state.branch) + "）";

    var allowed = allowedSections();
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (tab) {
      tab.hidden = allowed.indexOf(tab.getAttribute("data-tab")) < 0;
    });
    var preferred = state.initialTab && allowed.indexOf(state.initialTab) >= 0
      ? state.initialTab
      : (allowed.indexOf(state.activeTab) >= 0 ? state.activeTab : allowed[0]);
    activateTab(preferred);
    state.initialTab = "";

    if (state.mode === "local" || (state.role === "owner" && state.publishMode === "direct")) {
      el.roleNotice.hidden = true;
    } else {
      el.roleNotice.hidden = false;
      el.roleNotice.textContent = "權限：" + roleInfo().label + "｜" +
        (isPrMode() ? "儲存後會建立 / 更新 Pull Request，等待擁有者審核合併。" : "直接提交 main。") +
        " 可編輯：" + allowed.map(function (section) {
          return { updates: "更新歷程", posts: "部落格", group: "放浪團" }[section];
        }).join("、");
    }
    el.uploadHint.hidden = state.mode === "local" ? false : !canEdit("group");

    renderPanels();
    updateSavebar();
  }

  function resetToSetup() {
    el.setupView.hidden = false;
    el.editorView.hidden = true;
    el.savebar.hidden = true;
    el.repoBadge.hidden = true;
    el.reloadBtn.hidden = true;
    el.logoutBtn.hidden = true;
    el.modeBadge.hidden = true;
  }

  /* ---------------- 編輯器 ---------------- */
  function pad2(n) { return pad(n); }

  function moveButtons(list, index, total) {
    return '<button class="btn icon" type="button" data-action="up" data-list="' + list + '" data-index="' + index + '" aria-label="上移" ' + (index === 0 ? "disabled" : "") + '>↑</button>' +
      '<button class="btn icon" type="button" data-action="down" data-list="' + list + '" data-index="' + index + '" aria-label="下移" ' + (index === total - 1 ? "disabled" : "") + '>↓</button>';
  }

  function removeButton(list, index, label) {
    return '<button class="btn small danger" type="button" data-action="remove" data-list="' + list + '" data-index="' + index + '">' + (label || "刪除") + "</button>";
  }

  function iconOptions(values, current) {
    var list = values.slice();
    if (current && list.indexOf(current) < 0) list.unshift(current);
    return list.map(function (value) {
      return '<option value="' + esc(value) + '"' + (value === current ? " selected" : "") + ">" + esc(value) + "</option>";
    }).join("");
  }

  function renderUpdateItem(item, index, total) {
    var preview = item.text ? item.text.slice(0, 34) : "（尚未填寫內容）";
    return '<div class="item">' +
      '<div class="item-head"><span class="idx">' + pad2(index + 1) + "</span>" +
      '<span class="item-title">' + esc(preview) + "</span>" +
      '<div class="item-actions">' + moveButtons("updates", index, total) + removeButton("updates", index) + "</div></div>" +
      '<div class="grid-3">' +
      '<label><span>日期</span><input type="date" data-path="updates.' + index + '.date" value="' + esc(item.date) + '"></label>' +
      '<label><span>類型</span><input list="tagOptions" data-path="updates.' + index + '.tag" value="' + esc(item.tag) + '" placeholder="更新"></label>' +
      '<label><span>內容</span><input type="text" data-path="updates.' + index + '.text" value="' + esc(item.text) + '" placeholder="例如：✨ 新增放浪團地帶"></label>' +
      "</div></div>";
  }

  function renderUpdatesPanel() {
    var html = '<div class="panel-head"><div><h2>更新歷程</h2><p>依日期由新到舊顯示在 update.html 的表格。</p></div>' +
      '<button class="btn primary small" type="button" data-action="add-update">＋ 新增一列</button></div>';
    if (!state.data.updates.length) html += '<div class="item hint">目前沒有項目，按右上角新增。</div>';
    state.data.updates.forEach(function (item, index) {
      html += renderUpdateItem(item, index, state.data.updates.length);
    });
    return html;
  }

  function renderPostItem(item, index, total) {
    return '<div class="item">' +
      '<div class="item-head"><span class="idx">' + pad2(index + 1) + "</span>" +
      '<span class="item-title">' + esc(item.title || "（尚未命名）") + "</span>" +
      '<div class="item-actions">' + moveButtons("posts", index, total) + removeButton("posts", index) + "</div></div>" +
      '<div class="grid-2">' +
      '<label class="span-2"><span>標題</span><input type="text" data-path="posts.' + index + '.title" value="' + esc(item.title) + '"></label>' +
      '<label><span>日期</span><input type="date" data-path="posts.' + index + '.date" value="' + esc(item.date) + '"></label>' +
      '<label><span>分類</span><input type="text" list="tagOptions" data-path="posts.' + index + '.category" value="' + esc(item.category) + '" placeholder="網站更新"></label>' +
      '<label><span>圖示</span><select data-path="posts.' + index + '.icon">' + iconOptions(POST_ICONS, item.icon) + "</select></label>" +
      '<label><span>摘要（換行會顯示為換行）</span><textarea rows="4" data-path="posts.' + index + '.summary">' + esc(item.summary) + "</textarea></label>" +
      "</div></div>";
  }

  function renderPostsPanel() {
    var html = '<div class="panel-head"><div><h2>部落格</h2><p>顯示在 blog.html 的卡片。摘要可用換行分段。</p></div>' +
      '<button class="btn primary small" type="button" data-action="add-post">＋ 新增文章</button></div>';
    if (!state.data.posts.length) html += '<div class="item hint">目前沒有文章。</div>';
    state.data.posts.forEach(function (item, index) {
      html += renderPostItem(item, index, state.data.posts.length);
    });
    return html;
  }

  function renderNewsItem(item, index, total) {
    return '<div class="item">' +
      '<div class="item-head"><span class="idx">' + pad2(index + 1) + "</span>" +
      '<span class="item-title">' + esc(item.text ? item.text.slice(0, 34) : "（尚未填寫）") + "</span>" +
      '<div class="item-actions">' + moveButtons("news", index, total) + removeButton("news", index) + "</div></div>" +
      '<div class="grid-3">' +
      '<label><span>日期</span><input type="date" data-path="group.news.' + index + '.date" value="' + esc(item.date) + '"></label>' +
      '<label><span>類型</span><input list="tagOptions" data-path="group.news.' + index + '.tag" value="' + esc(item.tag) + '" placeholder="更新"></label>' +
      '<label><span>內容</span><input type="text" data-path="group.news.' + index + '.text" value="' + esc(item.text) + '"></label>' +
      "</div></div>";
  }

  function renderMemberItem(member, listName, index, total) {
    var otherLabel = listName === "main" ? "移至次級" : "移至主要";
    var avatarPath = "group." + listName + "." + index + ".avatar";
    return '<div class="item member-edit">' +
      '<div class="item-head"><span class="idx">' + (listName === "main" ? "主" : "次") + (index + 1) + "</span>" +
      '<span class="item-title">' + esc(member.name || "（未命名）") + "</span>" +
      (member.tag ? '<span class="chip">' + esc(member.tag) + "</span>" : "") +
      '<div class="item-actions">' + moveButtons(listName, index, total) +
      '<button class="btn small ghost" type="button" data-action="toggle-member" data-list="' + listName + '" data-index="' + index + '">' + otherLabel + "</button>" +
      removeButton(listName, index) + "</div></div>" +
      '<div class="member-body">' +
      '<div class="avatar-box"><img src="' + esc(previewUrl(member.avatar)) + '" alt="" onerror="this.style.visibility=\'hidden\'"><span>' + esc(member.avatar || "尚未設定頭像") + "</span>" +
      '<label class="btn small upload-btn">上傳圖片<input type="file" accept="image/*" data-upload="' + avatarPath + '"></label></div>' +
      '<div class="grid-2">' +
      '<label><span>名字</span><input type="text" data-path="group.' + listName + '.' + index + '.name" value="' + esc(member.name) + '"></label>' +
      '<label><span>標籤（可留空）</span><input type="text" data-path="group.' + listName + '.' + index + '.tag" value="' + esc(member.tag) + '" placeholder="團長 / 音遊擔當"></label>' +
      '<label><span>頭像路徑</span><input type="text" data-path="' + avatarPath + '" value="' + esc(member.avatar) + '" placeholder="group/xxx.jpg"></label>' +
      '<label><span>主修圖示</span><select data-path="group.' + listName + '.' + index + '.roleIcon">' + iconOptions(ROLE_ICONS, member.roleIcon) + "</select></label>" +
      '<label class="span-2"><span>主修</span><input type="text" data-path="group.' + listName + '.' + index + '.role" value="' + esc(member.role) + '" placeholder="APEX / 怪物彈珠"></label>' +
      '<label class="span-2"><span>介紹</span><textarea rows="3" data-path="group.' + listName + '.' + index + '.desc">' + esc(member.desc) + "</textarea></label>" +
      "</div></div></div>";
  }

  function renderMembersSection(listName, title, hint) {
    var list = state.data.group[listName];
    var html = '<div class="panel-head"><div><h2>' + esc(title) + "</h2><p>" + esc(hint) + "</p></div>" +
      '<button class="btn primary small" type="button" data-action="add-' + (listName === "main" ? "main" : "sub") + '">＋ 新增成員</button></div>';
    if (!list.length) html += '<div class="item hint">目前沒有成員。</div>';
    list.forEach(function (member, index) {
      html += renderMemberItem(member, listName, index, list.length);
    });
    return html;
  }

  function renderGroupPanel() {
    var group = state.data.group;
    var html = '<div class="panel-head"><div><h2>放浪團</h2><p>團體簡介、精選圖片、近況與成員名單都在 group.html。</p></div></div>';
    html += '<div class="item"><h3>團體簡介</h3><label><span>簡介（換行會顯示為換行）</span><textarea rows="4" data-path="group.intro">' + esc(group.intro) + "</textarea></label></div>";
    html += '<div class="item"><h3>精選圖片與文字</h3>' +
      '<img class="featured-preview" src="' + esc(previewUrl(group.featured.image)) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
      '<div class="row" style="margin-bottom:8px"><label class="btn small upload-btn">上傳精選圖片<input type="file" accept="image/*" data-upload="group.featured.image"></label>' +
      '<span class="hint">會壓縮成 WebP（最長邊 1200px）並在儲存時上傳。</span></div>' +
      '<div class="grid-2">' +
      '<label><span>圖片路徑</span><input type="text" data-path="group.featured.image" value="' + esc(group.featured.image) + '" placeholder="group/yen-revenge.png"></label>' +
      '<label><span>圖片替代文字</span><input type="text" data-path="group.featured.alt" value="' + esc(group.featured.alt) + '"></label>' +
      '<label class="span-2"><span>標題</span><input type="text" data-path="group.featured.title" value="' + esc(group.featured.title) + '"></label>' +
      '<label class="span-2"><span>說明文字</span><textarea rows="3" data-path="group.featured.text">' + esc(group.featured.text) + "</textarea></label>" +
      "</div></div>";
    html += '<div class="panel-head"><div><h2>放浪團近況</h2><p>右側「查看完整記錄」上方的時間軸。</p></div>' +
      '<button class="btn primary small" type="button" data-action="add-news">＋ 新增近況</button></div>';
    if (!group.news.length) html += '<div class="item hint">目前沒有近況。</div>';
    group.news.forEach(function (item, index) { html += renderNewsItem(item, index, group.news.length); });
    html += renderMembersSection("main", "主要成員", "顯示在「主要成員」區塊，卡片會稍微強調。");
    html += renderMembersSection("sub", "次級成員", "顯示在「次級成員」區塊，樣式較柔和。");
    return html;
  }

  function renderPanels() {
    if (!state.data) return;
    if (canEdit("updates")) $('[data-panel="updates"]').innerHTML = renderUpdatesPanel();
    if (canEdit("posts")) $('[data-panel="posts"]').innerHTML = renderPostsPanel();
    if (canEdit("group")) $('[data-panel="group"]').innerHTML = renderGroupPanel();
    el.countUpdates.textContent = String(state.data.updates.length);
    el.countPosts.textContent = String(state.data.posts.length);
    el.countGroup.textContent = String(state.data.group.main.length + state.data.group.sub.length);
  }

  function activateTab(name) {
    if (!canEdit(name)) return;
    state.activeTab = name;
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (tab) {
      var active = tab.getAttribute("data-tab") === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-panel]"), function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== name;
    });
  }

  /* ---------------- 圖片上傳 ---------------- */
  function clearUploads() {
    Object.keys(state.uploads).forEach(function (path) {
      var upload = state.uploads[path];
      if (upload && upload.url) URL.revokeObjectURL(upload.url);
    });
    state.uploads = {};
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(",")[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function compressImage(file, maxSize) {
    var bitmap;
    if (typeof createImageBitmap === "function") {
      try { bitmap = await createImageBitmap(file); } catch (e) { bitmap = null; }
    }
    if (!bitmap) {
      bitmap = await new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var image = new Image();
        image.onload = function () { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = function () { URL.revokeObjectURL(url); reject(new Error("無法讀取圖片")); };
        image.src = url;
      });
    }
    var scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    var width = Math.max(1, Math.round(bitmap.width * scale));
    var height = Math.max(1, Math.round(bitmap.height * scale));
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (typeof bitmap.close === "function") bitmap.close();

    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/webp", 0.85); });
    var ext = "webp";
    if (!blob) {
      var canvas2 = document.createElement("canvas");
      canvas2.width = width;
      canvas2.height = height;
      var ctx2 = canvas2.getContext("2d");
      ctx2.fillStyle = "#ffffff";
      ctx2.fillRect(0, 0, width, height);
      ctx2.drawImage(canvas, 0, 0);
      blob = await new Promise(function (resolve) { canvas2.toBlob(resolve, "image/jpeg", 0.85); });
      ext = "jpg";
    }
    if (!blob) throw new Error("瀏覽器不支援圖片壓縮");
    return { blob: blob, ext: ext, width: width, height: height };
  }

  async function handleUpload(event) {
    var input = event.target;
    var fieldPath = input.getAttribute("data-upload");
    var file = input.files && input.files[0];
    if (!file || !fieldPath) return;
    if (!/^image\//.test(file.type)) {
      toast("請選擇圖片檔案。", "error");
      input.value = "";
      return;
    }
    try {
      setBusy(true, "處理圖片…");
      var maxSize = /avatar$/.test(fieldPath) ? 640 : 1200;
      var result = await compressImage(file, maxSize);
      var path = "group/up-" + stampCompact() + "-" + randomSuffix() + "." + result.ext;
      var base64 = await blobToBase64(result.blob);
      if (state.uploads[path] && state.uploads[path].url) URL.revokeObjectURL(state.uploads[path].url);
      state.uploads[path] = {
        blob: result.blob,
        base64: base64,
        url: URL.createObjectURL(result.blob),
        pushed: false
      };
      setPath(state.data, fieldPath, path);
      markDirty();
      var field = document.querySelector('[data-path="' + fieldPath + '"]');
      if (field) field.value = path;
      refreshUploadPreview(fieldPath, path);
      toast("圖片已加入（" + Math.round(result.blob.size / 1024) + " KB），儲存時會一起上傳。", "ok", 5000);
    } catch (error) {
      toast("圖片處理失敗：" + (error && error.message ? error.message : error), "error", 6000);
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  function refreshUploadPreview(fieldPath, path) {
    var field = document.querySelector('[data-path="' + fieldPath + '"]');
    if (!field) return;
    var box = field.closest(".member-body") || field.closest(".item");
    if (!box) return;
    var image = box.querySelector(".avatar-box img") || box.querySelector(".featured-preview");
    if (image) {
      image.style.visibility = "";
      image.src = previewUrl(path);
    }
    var label = box.querySelector(".avatar-box span");
    if (label) label.textContent = path;
  }

  /* ---------------- 資料操作 ---------------- */
  function setPath(object, path, value) {
    var parts = path.split(".");
    var current = object;
    for (var i = 0; i < parts.length - 1; i++) {
      var key = parts[i];
      current = Array.isArray(current) ? current[Number(key)] : current[key];
      if (current == null) return;
    }
    var last = parts[parts.length - 1];
    if (Array.isArray(current)) current[Number(last)] = value;
    else current[last] = value;
  }

  function listFor(name) {
    if (name === "updates") return state.data.updates;
    if (name === "posts") return state.data.posts;
    if (name === "news") return state.data.group.news;
    if (name === "main") return state.data.group.main;
    if (name === "sub") return state.data.group.sub;
    return [];
  }

  function markDirty() {
    state.dirty = true;
    updateSavebar();
  }

  function updateSavebar() {
    if (!el.savebar) return;
    el.savebarText.classList.toggle("dirty", state.dirty);
    el.dirtyText.textContent = state.dirty ? "有未儲存的變更" : "尚未修改";
    el.saveBtn.disabled = state.busy || !state.dirty;
    el.discardBtn.disabled = state.busy || !state.dirty;
    if (state.busy) el.saveBtn.textContent = "處理中…";
    else if (state.mode === "local") el.saveBtn.textContent = "儲存檔案";
    else if (isPrMode()) el.saveBtn.textContent = "建立 Pull Request";
    else el.saveBtn.textContent = "儲存並發布";
  }

  function handleField(event) {
    var path = event.target.getAttribute && event.target.getAttribute("data-path");
    if (!path) return;
    setPath(state.data, path, event.target.value);
    markDirty();
    if (/\.avatar$/.test(path)) {
      var box = event.target.closest(".member-body");
      if (box) {
        var image = box.querySelector(".avatar-box img");
        var label = box.querySelector(".avatar-box span");
        if (image) { image.style.visibility = ""; image.src = previewUrl(event.target.value); }
        if (label) label.textContent = event.target.value || "尚未設定頭像";
      }
    }
    if (path === "group.featured.image") {
      var item = event.target.closest(".item");
      var preview = item ? item.querySelector(".featured-preview") : null;
      if (preview) { preview.style.visibility = ""; preview.src = previewUrl(event.target.value); }
    }
  }

  function handleAction(event) {
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var action = button.getAttribute("data-action");
    var listName = button.getAttribute("data-list");
    var index = Number(button.getAttribute("data-index"));
    var focusPath = "";
    var requiredSection = action === "add-update" ? "updates"
      : action === "add-post" ? "posts"
      : (action === "add-news" || action === "add-main" || action === "add-sub" || action === "toggle-member") ? "group"
      : (listName ? LIST_SECTION[listName] : "");
    if (requiredSection && !canEdit(requiredSection)) return;

    if (action === "add-update") {
      state.data.updates.unshift({ date: todayISO(), tag: "更新", text: "" });
      focusPath = "updates.0.text";
    } else if (action === "add-post") {
      state.data.posts.unshift({ date: todayISO(), title: "新文章", category: "網站更新", icon: "laptop-code", summary: "" });
      focusPath = "posts.0.title";
    } else if (action === "add-news") {
      state.data.group.news.unshift({ date: todayISO(), tag: "更新", text: "" });
      focusPath = "group.news.0.text";
    } else if (action === "add-main" || action === "add-sub") {
      var target = action === "add-main" ? "main" : "sub";
      state.data.group[target].push({ name: "新成員", tag: "", roleIcon: "star", role: "", desc: "", avatar: "images/self.png" });
      focusPath = "group." + target + "." + (state.data.group[target].length - 1) + ".name";
    } else if (action === "up") {
      var upList = listFor(listName);
      if (index > 0) {
        var prev = upList[index - 1];
        upList[index - 1] = upList[index];
        upList[index] = prev;
      }
    } else if (action === "down") {
      var downList = listFor(listName);
      if (index < downList.length - 1) {
        var next = downList[index + 1];
        downList[index + 1] = downList[index];
        downList[index] = next;
      }
    } else if (action === "remove") {
      if (!window.confirm("確定要刪除這一項嗎？刪除後仍可按「還原變更」復原。")) return;
      listFor(listName).splice(index, 1);
    } else if (action === "toggle-member") {
      var from = listFor(listName);
      var to = listFor(listName === "main" ? "sub" : "main");
      to.push(from.splice(index, 1)[0]);
    } else {
      return;
    }

    markDirty();
    renderPanels();
    if (focusPath) {
      setTimeout(function () {
        var field = document.querySelector('[data-path="' + focusPath + '"]');
        if (field) {
          field.focus();
          field.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 30);
    }
  }

  /* ---------------- 發布 ---------------- */
  function referencedUploads(built) {
    var keys = allowedKeys();
    return Object.keys(state.uploads).filter(function (path) {
      var upload = state.uploads[path];
      if (!upload || upload.pushed) return false;
      return keys.some(function (key) { return built[key].indexOf(path) >= 0; });
    });
  }

  function markUploadsPushed(paths) {
    paths.forEach(function (path) {
      if (state.uploads[path]) state.uploads[path].pushed = true;
    });
  }

  async function createCommit(base, parentSha, keys, built, uploadPaths, message) {
    var baseCommit = await gh("GET", base + "/git/commits/" + parentSha);
    var entries = [];
    var i;
    for (i = 0; i < keys.length; i++) {
      var key = keys[i];
      var blob = await gh("POST", base + "/git/blobs", { content: built[key], encoding: "utf-8" });
      entries.push({ path: FILES[key], mode: "100644", type: "blob", sha: blob.sha });
    }
    for (i = 0; i < uploadPaths.length; i++) {
      var path = uploadPaths[i];
      var imageBlob = await gh("POST", base + "/git/blobs", { content: state.uploads[path].base64, encoding: "base64" });
      entries.push({ path: path, mode: "100644", type: "blob", sha: imageBlob.sha });
    }
    var tree = await gh("POST", base + "/git/trees", { base_tree: baseCommit.tree.sha, tree: entries });
    return gh("POST", base + "/git/commits", { message: message, tree: tree.sha, parents: [parentSha] });
  }

  async function save() {
    if (state.busy || !state.data) return;
    if (!state.dirty) {
      toast("目前沒有變更。", "ok");
      return;
    }
    var allowed = allowedSections();
    var errors = Core.validate(state.data).filter(function (message) {
      if (message.indexOf("更新歷程") === 0) return allowed.indexOf("updates") >= 0;
      if (message.indexOf("部落格") === 0) return allowed.indexOf("posts") >= 0;
      return allowed.indexOf("group") >= 0;
    });
    if (errors.length) {
      toast(errors[0] + (errors.length > 1 ? "（還有 " + (errors.length - 1) + " 個問題）" : ""), "error", 6000);
      return;
    }
    try {
      if (state.mode === "local") await saveLocal();
      else if (isPrMode()) await publishPullRequest();
      else await publishDirect();
    } catch (error) {
      toast(formatError(error), "error", 7000);
    }
  }

  function changedKeys(built) {
    return allowedKeys().filter(function (key) { return built[key] !== state.files[key]; });
  }

  function changedLabels(keys, uploadPaths) {
    var labels = keys.map(function (key) { return LABELS[key]; });
    if (!labels.length && uploadPaths.length) labels.push("圖片上傳");
    return labels;
  }

  async function publishDirect() {
    var built = Core.buildAll(state.files, state.data);
    var keys = changedKeys(built);
    var uploadPaths = referencedUploads(built);
    if (!keys.length && !uploadPaths.length) {
      toast("內容沒有實際變更，不需要 commit。", "ok");
      return;
    }
    var labels = changedLabels(keys, uploadPaths);
    setBusy(true, "建立 commit…");
    try {
      var base = "/repos/" + state.owner + "/" + state.repo;
      var ref = await gh("GET", base + "/git/ref/heads/" + encodeURIComponent(state.branch));
      var message = "後台更新：" + labels.join("、") + " (" + nowStamp() + ")";
      var commit = await createCommit(base, ref.object.sha, keys, built, uploadPaths, message);
      await gh("PATCH", base + "/git/refs/heads/" + encodeURIComponent(state.branch), { sha: commit.sha, force: false });

      state.files = built;
      state.loaded = clone(state.data);
      state.dirty = false;
      state.lastCommit = commit.html_url;
      markUploadsPushed(uploadPaths);
      el.loadInfo.innerHTML = "已發布 " + labels.join("、") +
        ' · <a href="' + esc(commit.html_url) + '" target="_blank" rel="noopener">查看 commit</a>' +
        '<br><span class="hint">GitHub Pages 約 1 分鐘後更新前台。</span>';
      updateSavebar();
      toast("已發布！約 1 分鐘後前台更新。", "ok", 6000);
    } finally {
      setBusy(false);
    }
  }

  async function publishPullRequest() {
    var built = Core.buildAll(state.files, state.data);
    var keys = changedKeys(built);
    var uploadPaths = referencedUploads(built);
    if (!keys.length && !uploadPaths.length) {
      toast("內容沒有實際變更，不需要建立 PR。", "ok");
      return;
    }
    var labels = changedLabels(keys, uploadPaths);
    setBusy(true, "建立 Pull Request…");
    try {
      var base = "/repos/" + state.owner + "/" + state.repo;

      // 如果 PR 已被合併 / 關閉，重新開一個新的 branch
      if (state.pr && state.pr.number) {
        try {
          var prInfo = await gh("GET", base + "/pulls/" + state.pr.number);
          if (prInfo.state !== "open") state.pr = null;
        } catch (e) { state.pr = null; }
      }

      var branch = state.pr ? state.pr.branch : "";
      var branchExists = false;
      var baseSha = "";
      if (branch) {
        try {
          var ref = await gh("GET", base + "/git/ref/heads/" + branch);
          baseSha = ref.object.sha;
          branchExists = true;
        } catch (e) {
          if (e.status === 404) { state.pr = null; branch = ""; }
          else throw e;
        }
      }
      if (!branch) {
        var mainRef = await gh("GET", base + "/git/ref/heads/" + encodeURIComponent(state.branch));
        baseSha = mainRef.object.sha;
        branch = "admin-" + state.role + "-" + stampCompact() + "-" + randomSuffix();
        state.pr = { branch: branch, number: 0, url: "" };
      }

      var message = "後台更新（" + roleInfo().label + "）：" + labels.join("、") + " (" + nowStamp() + ")";
      var commit = await createCommit(base, baseSha, keys, built, uploadPaths, message);

      if (branchExists) {
        await gh("PATCH", base + "/git/refs/heads/" + branch, { sha: commit.sha, force: false });
      } else {
        await gh("POST", base + "/git/refs", { ref: "refs/heads/" + branch, sha: commit.sha });
        var pr = await gh("POST", base + "/pulls", {
          title: "後台更新：" + labels.join("、") + "（" + roleInfo().label + "）",
          head: branch,
          base: state.branch,
          body: "由後台建立。\n\n權限：" + roleInfo().label +
            "\n變更：" + labels.join("、") +
            "\n檔案：" + keys.map(function (key) { return FILES[key]; }).concat(uploadPaths).join("、") +
            "\n\n請審核後合併；合併後 GitHub Pages 約 1 分鐘更新。"
        });
        state.pr.number = pr.number;
        state.pr.url = pr.html_url;
      }

      state.files = built;
      state.loaded = clone(state.data);
      state.dirty = false;
      markUploadsPushed(uploadPaths);
      el.loadInfo.innerHTML = "已" + (branchExists ? "更新" : "建立") + " Pull Request " +
        (state.pr.number ? "#" + state.pr.number : "") +
        ' · <a href="' + esc(state.pr.url) + '" target="_blank" rel="noopener">查看 PR</a>' +
        '<br><span class="hint">等待擁有者審核合併；合併後前台才會更新。</span>';
      updateSavebar();
      toast(branchExists ? "已更新 Pull Request。" : "已建立 Pull Request，等待擁有者合併。", "ok", 6000);
    } finally {
      setBusy(false);
    }
  }

  async function writePath(directory, path, data) {
    var parts = path.split("/");
    var name = parts.pop();
    var current = directory;
    for (var i = 0; i < parts.length; i++) {
      current = await current.getDirectoryHandle(parts[i], { create: true });
    }
    var handle = await current.getFileHandle(name, { create: true });
    var writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  async function saveLocal() {
    var built = Core.buildAll(state.files, state.data);
    var keys = changedKeys(built);
    var uploadPaths = referencedUploads(built);
    if (!keys.length && !uploadPaths.length) {
      toast("內容沒有實際變更。", "ok");
      return;
    }
    try {
      if (typeof window.showDirectoryPicker === "function") {
        var directory = state.localDir;
        if (!directory) {
          directory = await window.showDirectoryPicker({ mode: "readwrite" });
          state.localDir = directory;
        }
        await directory.getFileHandle("index.html");
        setBusy(true, "寫入檔案…");
        for (var i = 0; i < keys.length; i++) {
          await writePath(directory, FILES[keys[i]], built[keys[i]]);
        }
        for (var j = 0; j < uploadPaths.length; j++) {
          await writePath(directory, uploadPaths[j], state.uploads[uploadPaths[j]].blob);
        }
        toast("已寫入 " + (keys.length + uploadPaths.length) + " 個檔案。", "ok", 5000);
      } else {
        keys.forEach(function (key) { downloadFile(FILES[key], built[key]); });
        uploadPaths.forEach(function (path) { downloadBlob(path.split("/").pop(), state.uploads[path].blob); });
        toast("已下載 " + (keys.length + uploadPaths.length) + " 個檔案，請覆蓋原檔。", "ok", 6000);
      }
      state.files = built;
      state.loaded = clone(state.data);
      state.dirty = false;
      markUploadsPushed(uploadPaths);
      updateSavebar();
    } catch (error) {
      if (error && error.name === "AbortError") return;
      if (error && (error.name === "NotFoundError" || error.name === "NotAllowedError" || error.name === "SecurityError")) {
        state.localDir = null;
        toast("選到的資料夾不正確或沒有寫入權限，請重新選擇 collapseht.github.io 資料夾。", "error", 7000);
      } else {
        toast("寫入失敗：" + (error && error.message ? error.message : error), "error", 7000);
      }
    } finally {
      setBusy(false);
    }
  }

  function downloadFile(name, text) {
    downloadBlob(name, new Blob([text], { type: "text/html;charset=utf-8" }));
  }

  function downloadBlob(name, blob) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function discard() {
    if (!state.loaded) return;
    if (!state.dirty) {
      toast("目前沒有變更。", "ok");
      return;
    }
    state.data = clone(state.loaded);
    state.dirty = false;
    clearUploads();
    renderPanels();
    updateSavebar();
    toast("已還原成載入時的內容。", "ok");
  }

  async function reload() {
    if (state.dirty && !window.confirm("有未儲存的變更，確定要重新載入嗎？")) return;
    if (state.mode === "local") await connectLocal();
    else await connectGitHub();
  }

  function logout() {
    if (state.dirty && !window.confirm("有未儲存的變更，確定要登出嗎？")) return;
    clearConfig();
    state.token = "";
    clearUploads();
    location.reload();
  }

  /* ---------------- 綁定 ---------------- */
  function bind() {
    el.setupView = $("#setupView");
    el.editorView = $("#editorView");
    el.repoInput = $("#repoInput");
    el.branchInput = $("#branchInput");
    el.tokenInput = $("#tokenInput");
    el.roleInput = $("#roleInput");
    el.publishInput = $("#publishInput");
    el.roleHint = $("#roleHint");
    el.connectBtn = $("#connectBtn");
    el.localBtn = $("#localBtn");
    el.setupHint = $("#setupHint");
    el.setupError = $("#setupError");
    el.repoBadge = $("#repoBadge");
    el.reloadBtn = $("#reloadBtn");
    el.logoutBtn = $("#logoutBtn");
    el.modeBadge = $("#modeBadge");
    el.roleNotice = $("#roleNotice");
    el.uploadHint = $("#uploadHint");
    el.loadInfo = $("#loadInfo");
    el.savebar = $("#savebar");
    el.savebarText = $("#savebarText");
    el.dirtyText = $("#dirtyText");
    el.saveBtn = $("#saveBtn");
    el.discardBtn = $("#discardBtn");
    el.toast = $("#toast");
    el.overlay = $("#overlay");
    el.overlayText = $("#overlayText");
    el.countUpdates = $("#countUpdates");
    el.countPosts = $("#countPosts");
    el.countGroup = $("#countGroup");

    el.connectBtn.addEventListener("click", connectGitHub);
    el.localBtn.addEventListener("click", connectLocal);
    el.saveBtn.addEventListener("click", save);
    el.discardBtn.addEventListener("click", discard);
    el.reloadBtn.addEventListener("click", reload);
    el.logoutBtn.addEventListener("click", logout);
    el.roleInput.addEventListener("change", syncRoleUI);
    el.tokenInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        connectGitHub();
      }
    });

    var panels = $("#panels");
    panels.addEventListener("input", function (event) {
      if (event.target.getAttribute && event.target.getAttribute("data-upload")) return;
      handleField(event);
    });
    panels.addEventListener("change", function (event) {
      if (event.target.getAttribute && event.target.getAttribute("data-upload")) handleUpload(event);
      else handleField(event);
    });
    panels.addEventListener("click", handleAction);

    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (tab) {
      tab.addEventListener("click", function () { activateTab(tab.getAttribute("data-tab")); });
    });

    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && (event.key === "s" || event.key === "S")) {
        if (!el.editorView.hidden) {
          event.preventDefault();
          if (state.dirty) save();
        }
      }
    });

    window.addEventListener("beforeunload", function (event) {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  /* ---------------- 啟動 ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    bind();
    if (isLocalEnv()) el.localBtn.hidden = false;

    var params = new URLSearchParams(location.search);
    var queryRole = params.get("role");
    var queryPublish = params.get("publish");
    var tab = params.get("tab");

    if (ROLES[queryRole]) {
      el.roleInput.value = queryRole;
      el.roleInput.disabled = true;
      el.setupHint.textContent = "此連結已鎖定權限模式：" + ROLES[queryRole].label;
    }
    if (queryPublish === "pr" || queryPublish === "direct") el.publishInput.value = queryPublish;
    if (tab === "updates" || tab === "posts" || tab === "group") state.initialTab = tab;

    var config = readConfig();
    if (config && config.token) {
      state.token = config.token;
      state.owner = config.owner;
      state.repo = config.repo;
      state.branch = config.branch || "main";
      el.repoInput.value = config.owner + "/" + config.repo;
      el.branchInput.value = state.branch;
      el.tokenInput.value = config.token;
      if (!ROLES[queryRole] && ROLES[config.role]) el.roleInput.value = config.role;
      if (!queryPublish && (config.publishMode === "pr" || config.publishMode === "direct")) {
        el.publishInput.value = config.publishMode;
      }
      el.setupHint.textContent = "使用已儲存的權杖連線中…";
      syncRoleUI();
      if (params.get("local") === "1" && isLocalEnv()) connectLocal();
      else connectGitHub();
    } else if (params.get("local") === "1" && isLocalEnv()) {
      syncRoleUI();
      connectLocal();
    } else {
      syncRoleUI();
      if (isLocalEnv()) el.setupHint.textContent = "也可以直接使用「本機檔案模式」，不用 GitHub 權杖。";
    }
  });
})();
