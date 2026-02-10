# 百業戰分組排班系統 - Alpine.js 版本

## 功能特點

### ✅ 已實現的功能
- 角色管理（新增/編輯/刪除）
- 拖放操作（桌面和觸控）
- 隊伍配置
- CSV 匯入
- 截圖匯出
- LocalStorage 數據持久化
- 即時計數器
- 職業統計

### 📁 檔案說明
- `020804.html` - 主應用程式（使用 Alpine.js）
- `alpine.min.js` - Alpine.js v3.13.5 本地副本
- `package.json` - npm 配置檔

### 🚀 使用方法

#### 開啟應用程式
直接在瀏覽器中打開 `020804.html` 檔案即可。

#### 基本操作

1. **新增角色**
   - 輸入角色名稱
   - 選擇職業（可多選）
   - 選擇場次（可選）
   - 點擊「儲存」按鈕

2. **編輯角色**
   - 點擊角色卡片上的 ✏️ 按鈕
   - 修改資訊
   - 點擊「儲存」

3. **刪除角色**
   - 點擊角色卡片上的 ✕ 按鈕
   - 確認刪除

4. **拖放分配**
   - **桌面**：拖動角色卡片到目標隊伍
   - **觸控**：長按並拖動角色卡片

5. **CSV 匯入**
   - 點擊「📥 匯入」按鈕
   - 貼上 CSV 格式資料（username,message）
   - 點擊「確認匯入」

6. **匯出截圖**
   - 點擊「📷 存圖」按鈕
   - iOS：使用分享功能
   - 其他：自動下載圖片

7. **隊伍顯示設定**
   - 點擊「⚙️ 設定」按鈕
   - 勾選要顯示的隊伍

### 🔧 技術架構

#### Alpine.js 實現
應用程式使用 Alpine.js 進行狀態管理和 UI 更新：

- **響應式數據**：`x-data="teamApp()"`
- **雙向綁定**：`x-model="charName"`
- **條件顯示**：`x-show="editingId"`
- **動態文本**：`x-text="getColumnCount('repo')"`
- **事件處理**：`@click="handleNewOrUpdateCharacter()"`
- **列表渲染**：`<template x-for="card in getColumnCards('repo')">`

#### 數據結構
```javascript
{
  storageKey: 'teamData_v2',
  teamConfigs: [
    { id: 'team1', name: '🚩 第一隊', visible: true },
    // ...
  ],
  cards: {
    repo: [],
    team1: [],
    team2: [],
    // ...
  },
  charName: '',
  selectedJobs: [],
  selectedDays: [],
  editingId: null
}
```

### 📱 瀏覽器支援
- Chrome/Edge（最新版）
- Firefox（最新版）
- Safari（最新版）
- 移動瀏覽器（iOS Safari、Chrome Mobile）

### 💾 數據持久化
- 使用 localStorage 自動儲存
- 刷新頁面後數據保留
- 儲存鍵：`teamData_v2`

### 🎨 職業顏色
- 🔴 隊長（紅色）
- 🟡 陌刀（黃色）
- 🟢 補（綠色）
- 🔵 其他職業（藍色）

### 🔄 從 vanilla JS 遷移

#### 主要改進
1. **代碼簡化**：從 933 行減少到 908 行（-2.7%）
2. **聲明式 UI**：使用 Alpine.js 指令替代手動 DOM 操作
3. **自動響應**：數據變更時 UI 自動更新
4. **更好的維護性**：邏輯和模板共存

#### 轉換對照
| Vanilla JS | Alpine.js |
|------------|-----------|
| `onclick="func()"` | `@click="method()"` |
| `getElementById()` | `x-model`, `x-text` |
| `innerHTML = ''` | `x-for` 模板 |
| `style.display` | `x-show` |
| 全局變量 | `x-data` 物件 |

### 📝 開發說明

#### 安裝 Alpine.js
```bash
npm install alpinejs
cp node_modules/alpinejs/dist/cdn.min.js alpine.min.js
```

#### 更新 Alpine.js
```bash
npm update alpinejs
cp node_modules/alpinejs/dist/cdn.min.js alpine.min.js
```

### 🐛 問題排除

1. **Alpine.js 未載入**
   - 確認 `alpine.min.js` 存在
   - 檢查瀏覽器控制台錯誤

2. **數據未儲存**
   - 檢查瀏覽器 localStorage 設定
   - 確認沒有使用隱私模式

3. **拖放不工作**
   - 確認使用支援的瀏覽器
   - 檢查觸控事件是否被其他元素攔截

### 📄 授權
此專案遵循原始專案的授權條款。

### 🙏 致謝
- Alpine.js - 輕量級 JavaScript 框架
- html2canvas - 截圖功能
