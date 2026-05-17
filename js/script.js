// ===== 載入畫面處理（保證最小顯示時間 + 淡出）=====
const MIN_DISPLAY_MS = 500;
const startTime = Date.now();

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (!loadingScreen) return;
  loadingScreen.classList.add("fade-out");
  const onTransitionEnd = () => {
    loadingScreen.style.display = "none";
    loadingScreen.removeEventListener("transitionend", onTransitionEnd);
  };
  loadingScreen.addEventListener("transitionend", onTransitionEnd);
  setTimeout(() => {
    if (loadingScreen.style.display !== "none") {
      loadingScreen.style.display = "none";
    }
  }, 1200);
}

function tryHide() {
  const elapsed = Date.now() - startTime;
  const remaining = MIN_DISPLAY_MS - elapsed;
  if (remaining <= 0) {
    hideLoadingScreen();
  } else {
    setTimeout(hideLoadingScreen, remaining);
  }
}

if (document.readyState === "complete") {
  tryHide();
} else {
  window.addEventListener("load", tryHide);
}

// ===== 可愛的淡入淡出提示元件 =====
function showToast(message) {
  // 如果已經有 toast 存在，先移除避免重複
  const existingToast = document.querySelector(".cute-toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = "cute-toast";
  toast.innerHTML = `
        <div class="toast-icon">🐾</div>
        <div class="toast-message">${message}</div>
        <div class="toast-icon">🍙</div>
    `;
  document.body.appendChild(toast);

  // 強制重繪以觸發動畫
  toast.offsetHeight;
  toast.classList.add("show");

  // 3 秒後淡出移除
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 2500);
}

// ===== 防右鍵 + 防組合鍵，並顯示可愛提示 =====
document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  showToast("もぐもぐ～不能偷看喔 🐾");
  return false;
});

document.addEventListener("keydown", function (e) {
  let blocked = false;
  let toastMsg = "もぐもぐ～不行喔 🍙";

  if (e.key === "F12") {
    blocked = true;
    toastMsg = "🐾 F12 被封印了～もぐもぐ";
  } else if (
    (e.ctrlKey || e.metaKey) &&
    e.shiftKey &&
    (e.key === "I" || e.key === "i")
  ) {
    blocked = true;
    toastMsg = "🐾 開發者工具不能開喔！";
  } else if (
    (e.ctrlKey || e.metaKey) &&
    e.shiftKey &&
    (e.key === "J" || e.key === "j")
  ) {
    blocked = true;
    toastMsg = "🐾 コンソールは見れません～";
  } else if ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u")) {
    blocked = true;
    toastMsg = "🍙 原始碼是秘密～もぐもぐ";
  } else if ((e.ctrlKey || e.metaKey) && (e.key === "S" || e.key === "s")) {
    blocked = true;
    toastMsg = "📄 儲存功能暫時不開放～";
  } else if (
    (e.ctrlKey || e.metaKey) &&
    e.shiftKey &&
    (e.key === "C" || e.key === "c")
  ) {
    blocked = true;
    toastMsg = "✨ 元素檢視器休息中～";
  }

  if (blocked) {
    e.preventDefault();
    showToast(toastMsg);
    return false;
  }
});

// ===== 貓掌按鈕互動 (音效 + 視覺回饋) =====
document.addEventListener("DOMContentLoaded", () => {
  const pawButton = document.getElementById("clickablePaw");
  if (pawButton) {
    pawButton.addEventListener("click", () => {
      const audio = new Audio("images/secret.mp3");
      audio.volume = 0.3;
      audio.play().catch((e) => console.log("音效播放失敗：", e));
      const originalHTML = pawButton.innerHTML;
      pawButton.innerHTML =
        '<i class="fa-solid fa-heart"></i> もぐもぐ！ <i class="fa-solid fa-heart"></i>';
      setTimeout(() => {
        pawButton.innerHTML = originalHTML;
      }, 3000);
    });
  }
});

// ===== 時鐘功能 =====
function updateClock() {
  const clockEl = document.getElementById("liveClock");
  if (clockEl) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("zh-TW");
    clockEl.innerText = timeStr;
    const hour = now.getHours();
    let msg = "もぐもぐ～おかゆ～";
    if (hour < 6) msg = "夜深了，早點休息～";
    else if (hour < 11) msg = "おはよう～早餐想吃飯糰嗎？";
    else if (hour < 14) msg = "午餐時間！もぐもぐ～";
    else if (hour < 18) msg = "下午茶來個飯糰吧🍙";
    else if (hour < 22) msg = "晚上好，一起打遊戲🎮";
    else msg = "もぐもぐ～晚安～";
    const msgEl = document.getElementById("clockMessage");
    if (msgEl) msgEl.innerText = msg;
  }
}
updateClock();
setInterval(updateClock, 1000);

function updateEnhancedClock() {
  const clockEnhanced = document.getElementById("liveClockEnhanced");
  if (clockEnhanced) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("zh-TW", { hour12: false });
    clockEnhanced.innerText = timeStr;
    const hour = now.getHours();
    let msg = "もぐもぐ～おかゆ～";
    if (hour < 6) msg = "🌙 夜深了，早點休息～";
    else if (hour < 11) msg = "🍙 おはよう！早餐吃個飯糰吧";
    else if (hour < 14) msg = "🍱 午餐時間～もぐもぐ";
    else if (hour < 18) msg = "🍵 下午茶，來點小粥的歌";
    else if (hour < 22) msg = "🎮 晚上一起打遊戲！";
    else msg = "🐾 もぐもぐ～晚安～";
    const msgEnhanced = document.getElementById("clockMessageEnhanced");
    if (msgEnhanced) msgEnhanced.innerText = msg;
  }
}
updateEnhancedClock();
setInterval(updateEnhancedClock, 1000);
