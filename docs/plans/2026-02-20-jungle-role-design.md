# 打野隊功能設計

## 概述

新增「打野」職業 tag 和一個唯讀的「打野隊」虛擬欄位。勾了打野 tag 的成員自動出現在打野隊，但不影響他們在正常隊伍的編制。

## 方案：Computed View（虛擬隊伍）

打野隊不是真正的 data column，而是從現有資料即時計算出來的 view。

## 資料層

- `availableJobs` 加入 `'打野'`
- 新增 computed getter `jungleCards`：掃描所有 column（含 repo）找 `jobs.includes('打野')` 的卡片
- `getJobClass('打野')` 回傳新色系（如紫色）做視覺區隔
- 不修改 localStorage 結構，不需要 migration

## UI 層

- 打野隊欄位在最右邊，跟其他隊伍並排顯示
- 欄位標題：`🌿 打野隊`
- 卡片樣式與正常卡片一致
- 唯讀：不可拖曳、不顯示移動按鈕、不接受 drop
- 不渲染 category sections
- `visibleTeams` 計算要包含打野隊（但打野隊不進 teamConfigs，獨立處理）

## 互動規則

- 打野隊不接受 drag/drop
- 打野隊的卡片不能被拖走
- 在角色編輯表單中勾選/取消「打野」即可加入/移出打野隊
- 打野隊排序由各隊的順序決定（先 repo，再 team1、team2...）
