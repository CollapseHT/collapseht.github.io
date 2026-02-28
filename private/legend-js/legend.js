// protected-download.js

document.onkeydown = function () {
  if (event.ctrlKey && window.event.keyCode == 85) {
    return false;
  }
  if (window.event.keyCode == 123) {
    return false;
  }
  if (event.ctrlKey && window.event.keyCode == 83) {
    return false;
  }
  if (event.ctrlKey) {
    return false;
  }
};

async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const CORRECT_PASSWORD_HASH =
  "be39e577c2ec7189092f953270504594a71629d77a1c6ad93d96d1d38bdafcfb";

async function requestProtectedDownload() {
  const password = prompt("請輸入密碼：");

  if (!password) {
    alert("已取消");
    return;
  }

  const inputHash = await sha256(password);

  if (inputHash === CORRECT_PASSWORD_HASH) {
    // 密碼正確 → 開始下載
    const link = document.createElement("a");
    link.href = "./resource/boss1.6-holo(beta).7z"; // ← 改成你要下載的檔案路徑或名稱
    // 範例：
    // link.href = "files/機密資料.zip";
    // link.href = "https://example.com/報告.pdf";

    link.download = "boss1.6-holo(beta).7z"; // ← 建議設定，否則有些瀏覽器會用原始檔名
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    alert("密碼錯誤");
  }
}
