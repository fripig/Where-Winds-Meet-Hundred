
# Team Role Categories Design

## Overview
Add 5 role categories (坦克/奶媽/無名/玉玉/綜合豪) within team columns. Cards automatically group by category based on their job tags. Categories render as collapsible sections within each team column.

## Job-to-Category Mapping

| Category ID | Display Name | Jobs |
|-------------|-------------|------|
| tank | 坦克 | 陌刀 |
| healer | 奶媽 | 補 |
| wuming | 無名 | 無名 |
| yuyu | 玉玉 | 玉玉 |
| general | 綜合豪 | 酒酒, 雙劍, 雙刀 |

**Classification logic:** `categoryOverride` > first non-隊長 job mapped to category > default to 綜合豪.

## Data Model Changes

- **No schema migration needed** — localStorage v2 structure unchanged
- Cards gain an optional `categoryOverride` field (string, one of the category IDs)
- `ROLE_CATEGORIES` constant defines the 5 categories and their job mappings

## UI Design

### Team Column Layout
Each team column renders 5 collapsible sections in fixed order (坦克 → 奶媽 → 無名 → 玉玉 → 綜合豪):

```
┌─ 🚩 第一隊 ──────────┐
│ ▼ 坦克 (2)            │
│   [陌刀角色A]          │
│   [陌刀角色B]          │
│ ▼ 奶媽 (1)            │
│   [補角色C]            │
│ ▶ 無名 (0)  ← collapsed│
│ ▼ 玉玉 (1)            │
│   [玉玉角色D]          │
│ ▼ 綜合豪 (3)          │
│   [酒酒角色E]          │
│   [雙劍角色F]          │
│   [雙刀角色G]          │
└───────────────────────┘
```

- Section header: category name + count, clickable to collapse/expand
- Empty sections: collapsed by default, still visible as drop targets
- Repo column: unchanged, remains a flat card list (no categories)

## Drag-and-Drop Behavior

| Action | Behavior |
|--------|----------|
| Repo → Team (any position) | Auto-classify by job, no categoryOverride set |
| Team → Different category group | Sets `categoryOverride` on the card |
| Within same category group | Reorder only, no category change |
| Team → Repo | Clears `categoryOverride` |

## Non-Goals
- No changes to the repo column layout
- No changes to the job/tag system itself
- No localStorage migration needed
