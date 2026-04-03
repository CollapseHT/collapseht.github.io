// match-game.js
// 6x6 翻牌配對消除遊戲 - 支援動態尺寸

(function () {
  // ---------- 遊戲設定 ----------
  const SIZE = 10; // 6x6 棋盤 (可自由修改此數值，例如 4 或 6)
  const TOTAL_CELLS = SIZE * SIZE; // 36 張牌
  const PAIR_COUNT = TOTAL_CELLS / 2; // = 18 種數字 (1~18)

  // ---------- 全域變數 ----------
  let boardCards = []; // 儲存每個位置的數字
  let cardState = []; // 記錄每個位置的狀態: 'hidden', 'revealed', 'matched'
  let waiting = false; // 是否正在等待動畫比對返回
  let pendingFirstIndex = null; // 第一個翻開的卡牌索引
  let moveAttempts = 0; // 嘗試次數 (每完成一次配對判斷為一次嘗試)
  let flipCount = 0; // 翻牌次數 (每次點擊翻開一張牌就 +1)
  let gameFinished = false; // 遊戲是否已結束

  // DOM 元素
  const boardContainer = document.getElementById("board");
  const gameStatusDiv = document.getElementById("gameStatus");
  const moveCountSpan = document.getElementById("moveCount");
  const flipCountSpan = document.getElementById("flipCount");
  const resetBtn = document.getElementById("resetBtn");

  // 動態設定棋盤格子的寬度（根據螢幕尺寸自動調整，讓 6x6 也能完整顯示）
  function setBoardStyle() {
    if (boardContainer) {
      // 計算適當的卡片尺寸：桌面版使用 70px，若畫面太窄則使用 min(70px, 可用寬度/7)
      const screenWidth = window.innerWidth;
      let cardSize = 70;
      if (screenWidth < 550) {
        cardSize = Math.floor((screenWidth - 40) / (SIZE + 1));
        if (cardSize < 45) cardSize = 45;
      }
      boardContainer.style.display = "grid";
      boardContainer.style.gridTemplateColumns = `repeat(${SIZE}, ${cardSize}px)`;
      boardContainer.style.gap = "8px";
      boardContainer.style.justifyContent = "center";
    }
  }

  // 更新嘗試次數顯示
  function updateMoveDisplay() {
    if (moveCountSpan) moveCountSpan.textContent = `嘗試次數：${moveAttempts}`;
  }

  // 更新翻牌次數顯示
  function updateFlipDisplay() {
    if (flipCountSpan) flipCountSpan.textContent = `翻牌次數：${flipCount}`;
  }

  // 更新遊戲狀態文字
  function updateGameStatusMessage(msg, isError = false) {
    if (!gameStatusDiv) return;
    gameStatusDiv.innerHTML = `狀態：${msg}`;
    if (isError) {
      gameStatusDiv.innerHTML = `狀態：⚠️ ${msg}`;
    } else {
      if (msg.includes("勝利")) {
        gameStatusDiv.innerHTML = `狀態：🎉 ${msg} 🎉`;
      } else {
        gameStatusDiv.innerHTML = `狀態：${msg}`;
      }
    }
  }

  // 檢查是否全部消除
  function checkGameComplete() {
    const allMatched = cardState.every((state) => state === "matched");
    if (allMatched && !gameFinished) {
      gameFinished = true;
      updateGameStatusMessage(
        `恭喜勝利！總共嘗試 ${moveAttempts} 次，翻牌 ${flipCount} 次，所有卡片配對消除！`,
      );
      renderBoard();
      return true;
    }
    return false;
  }

  // 渲染整個棋盤
  function renderBoard() {
    if (!boardContainer) return;
    boardContainer.innerHTML = "";
    setBoardStyle(); // 重新套用格線樣式

    for (let i = 0; i < TOTAL_CELLS; i++) {
      const cardValue = boardCards[i];
      const state = cardState[i];

      const cardBtn = document.createElement("button");
      // 卡片尺寸由 CSS grid 控制，這裡設定寬高為 auto 填滿格子
      cardBtn.style.width = "100%";
      cardBtn.style.aspectRatio = "1 / 1"; // 保持正方形
      cardBtn.style.fontSize = "clamp(18px, 5vw, 28px)";
      cardBtn.style.fontWeight = "bold";
      cardBtn.style.textAlign = "center";
      cardBtn.style.cursor = "pointer";
      cardBtn.style.backgroundColor = "#f0f0f0";
      cardBtn.style.border = "2px solid #aaa";
      cardBtn.style.borderRadius = "8px";
      cardBtn.style.padding = "0";

      if (state === "matched") {
        cardBtn.textContent = "✓";
        cardBtn.disabled = true;
        cardBtn.style.backgroundColor = "#c8e6c9";
        cardBtn.style.borderColor = "#2e7d32";
      } else if (state === "revealed") {
        cardBtn.textContent = cardValue;
        cardBtn.disabled = false;
        cardBtn.style.backgroundColor = "#fff9c4";
        cardBtn.style.borderColor = "#fbc02d";
      } else {
        cardBtn.textContent = "?";
        cardBtn.disabled = false;
        cardBtn.style.backgroundColor = "#b0bec5";
        cardBtn.style.borderColor = "#455a64";
      }

      if (gameFinished) {
        cardBtn.disabled = true;
      }

      cardBtn.dataset.index = i;
      cardBtn.addEventListener(
        "click",
        (function (idx) {
          return function () {
            onCardClick(idx);
          };
        })(i),
      );

      boardContainer.appendChild(cardBtn);
    }
  }

  // 主要點擊邏輯
  function onCardClick(clickedIdx) {
    if (gameFinished) {
      updateGameStatusMessage("遊戲已經結束，請按「重新洗牌」繼續遊玩", true);
      return;
    }

    if (waiting) {
      updateGameStatusMessage("請等待動畫結束再點擊", true);
      return;
    }

    const currentState = cardState[clickedIdx];
    if (currentState === "matched") {
      updateGameStatusMessage("這張牌已經消除了！", true);
      return;
    }

    if (currentState === "revealed") {
      updateGameStatusMessage("這張牌已經翻開了，請選擇其他卡片", true);
      return;
    }

    // 狀態為 hidden，翻牌數 +1
    flipCount++;
    updateFlipDisplay();

    // 情況1: 沒有等待配對的第一張牌
    if (pendingFirstIndex === null) {
      cardState[clickedIdx] = "revealed";
      renderBoard();
      pendingFirstIndex = clickedIdx;
      updateGameStatusMessage(
        `翻開第一張牌: ${boardCards[clickedIdx]}，再選另一張配對`,
      );
      return;
    }

    // 情況2: 點擊同一張卡片
    if (pendingFirstIndex === clickedIdx) {
      updateGameStatusMessage("不能重複選擇同一張卡片", true);
      return;
    }

    // 情況3: 已有第一張牌，點擊不同卡片
    const firstIdx = pendingFirstIndex;
    const secondIdx = clickedIdx;

    if (cardState[firstIdx] !== "revealed") {
      pendingFirstIndex = null;
      onCardClick(clickedIdx);
      return;
    }

    // 翻開第二張牌
    cardState[secondIdx] = "revealed";
    renderBoard();

    const firstValue = boardCards[firstIdx];
    const secondValue = boardCards[secondIdx];

    if (firstValue === secondValue) {
      // 配對成功
      pendingFirstIndex = null;
      cardState[firstIdx] = "matched";
      cardState[secondIdx] = "matched";
      moveAttempts++;
      updateMoveDisplay();
      updateGameStatusMessage(`配對成功！消除了數字 ${firstValue}，繼續配對～`);
      renderBoard();
      checkGameComplete();
      if (gameFinished) {
        renderBoard();
      }
    } else {
      // 配對失敗
      pendingFirstIndex = null;
      moveAttempts++;
      updateMoveDisplay();
      updateGameStatusMessage(
        `配對失敗 (${firstValue} 與 ${secondValue} 不相同)，卡片即將翻回`,
      );

      waiting = true;
      setTimeout(() => {
        if (
          !gameFinished &&
          cardState[firstIdx] === "revealed" &&
          cardState[secondIdx] === "revealed"
        ) {
          cardState[firstIdx] = "hidden";
          cardState[secondIdx] = "hidden";
          renderBoard();
        }
        waiting = false;
        if (!gameFinished) {
          checkGameComplete();
          if (!gameFinished) {
            updateGameStatusMessage("遊戲進行中");
          }
        }
      }, 800);
    }
  }

  // 初始化或重置遊戲
  function initGame() {
    // 建立配對數字陣列：數字 1 ~ PAIR_COUNT，每個出現兩次
    let cardValues = [];
    for (let i = 1; i <= PAIR_COUNT; i++) {
      cardValues.push(i, i);
    }
    // Fisher-Yates 洗牌
    for (let i = cardValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardValues[i], cardValues[j]] = [cardValues[j], cardValues[i]];
    }
    boardCards = [...cardValues];
    cardState = new Array(TOTAL_CELLS).fill("hidden");

    // 重置遊戲變數
    waiting = false;
    pendingFirstIndex = null;
    moveAttempts = 0;
    flipCount = 0;
    gameFinished = false;

    // 清除可能殘留的計時器
    if (window._mismatchTimer) {
      clearTimeout(window._mismatchTimer);
      window._mismatchTimer = null;
    }

    updateMoveDisplay();
    updateFlipDisplay();
    updateGameStatusMessage("遊戲已重置，開始翻牌配對！");
    renderBoard();
  }

  // 重置按鈕事件
  if (resetBtn) {
    resetBtn.onclick = function () {
      if (window._mismatchTimer) {
        clearTimeout(window._mismatchTimer);
        window._mismatchTimer = null;
      }
      initGame();
    };
  }

  // 視窗尺寸改變時重新調整棋盤格子大小
  window.addEventListener("resize", () => {
    if (!gameFinished) {
      setBoardStyle();
    }
  });

  // 啟動遊戲
  initGame();
})();
