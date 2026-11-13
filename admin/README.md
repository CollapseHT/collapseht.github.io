# 子彈の貓窩 ‧ 內容管理後台

後台是**純靜態**頁面，不需要資料庫或後端伺服器。它有兩種模式：

| 模式 | 適合 | 儲存方式 |
| --- | --- | --- |
| GitHub 模式 | 平常在線上管理 | 用 GitHub token 直接 commit 到 repo，GitHub Pages 約 1 分鐘後更新 |
| 本機檔案模式 | 先在本機改、確認版面 | 直接寫回本機 HTML（Chrome / Edge），或下載三個 HTML 覆蓋 |

前台仍然是原本的靜態 HTML，沒有改成 JS 渲染，所以 SEO、載入速度與原本一模一樣。

---

## 1. 本機模式（不用 token，先試用）

在 collapseht.github.io 資料夾執行：

    node admin/serve.mjs

然後開：

- 前台：http://127.0.0.1:5173/
- 後台：http://127.0.0.1:5173/admin/

進入後台後按「本機檔案模式」，會讀取同一資料夾的 update.html、blog.html、group.html。
改完按「儲存檔案」：

- Chrome / Edge：會請你選擇 collapseht.github.io 資料夾，直接寫回三個 HTML。
- 其他瀏覽器：會下載三個 HTML，手動覆蓋原檔。

> serve.mjs 只綁定 127.0.0.1，只有這台電腦能連線，不會對外開放。
> 如果 5173 被占用：PORT=5174 node admin/serve.mjs。

---

## 2. GitHub 模式（線上管理）

### 2-1. 先部署一次包含編輯標記的前台

後台是讀 GitHub 上的 update.html / blog.html / group.html 來編輯，
所以**第一次使用前，必須先把目前這版前台 push 上去**（三個檔案裡要有 AUTO 註解標記）。
如果 GitHub 上的版本還是舊的，後台會顯示「找不到編輯標記」。

### 2-2. 建立 Fine-grained token

1. GitHub → 右上角頭像 → **Settings**
2. 左側最下方 → **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
4. 名稱：mogumogu-admin，Expiration：90 天
5. Repository access：**Only select repositories** → 只選 CollapseHT/collapseht.github.io
6. Repository permissions → **Contents** → **Read and write**
7. 需要 PR 模式時：**Pull requests** → **Read and write**
8. 朋友要先被邀請成這個 repo 的 collaborator（Settings → Collaborators）
9. 產生後複製 github_pat_... 開頭的字串

### 2-3. 連線

在後台填入 owner/repo、branch、token，按「驗證並載入」。
權杖只會存在這台裝置的 localStorage，不會寫進網站、不會出現在網址或 console。
換電腦或按「登出」就會清除。

### 2-4. 儲存

按「儲存並發布」後，後台會：

1. 用 Git Trees API 建立一個 commit（一次包含所有改到的頁面）
2. 更新 main 分支
3. GitHub Pages 重新部署（約 1 分鐘）

### 2-5. 權限模式（朋友只能編輯某一區）

後台在連線前可以選「權限模式」：

| 模式 | 可編輯 | 發布方式 |
| --- | --- | --- |
| 擁有者 | 全部 | 直接提交 main 或 PR |
| 內容編輯 | 更新歷程 / 部落格 / 放浪團 | 一律 PR |
| 放浪團編輯 | 放浪團 | 一律 PR |
| 部落格編輯 | 部落格 | 一律 PR |
| 更新歷程編輯 | 更新歷程 | 一律 PR |

朋友第一次可以用網址直接鎖定模式：

    https://collapseht.github.io/admin/?role=group

他用自己的 GitHub 帳號建立 token、貼上後，只會看到「放浪團」分頁。
儲存時後台會建立一個 branch 與 Pull Request，**不會直接寫 main**。
同一次連線裡再按儲存，會更新同一個 PR。

> 這是客戶端限制，不是真正的伺服器權限。要讓它變成真的權限，
> 請在 GitHub 對 main 開啟分支保護：Settings → Rules → Rulesets →
> Require a pull request before merging。這樣即使朋友改後台程式碼、
> 或直接呼叫 GitHub API，也只能建立 PR，不能推 main。

