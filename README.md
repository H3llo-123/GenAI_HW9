# 個人私藏餐廳攻略網站

本專案為一個以「美食知識庫與實用指南」為核心的個人餐廳收藏網站，採「**一間餐廳一篇深度攻略**」的形式持續累積內容。

初期收藏範圍以台北市文山區為主（政大商圈、木柵優先），並設有獨立的「雷店清單」，忠實記錄個人用餐經驗。

---

## 專案特色與架構

1. **純純靜態網頁（Zero-Build）**
   - 僅使用純 HTML5、CSS3、原生 JavaScript。
   - 無需 Node.js、npm、打包工具或框架。
   - 所有資料寫於 `.js` 檔中以全域變數提供，不使用 `fetch` 或 `.json`，支援本機「直接雙擊開啟（`file://`）」與「GitHub Pages」線上部署。
   - 全站所有連結與資源引用均採用相對路徑。

2. **雜誌編輯風格**
   - 統一俐落的版面層次與內建襯線／非襯線字體設計。
   - 唯一的品牌強調色：紫色（`#5B3E8C`）。
   - 統一規範之元件：卡片（`.card`）、標籤（`.tag`）、情報表（`.info-table`）、評分顯示（`.score`）、必點標記（`.badge-must`）。

3. **雙清單架構**
   - **精選推薦**（`index.html`）：提供多維度搜尋（店名、地區、菜色、標籤）、階層式行政區與商圈篩選、料理類型與用餐情境複選、價位與評分排序、每頁 12 筆分頁。
   - **雷店清單**（`blacklist.html`）：獨立記錄不推薦店家，逐字呈現雷點原因，不混入首頁推薦清單。

---

## 目錄結構

```text
/
├─ AGENTS.md              給 AI 的工作規範與嚴格邊界規則
├─ README.md              專案說明文件（本檔）
├─ index.html             網站首頁（推薦餐廳檢索與卡片牆）
├─ blacklist.html         雷店清單頁
├─ style.css              全站唯一共用樣式表（禁止行內樣式）
├─ app.js                 首頁檢索、篩選、分頁與雷店清單渲染腳本
├─ data/
│  ├─ restaurants.js      推薦餐廳資料庫（全域變數 window.RESTAURANTS）
│  ├─ blacklist.js        雷店資料庫（全域變數 window.BLACKLIST）
│  └─ taxonomy.js         分類字典（商圈代碼、料理類型、用餐情境、價位區間）
├─ templates/
│  ├─ restaurant-template.html   單篇推薦餐廳深度攻略範本
│  └─ blacklist-template.html    單篇雷店深度記錄範本
├─ restaurants/           推薦餐廳單篇攻略（001-xxx/index.html）
├─ blacklist/             雷店單篇記錄（001-xxx/index.html）
├─ images/                圖片資源目錄
│  ├─ restaurants/        推薦店家圖片（cover, menu, dish 等）
│  └─ blacklist/          雷店圖片
└─ notes/                 原始零散筆記與結構化中繼資料
   ├─ _template.md        筆記範本
   ├─ restaurants/
   └─ blacklist/
```

---

## 瀏覽與使用方式

### 1. 本地開啟
直接用瀏覽器雙擊開啟專案根目錄下的 `index.html` 或 `blacklist.html` 即可瀏覽，無需架設伺服器。

### 2. 部署於 GitHub Pages
推送至 GitHub Repository 後，在倉庫的 **Settings** -> **Pages** 中，將 Source 設為 `Deploy from a branch`（選擇 `main` 分支與根目錄 `/`），即可自動發布至 GitHub Pages。

---

## 新增餐廳攻略流程

本專案由 AI 輔助建立與維護，工作規則嚴格規範於 `AGENTS.md`：

1. **提供筆記**：使用者提供餐廳零散筆記，包含店名、商圈、料理類型、人均價格、評分、一句話推坑理由、點過的菜色與評論。
2. **存入筆記**：存至 `notes/restaurants/<編號-店名>.md`，原話記錄。
3. **建立單篇頁面**：複製 `templates/restaurant-template.html` 至 `restaurants/<編號-店名>/index.html`，依固定 8 大區塊填入結構化情報。
4. **登錄資料檔**：將欄位同步登錄至 `data/restaurants.js`，首頁即自動完成索引與卡片展示。
