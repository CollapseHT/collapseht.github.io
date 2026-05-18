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

// ===== 今日運勢（基於日期固定）=====
function getDailyFortune() {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  // 簡單的偽隨機函數
  const rnd = (max) => {
    const x = Math.sin(seed) * 10000 + seed;
    const r = (x - Math.floor(x)) * max;
    return Math.floor(r);
  };

  const levels = [
    { name: "🌸 大吉", weight: 1 },
    { name: "🍙 中吉", weight: 2 },
    { name: "🐾 小吉", weight: 3 },
    { name: "🍵 末吉", weight: 2 },
    { name: "🌙 凶", weight: 1 },
  ];
  // 根據權重抽取
  let totalWeight = levels.reduce((sum, l) => sum + l.weight, 0);
  let rand = rnd(totalWeight);
  let levelObj = levels[0];
  for (let l of levels) {
    if (rand < l.weight) {
      levelObj = l;
      break;
    }
    rand -= l.weight;
  }
  const level = levelObj.name;

  // 對應內容庫
  const fortunes = {
    "🌸 大吉": {
      text: "今天非常幸運！你的笑容會感染身邊的人。",
      item: "飯糰 (吃到就是福氣)",
      color: "紫色 / 金色",
      advice: "もぐもぐ～今天適合主動出擊喔！",
    },
    "🍙 中吉": {
      text: "平穩中帶點小驚喜，適合嘗試新事物。",
      item: "貓掌小吊飾",
      color: "粉紫色",
      advice: "おかゆと一緒に頑張ろう～",
    },
    "🐾 小吉": {
      text: "小小幸運藏在日常裡，留心觀察。",
      item: "溫熱的茶",
      color: "淺紫色",
      advice: "もぐもぐ～慢慢來也沒關係的。",
    },
    "🍵 末吉": {
      text: "稍有波折，但結局會是好的。",
      item: "糖果",
      color: "薰衣草色",
      advice: "累了就休息一下，もぐもぐ～",
    },
    "🌙 凶": {
      text: "可能遇到小挫折，轉換心情很重要。",
      item: "軟綿綿的枕頭",
      color: "深紫色",
      advice: "明天會更好，今天もぐもぐ放鬆吧～",
    },
  };

  const f = fortunes[level];
  return {
    level: level,
    text: f.text,
    item: f.item,
    color: f.color,
    advice: f.advice,
  };
}

function displayFortune() {
  const fortune = getDailyFortune();
  const levelEl = document.getElementById("fortuneLevel");
  const textEl = document.getElementById("fortuneText");
  const itemEl = document.getElementById("fortuneItem");
  const colorEl = document.getElementById("fortuneColor");
  const adviceEl = document.getElementById("fortuneAdvice");

  if (levelEl) levelEl.innerText = fortune.level;
  if (textEl) textEl.innerText = fortune.text;
  if (itemEl) itemEl.innerText = fortune.item;
  if (colorEl) colorEl.innerText = fortune.color;
  if (adviceEl) adviceEl.innerText = fortune.advice;
}

// 執行顯示運勢
displayFortune();