朋友需要用自己的帳號被加為 collaborator；不要把擁有者的 token 給朋友。
建議每位朋友各自產生一組 Fine-grained token（Contents + Pull requests）。

---

## 3. 可以改什麼

### 更新歷程（update.html）

- 日期、類型（更新 / 優化 / 修正 / 新增 / 活動，可自訂）、內容
- 新增、刪除、上下排序

### 部落格（blog.html）

- 標題、日期、分類、圖示（Font Awesome 圖示名稱）、摘要
- 摘要換行會顯示成換行
- 新增、刪除、上下排序

### 放浪團（group.html）

- 團體簡介
- 精選圖片路徑、替代文字、標題、說明
- 放浪團近況（日期 / 類型 / 內容）
- 主要成員、次級成員：名字、標籤、頭像路徑、主修圖示、主修、介紹
- 成員可以上下排序、在主要 / 次級之間移動、新增、刪除

圖片可以直接上傳：成員頭像與精選圖片旁有「上傳圖片」按鈕。
上傳後瀏覽器會壓縮成 WebP（頭像最長邊 640px、精選圖 1200px），
儲存時跟 HTML 一起 commit 到 group/up-....webp；本機模式則直接寫入資料夾。

也可以手動填路徑，例如 group/yen.jpg；支援 .jpg、.png、.webp。

---

## 4. 原理與編輯標記

前台三個頁面裡有這些註解標記，後台只會替換標記中間的內容，其他 head、導覽、footer、樣式都不會動：

| 標記 | 位置 |
| --- | --- |
| AUTO:UPDATES | update.html 的表格列 |
| AUTO:POSTS | blog.html 的文章卡片 |
| AUTO:GROUP_INTRO | group.html 的團體簡介 |
| AUTO:FEATURED | group.html 的精選圖片與文字 |
| AUTO:GROUP_NEWS | group.html 的近況時間軸 |
| AUTO:MAIN_MEMBERS | group.html 的主要成員卡片 |
| AUTO:SUB_MEMBERS | group.html 的次級成員卡片 |

**請不要手動刪除這些註解**，否則後台會讀不到。
如果你手動改了標記區塊裡的 HTML，格式可能會被後台下次儲存時覆蓋（內容會保留，排版會用後台模板重建）。

### 檔案結構

    admin/
      index.html   後台介面（noindex）
      admin.css    後台樣式
      core.js      解析 / 渲染（瀏覽器 + Node 共用）
      app.js       UI + GitHub API + 本機存檔
      serve.mjs    本機靜態伺服器（無第三方依賴）

---

## 5. 疑難排解

| 狀況 | 處理 |
| --- | --- |
| 「找不到編輯標記」 | GitHub 上的前台還是舊版，請先 push 目前這版 |
| 401 | token 過期或打錯，重新產生 |
| 403 | token 沒有 Contents: Read and write，或 API 次數用完 |
| 422 / 409 | 遠端有新的 commit，按「重新載入」再儲存 |
| 本機模式無法寫入 | 用 Chrome / Edge，並從 http://127.0.0.1:5173/admin/ 開啟；或改用下載檔案 |
| 圖片破圖 | 路徑要相對網站根目錄，例如 group/xxx.jpg，不是 ../group/xxx.jpg |
| 儲存後前台沒變 | GitHub Pages 需要約 1 分鐘；可按 Ctrl+Shift+R 強制重新整理 |

## 6. 安全性

- 後台頁面本身是公開的，但**沒有 token 就只能看設定畫面，不能讀寫 repo**。
- token 存在瀏覽器 localStorage，任何同來源的 JavaScript 都讀得到。這個站沒有載入第三方 JS（只有 Google Fonts 與 Font Awesome 的 CSS），風險很低；但不要在公用電腦使用。
- 建議 token 只給這一個 repo 的 Contents（PR 模式再加 Pull requests）權限，並設定到期日；外流就立刻撤銷。
- 朋友請各自使用自己的 GitHub 帳號與 token，不要共用擁有者的 token。
- 如果之後想改成「多人 / 免 token」的線上後台，需要另外接 OAuth 或第三方 CMS（例如 Decap CMS + OAuth proxy），那是另一個架構。
