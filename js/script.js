/* =========================================================
   子彈の貓窩 ‧ 共用前端腳本
   載入畫面 / 導覽選單 / 時鐘 / 今日運勢 / 彩蛋
   ========================================================= */
(function () {
  "use strict";

  var doc = document;
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    reduceMotion = false;
  }

  /* ---------- 載入畫面 ---------- */
  (function initLoadingScreen() {
    var screen = doc.getElementById("loading-screen");
    if (!screen) return;

    var MIN_MS = 350;
    var start = (window.performance && performance.now) ? performance.now() : Date.now();
    var visited = false;
    try {
      visited = window.sessionStorage.getItem("mogumogu-visited") === "1";
    } catch (e) {
      visited = false; // 隱私模式下 sessionStorage 可能被封鎖
    }

    function dismiss() {
      screen.classList.add("fade-out");
      var remove = function () {
        screen.style.display = "none";
        screen.setAttribute("aria-hidden", "true");
      };
      screen.addEventListener("transitionend", remove, { once: true });
      window.setTimeout(remove, 700);
    }

    function afterLoad() {
      try {
        window.sessionStorage.setItem("mogumogu-visited", "1");
      } catch (e) {
        /* 忽略 */
      }
      if (visited || reduceMotion) {
        dismiss();
        return;
      }
      var elapsed = ((window.performance && performance.now) ? performance.now() : Date.now()) - start;
      var wait = Math.max(0, MIN_MS - elapsed);
      if (wait === 0) dismiss();
      else window.setTimeout(dismiss, wait);
    }

    if (doc.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
  })();

  /* ---------- 導覽選單 ---------- */
  (function initNav() {
    var toggle = doc.getElementById("mobileMenu");
    var links = doc.getElementById("navLinks");
    if (!toggle || !links) return;

    function setOpen(open) {
      links.classList.toggle("show", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "關閉導覽選單" : "開啟導覽選單");
    }

    toggle.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(!links.classList.contains("show"));
    });

    links.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    doc.addEventListener("click", function (event) {
      if (!links.classList.contains("show")) return;
      if (links.contains(event.target) || toggle.contains(event.target)) return;
      setOpen(false);
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && links.classList.contains("show")) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 680 && links.classList.contains("show")) setOpen(false);
    });
  })();

  /* ---------- 時鐘 ---------- */
  var CLOCK_IDS = ["liveClock", "liveClockEnhanced"];
  var CLOCK_MESSAGES = [
    [6, "🌙 夜深了，早點休息～"],
    [11, "🍙 おはよう！早餐吃個飯糰吧"],
    [14, "🍱 午餐時間～もぐもぐ"],
    [18, "🍵 下午茶，來點小粥的歌"],
    [22, "🎮 晚上一起打遊戲！"]
  ];

  function clockMessage(hour) {
    for (var i = 0; i < CLOCK_MESSAGES.length; i++) {
      if (hour < CLOCK_MESSAGES[i][0]) return CLOCK_MESSAGES[i][1];
    }
    return "🐾 もぐもぐ～晚安～";
  }

  function updateClocks() {
    var now = new Date();
    var time = now.toLocaleTimeString("zh-TW", { hour12: false });
    var message = clockMessage(now.getHours());

    for (var i = 0; i < CLOCK_IDS.length; i++) {
      var el = doc.getElementById(CLOCK_IDS[i]);
      if (el) el.textContent = time;
    }
    var msgEl = doc.getElementById("clockMessageEnhanced");
    if (msgEl) msgEl.textContent = message;
    var msgElBasic = doc.getElementById("clockMessage");
    if (msgElBasic) msgElBasic.textContent = message.replace(/^[^\s]+\s/, "");
  }

  updateClocks();
  window.setInterval(function () {
    if (!doc.hidden) updateClocks();
  }, 1000);

  /* ---------- 今日運勢（同一天固定） ---------- */
  function dailyFortune() {
    var today = new Date();
    var seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    // 以日期為種子的穩定亂數（mulberry32 變體）
    function random(salt) {
      var t = (seed + salt * 0x9e3779b9) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    var levels = [
      { name: "🌸 大吉", weight: 1 },
      { name: "🍙 中吉", weight: 2 },
      { name: "🐾 小吉", weight: 3 },
      { name: "🍵 末吉", weight: 2 },
      { name: "🌙 凶", weight: 1 }
    ];

    var total = 0;
    for (var i = 0; i < levels.length; i++) total += levels[i].weight;
    var roll = random(1) * total;
    var level = levels[0];
    for (var j = 0; j < levels.length; j++) {
      if (roll < levels[j].weight) {
        level = levels[j];
        break;
      }
      roll -= levels[j].weight;
    }

    var fortunes = {
      "🌸 大吉": {
        text: "今天非常幸運！你的笑容會感染身邊的人。",
        item: "飯糰 (吃到就是福氣)",
        color: "紫色 / 金色",
        advice: "もぐもぐ～今天適合主動出擊喔！"
      },
      "🍙 中吉": {
        text: "平穩中帶點小驚喜，適合嘗試新事物。",
        item: "貓掌小吊飾",
        color: "粉紫色",
        advice: "おかゆと一緒に頑張ろう～"
      },
      "🐾 小吉": {
        text: "小小幸運藏在日常裡，留心觀察。",
        item: "溫熱的茶",
        color: "淺紫色",
        advice: "もぐもぐ～慢慢來也沒關係的。"
      },
      "🍵 末吉": {
        text: "稍有波折，但結局會是好的。",
        item: "糖果",
        color: "薰衣草色",
        advice: "累了就休息一下，もぐもぐ～"
      },
      "🌙 凶": {
        text: "可能遇到小挫折，轉換心情很重要。",
        item: "軟綿綿的枕頭",
        color: "深紫色",
        advice: "明天會更好，今天もぐもぐ放鬆吧～"
      }
    };

    var f = fortunes[level.name];
    return { level: level.name, text: f.text, item: f.item, color: f.color, advice: f.advice };
  }

  (function initFortune() {
    var levelEl = doc.getElementById("fortuneLevel");
    if (!levelEl) return;
    var fortune = dailyFortune();
    var map = {
      fortuneLevel: fortune.level,
      fortuneText: fortune.text,
      fortuneItem: fortune.item,
      fortuneColor: fortune.color,
      fortuneAdvice: fortune.advice
    };
    Object.keys(map).forEach(function (id) {
      var el = doc.getElementById(id);
      if (el) el.textContent = map[id];
    });
  })();

  /* ---------- 提示泡泡 ---------- */
  var toastTimer = null;
  function showToast(message) {
    var existing = doc.querySelector(".cute-toast");
    if (existing) existing.remove();
    if (toastTimer) window.clearTimeout(toastTimer);

    var toast = doc.createElement("div");
    toast.className = "cute-toast";
    toast.setAttribute("role", "status");

    var iconLeft = doc.createElement("div");
    iconLeft.className = "toast-icon";
    iconLeft.textContent = "🐾";

    var text = doc.createElement("div");
    text.className = "toast-message";
    text.textContent = message;

    var iconRight = doc.createElement("div");
    iconRight.className = "toast-icon";
    iconRight.textContent = "🍙";

    toast.appendChild(iconLeft);
    toast.appendChild(text);
    toast.appendChild(iconRight);
    doc.body.appendChild(toast);

    void toast.offsetHeight; // 強制重繪以觸發動畫
    toast.classList.add("show");

    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2200);
  }

  /* ---------- 右鍵小提醒（可於此關閉） ---------- */
  var PLAYFUL_CONTEXT_TOAST = true;
  if (PLAYFUL_CONTEXT_TOAST) {
    doc.addEventListener("contextmenu", function (event) {
      var target = event.target;
      if (target && (target.closest("input, textarea, select, [contenteditable]") || target.closest(".no-guard"))) {
        return;
      }
      event.preventDefault();
      showToast("もぐもぐ～不能偷看喔 🐾");
    });
  }

  /* ---------- 貓掌小彩蛋 ---------- */
  (function initPaw() {
    var paw = doc.getElementById("clickablePaw");
    if (!paw) return;

    var audio = null;
    paw.addEventListener("click", function () {
      if (!audio) {
        audio = new Audio("images/secret.mp3");
        audio.volume = 0.3;
      }
      var playing = audio.play();
      if (playing && typeof playing.catch === "function") playing.catch(function () {});

      if (paw.dataset.busy === "1") return;
      paw.dataset.busy = "1";
      var original = paw.innerHTML;
      paw.innerHTML = '<i class="fa-solid fa-heart"></i> もぐもぐ！ <i class="fa-solid fa-heart"></i>';
      window.setTimeout(function () {
        paw.innerHTML = original;
        paw.dataset.busy = "0";
      }, 3000);
    });
  })();

  // 供其他頁面或除錯使用
  window.showToast = showToast;
})();
