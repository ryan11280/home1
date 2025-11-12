# 房產決策分析儀 (Property Decision Assistant) v4.0

這是一個使用 React + Vite + TypeScript 建置的個人化房產決策分析工具。

它協助使用者輸入、管理和比較多個待選房產物件，並根據**可自訂權重**（通勤、成本、空間、屋齡）為每個物件計算「綜合推薦分數」，幫助使用者在看房過程中做出更理性的決策。

## 🚀 核心功能 (Features)

* **智慧評分系統 (Smart Scoring)**：在「分析與設定」頁面，您可以透過拉桿自訂您對「月負擔」、「通勤時間」、「空間坪數」和「屋齡」的偏好權重。
* **即時分數排序**：物件列表會根據您的權重即時計算「綜合推薦分」，讓您一目了然哪個物件最符合您的需求。
* **多頁面儀表板 (Dashboard)**：
    * **儀表板**：使用雷達圖，視覺化比較 Top 5 物件的**各項偏好得分**。
    * **物件列表**：核心 CRUD 介面，支援卡片式預覽、搜尋、排序。
    * **地圖總覽**：在 Leaflet 地圖上顯示所有物件的地理位置（使用紅色圖釘標記）。
    * **分析與設定**：設定權重、目的地和 API 金鑰。
* **可變動的目的地 (V4.0)**：您現在可以自由新增/刪除多個通勤目的地。
* **Google Maps API 整合 (V3.0)**：
    * **通勤分析**：自動計算物件到您「第一個目的地」的**開車時間** (需 API Key)。
    * **自動定位**：在編輯表單時，可根據地址自動抓取經緯度 (需 API Key)。
* **進階財務估算**：除了房貸，還可輸入仲介費、裝潢款等「一次性成本」，計算出「真實購屋總成本」。
* **資料本地儲存**：所有資料都會儲存在您的瀏覽器 `localStorage` 中。
* **備份與還原 (V3.0)**：支援將所有資料匯出為 `JSON` 檔案備份，或從備份檔匯入。
* **視覺化輔助**：支援照片連結預覽、自訂標籤 (Tags) 功能。

## 🛠️ 技術棧 (Tech Stack)

* **前端框架**: React 18
* **建置工具**: Vite
* **程式語言**: TypeScript
* **圖表**: Recharts
* **地圖**: Leaflet & React-Leaflet
* **Markdown 渲染**: React-Markdown (V4.0)
* **部署**: GitHub Pages

## 📖 安裝與啟動 (本地開發)

1.  **Clone 專案**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
    cd YOUR_REPO_NAME
    ```

2.  **安裝依賴**
    ```bash
    npm install
    npm install react-markdown remark-gfm
    ```

3.  **啟動本地伺服器**
    ```bash
    npm run dev
    ```
    應用程式將會運行在 `http://localhost:5173`。

## 🔑 Google Maps API 金鑰設定 (重要)

本專案的「通勤分析」與「自動定位」功能依賴 Google Maps API。

1.  請至 [Google Cloud Console](https://console.cloud.google.com/) 申請 API 金鑰。
2.  請確保您的金鑰已啟用以下三個 API：
    * **Geocoding API** (用於地址轉經緯度)
    * **Distance Matrix API** (用於計算通勤時間)
    * **Maps JavaScript API** (如果您未來需要嵌入 Google Map)
3.  (建議) 為了安全，請在金鑰設定中限制 HTTP 來源，僅允許您的網域 (例如 `localhost:5173` 和您未來部署的 GitHub Pages 網址)。
4.  將您取得的 API 金鑰，複製並貼到應用程式的「分析與設定」頁面中的「Google Maps API 金鑰」欄位並儲存。

## 🚀 部署到 GitHub Pages

1.  **修改 `vite.config.ts`**
    
    打開 `vite.config.ts` 檔案，將 `base` 屬性修改為您的**儲存庫名稱** (Repository Name)。
    
    ```typescript
    // vite.config.ts
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'

    export default defineConfig({
      // 範例：如果您的 repo 網址是 [https://ryan.github.io/property-assistant/](https://ryan.github.io/property-assistant/)
      // 這裡就要填 '/property-assistant/'
      base: '/YOUR_REPO_NAME/', 
      plugins: [react()],
    })
    ```

2.  **安裝部署工具** (若尚未安裝)
    ```bash
    npm install gh-pages --save-dev
    ```

3.  **確認 `package.json`**
    
    確保您的 `package.json` 的 `scripts` 中包含 `predeploy` 和 `deploy`：
    
    ```json
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "predeploy": "npm run build",
      "deploy": "gh-pages -d dist"
    },
    ```

4.  **執行部署**
    
    此指令會自動打包 (build) 並將 `dist` 資料夾推送到 `gh-pages` 分支。
    
    ```bash
    npm run deploy
    ```

5.  **設定 GitHub 儲存庫**
    
    * 前往您的 GitHub 儲存庫頁面。
    * 點擊 **Settings** (設定)。
    * 在左側選擇 **Pages** (頁面)。
    * 在 "Build and deployment" 下的 **Source** (來源)，選擇 **Deploy from a branch**。
    * 在 "Branch" (分支) 下拉選單中，選擇 `gh-pages` 分支，資料夾選擇 `/(root)`，然後點擊 **Save**。

等待幾分鐘後，您的網站就會上線！