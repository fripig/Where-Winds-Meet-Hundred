# Team Role Categories Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 collapsible role-category sections (坦克/奶媽/無名/玉玉/綜合豪) within each team column, auto-grouping cards by job with manual override support.

**Architecture:** Pure UI grouping on top of existing flat card arrays. A new `ROLE_CATEGORIES` constant maps jobs to categories. Cards gain an optional `categoryOverride` field. Team columns render 5 collapsible sections; repo column stays flat.

**Tech Stack:** Alpine.js v3.15.8, vanilla JS, Vitest

---

### Task 1: Add ROLE_CATEGORIES constant and getCardCategory() helper

**Files:**
- Modify: `src/alpine-app.js:1-20` (add constant before teamApp function)
- Test: `tests/alpine-app.test.js`

**Step 1: Write the failing tests**

Add to `tests/alpine-app.test.js`:

```js
// ===== 角色分類 =====
describe('角色分類', () => {
    it('getCardCategory 依第一個非隊長職業歸類', () => {
        expect(app.getCardCategory({ jobs: ['陌刀'], days: [] })).toBe('tank');
        expect(app.getCardCategory({ jobs: ['補'], days: [] })).toBe('healer');
        expect(app.getCardCategory({ jobs: ['無名'], days: [] })).toBe('wuming');
        expect(app.getCardCategory({ jobs: ['玉玉'], days: [] })).toBe('yuyu');
        expect(app.getCardCategory({ jobs: ['酒酒'], days: [] })).toBe('general');
        expect(app.getCardCategory({ jobs: ['雙劍'], days: [] })).toBe('general');
        expect(app.getCardCategory({ jobs: ['雙刀'], days: [] })).toBe('general');
    });

    it('getCardCategory 隊長依其他職業歸類', () => {
        expect(app.getCardCategory({ jobs: ['隊長', '陌刀'], days: [] })).toBe('tank');
        expect(app.getCardCategory({ jobs: ['隊長', '補'], days: [] })).toBe('healer');
    });

    it('getCardCategory 只有隊長時歸綜合豪', () => {
        expect(app.getCardCategory({ jobs: ['隊長'], days: [] })).toBe('general');
    });

    it('getCardCategory 無職業時歸綜合豪', () => {
        expect(app.getCardCategory({ jobs: [], days: [] })).toBe('general');
    });

    it('getCardCategory categoryOverride 優先', () => {
        expect(app.getCardCategory({ jobs: ['陌刀'], days: [], categoryOverride: 'healer' })).toBe('healer');
    });

    it('getCardCategory 多職業取第一個非隊長職業', () => {
        expect(app.getCardCategory({ jobs: ['隊長', '補', '陌刀'], days: [] })).toBe('healer');
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: FAIL — `app.getCardCategory is not a function`

**Step 3: Write the implementation**

Add at top of `src/alpine-app.js` (before `function teamApp()`):

```js
const ROLE_CATEGORIES = [
    { id: 'tank',    name: '坦克',   jobs: ['陌刀'] },
    { id: 'healer',  name: '奶媽',   jobs: ['補'] },
    { id: 'wuming',  name: '無名',   jobs: ['無名'] },
    { id: 'yuyu',    name: '玉玉',   jobs: ['玉玉'] },
    { id: 'general', name: '綜合豪', jobs: ['酒酒', '雙劍', '雙刀'] },
];
```

Add inside the `teamApp()` return object (after `getJobClass`):

```js
getCardCategory(card) {
    if (card.categoryOverride) return card.categoryOverride;
    const job = card.jobs.find(j => j !== '隊長');
    if (!job) return 'general';
    const cat = ROLE_CATEGORIES.find(c => c.jobs.includes(job));
    return cat ? cat.id : 'general';
},
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/alpine-app.js tests/alpine-app.test.js
git commit -m "feat: add ROLE_CATEGORIES constant and getCardCategory helper"
```

---

### Task 2: Add getCategoryCards() method to group cards by category

**Files:**
- Modify: `src/alpine-app.js` (add method)
- Test: `tests/alpine-app.test.js`

**Step 1: Write the failing tests**

```js
describe('getCategoryCards', () => {
    it('按分類分群隊伍卡片', () => {
        app.cards.team1 = [
            { id: 'a', name: 'A', jobs: ['陌刀'], days: [] },
            { id: 'b', name: 'B', jobs: ['補'], days: [] },
            { id: 'c', name: 'C', jobs: ['酒酒'], days: [] },
            { id: 'd', name: 'D', jobs: ['陌刀'], days: [] },
        ];

        const grouped = app.getCategoryCards('team1');
        expect(grouped).toHaveLength(5);
        expect(grouped[0].id).toBe('tank');
        expect(grouped[0].cards.map(c => c.id)).toEqual(['a', 'd']);
        expect(grouped[1].id).toBe('healer');
        expect(grouped[1].cards.map(c => c.id)).toEqual(['b']);
        expect(grouped[4].id).toBe('general');
        expect(grouped[4].cards.map(c => c.id)).toEqual(['c']);
    });

    it('空欄位回傳5個空分類', () => {
        const grouped = app.getCategoryCards('team1');
        expect(grouped).toHaveLength(5);
        grouped.forEach(g => expect(g.cards).toEqual([]));
    });

    it('categoryOverride 覆寫分類', () => {
        app.cards.team1 = [
            { id: 'a', name: 'A', jobs: ['陌刀'], days: [], categoryOverride: 'healer' },
        ];

        const grouped = app.getCategoryCards('team1');
        expect(grouped[0].cards).toEqual([]); // tank empty
        expect(grouped[1].cards.map(c => c.id)).toEqual(['a']); // in healer
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: FAIL — `app.getCategoryCards is not a function`

**Step 3: Write the implementation**

Add to `src/alpine-app.js` return object (after `getCardCategory`):

```js
getCategoryCards(columnId) {
    const cards = this.getColumnCards(columnId);
    return ROLE_CATEGORIES.map(cat => ({
        id: cat.id,
        name: cat.name,
        cards: cards.filter(card => this.getCardCategory(card) === cat.id),
    }));
},
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/alpine-app.js tests/alpine-app.test.js
git commit -m "feat: add getCategoryCards method for grouping cards by role category"
```

---

### Task 3: Add collapsedCategories state and toggle logic

**Files:**
- Modify: `src/alpine-app.js` (add state + method)
- Test: `tests/alpine-app.test.js`

**Step 1: Write the failing tests**

```js
describe('分類摺疊', () => {
    it('toggleCategory 切換摺疊狀態', () => {
        app.toggleCategory('team1', 'tank');
        expect(app.isCategoryCollapsed('team1', 'tank')).toBe(true);
        app.toggleCategory('team1', 'tank');
        expect(app.isCategoryCollapsed('team1', 'tank')).toBe(false);
    });

    it('isCategoryCollapsed 預設為展開', () => {
        expect(app.isCategoryCollapsed('team1', 'tank')).toBe(false);
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: FAIL

**Step 3: Write the implementation**

Add to state properties (after `touchDragClone: null`):

```js
collapsedCategories: {},
```

Add methods:

```js
toggleCategory(columnId, categoryId) {
    const key = columnId + ':' + categoryId;
    this.collapsedCategories[key] = !this.collapsedCategories[key];
},

isCategoryCollapsed(columnId, categoryId) {
    return !!this.collapsedCategories[columnId + ':' + categoryId];
},
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/alpine-app.js tests/alpine-app.test.js
git commit -m "feat: add collapsible category state and toggle methods"
```

---

### Task 4: Update team column HTML to render category sections

**Files:**
- Modify: `index.html:536-584` (team column template)

**Step 1: Add CSS for category sections**

Add to `<style>` in `index.html` (before the RWD section `/* ===== RWD: 手機版面 ===== */`):

```css
/* 分類區塊 */
.category-section {
    margin-bottom: 6px;
}

.category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
    font-weight: bold;
    color: #555;
    -webkit-user-select: none;
    user-select: none;
    margin-bottom: 4px;
}

.category-header:hover {
    background: rgba(0, 0, 0, 0.12);
}

.category-header .cat-toggle {
    font-size: 0.7em;
    margin-right: 4px;
    display: inline-block;
    transition: transform 0.2s;
}

.category-header .cat-toggle.collapsed {
    transform: rotate(-90deg);
}

.category-header .cat-count {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    padding: 0 6px;
    font-size: 0.85em;
    color: #666;
}

.category-cards {
    min-height: 2px;
}
```

**Step 2: Replace team column card rendering**

Replace the team column template section (lines 558-582 in `index.html`):

From:
```html
                    <template x-for="card in getColumnCards(config.id)" :key="card.id">
                        <div class="card"
                             draggable="true"
                             :data-card-id="card.id"
                             @dragstart="dragStart($event, card.id)"
                             @dragover.prevent
                             @touchstart="touchStart($event, card.id)"
                             @touchmove="touchMove($event)"
                             @touchend="touchEnd($event)">
                            <div class="card-btns">
                                <button class="icon-btn" @click="toggleMoveMenu(card.id)">⤴</button>
                                <button class="icon-btn" @click="startEdit(card.id)">✏️</button>
                                <button class="icon-btn" @click="moveCardTo(card.id, 'repo')" title="移出隊伍">↩</button>
                            </div>
                            <div class="move-menu" x-show="moveMenuCardId === card.id" @click.outside="moveMenuCardId = null">
                                <template x-for="col in getMoveTargets(card.id)" :key="col.id">
                                    <button @click="moveCardTo(card.id, col.id)" x-text="col.name"></button>
                                </template>
                            </div>
                            <strong x-text="card.name"></strong><br>
                            <template x-for="job in card.jobs" :key="job">
                                <span class="job-tag" :class="getJobClass(job)" x-text="job"></span>
                            </template>
                        </div>
                    </template>
```

To:
```html
                    <template x-for="cat in getCategoryCards(config.id)" :key="cat.id">
                        <div class="category-section"
                             :data-category="cat.id"
                             @drop.stop="dropToCategory($event, config.id, cat.id)"
                             @dragover.prevent.stop="dragOverCategory($event)">
                            <div class="category-header" @click="toggleCategory(config.id, cat.id)">
                                <span>
                                    <span class="cat-toggle" :class="{ 'collapsed': isCategoryCollapsed(config.id, cat.id) }">▼</span>
                                    <span x-text="cat.name"></span>
                                </span>
                                <span class="cat-count" x-text="cat.cards.length"></span>
                            </div>
                            <div class="category-cards"
                                 x-show="!isCategoryCollapsed(config.id, cat.id)"
                                 :data-column="config.id"
                                 :data-category-drop="cat.id">
                                <template x-for="card in cat.cards" :key="card.id">
                                    <div class="card"
                                         draggable="true"
                                         :data-card-id="card.id"
                                         @dragstart="dragStart($event, card.id)"
                                         @dragover.prevent.stop
                                         @touchstart="touchStart($event, card.id)"
                                         @touchmove="touchMove($event)"
                                         @touchend="touchEnd($event)">
                                        <div class="card-btns">
                                            <button class="icon-btn" @click="toggleMoveMenu(card.id)">⤴</button>
                                            <button class="icon-btn" @click="startEdit(card.id)">✏️</button>
                                            <button class="icon-btn" @click="moveCardTo(card.id, 'repo')" title="移出隊伍">↩</button>
                                        </div>
                                        <div class="move-menu" x-show="moveMenuCardId === card.id" @click.outside="moveMenuCardId = null">
                                            <template x-for="col in getMoveTargets(card.id)" :key="col.id">
                                                <button @click="moveCardTo(card.id, col.id)" x-text="col.name"></button>
                                            </template>
                                        </div>
                                        <strong x-text="card.name"></strong><br>
                                        <template x-for="job in card.jobs" :key="job">
                                            <span class="job-tag" :class="getJobClass(job)" x-text="job"></span>
                                        </template>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </template>
```

**Step 3: Remove `data-column` and drop handlers from the column div**

Change the column div (currently has `@drop` and `@dragover`):

From:
```html
                <div class="column"
                     x-show="config.visible"
                     @drop="drop($event, config.id)"
                     @dragover="dragOver($event)"
                     :data-column="config.id">
```

To:
```html
                <div class="column"
                     x-show="config.visible"
                     @drop="drop($event, config.id)"
                     @dragover.prevent
                     :data-column="config.id">
```

**Step 4: Verify visually**

Run: `open index.html` in browser, confirm 5 category sections appear in each team column with collapse/expand working.

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: render category sections in team columns with collapse/expand"
```

---

### Task 5: Update drag-and-drop to support category-aware drops

**Files:**
- Modify: `src/alpine-app.js` (add `dropToCategory`, `dragOverCategory` methods; update `moveCardTo` for categoryOverride)
- Test: `tests/alpine-app.test.js`

**Step 1: Write the failing tests**

```js
describe('分類拖曳', () => {
    it('dropToCategory 拖入不同分類時設定 categoryOverride', () => {
        app.cards.repo = [
            { id: 'a', name: 'A', jobs: ['陌刀'], days: [] },
        ];

        const event = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            clientY: 9999,
            dataTransfer: { getData: () => 'a' },
            currentTarget: {
                querySelector: () => ({
                    querySelectorAll: () => [],
                }),
            },
        };

        app.dropToCategory(event, 'team1', 'healer');

        expect(app.cards.team1[0].categoryOverride).toBe('healer');
    });

    it('dropToCategory 拖入自動對應分類時不設定 categoryOverride', () => {
        app.cards.repo = [
            { id: 'a', name: 'A', jobs: ['陌刀'], days: [] },
        ];

        const event = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            clientY: 9999,
            dataTransfer: { getData: () => 'a' },
            currentTarget: {
                querySelector: () => ({
                    querySelectorAll: () => [],
                }),
            },
        };

        app.dropToCategory(event, 'team1', 'tank');

        expect(app.cards.team1[0].categoryOverride).toBeUndefined();
    });

    it('moveCardTo 移到 repo 時清除 categoryOverride', () => {
        app.cards.team1 = [
            { id: 'a', name: 'A', jobs: ['陌刀'], days: [], categoryOverride: 'healer' },
        ];

        app.moveCardTo('a', 'repo');

        expect(app.cards.repo[0].categoryOverride).toBeUndefined();
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: FAIL

**Step 3: Write the implementation**

Add to `src/alpine-app.js` return object:

```js
dragOverCategory(event) {
    event.preventDefault();
    const categoryCards = event.currentTarget.querySelector('.category-cards');
    if (categoryCards) {
        this.showDropIndicator(categoryCards, event.clientY);
    }
},

dropToCategory(event, columnId, categoryId) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData('cardId');
    if (!cardId) return;

    // Find and remove card from source
    let card = null;
    for (const colId in this.cards) {
        const idx = this.cards[colId].findIndex(c => c.id === cardId);
        if (idx !== -1) {
            card = this.cards[colId].splice(idx, 1)[0];
            break;
        }
    }

    if (card) {
        // Determine if override is needed
        const autoCategory = this.getCardCategory({ ...card, categoryOverride: undefined });
        if (categoryId !== autoCategory) {
            card.categoryOverride = categoryId;
        } else {
            delete card.categoryOverride;
        }

        if (!this.cards[columnId]) this.cards[columnId] = [];

        // Find insert position within the category's cards
        const categoryCardsEl = event.currentTarget.querySelector('.category-cards');
        const insertIndex = categoryCardsEl
            ? this.getInsertIndex(categoryCardsEl, event.clientY)
            : 0;

        // Calculate absolute position: count cards in earlier categories + insertIndex
        const allCards = this.cards[columnId];
        let absIndex = 0;
        for (const cat of ROLE_CATEGORIES) {
            if (cat.id === categoryId) {
                absIndex += insertIndex;
                break;
            }
            absIndex += allCards.filter(c => this.getCardCategory(c) === cat.id).length;
        }
        absIndex = Math.min(absIndex, allCards.length);

        allCards.splice(absIndex, 0, card);
        this.saveState();
        this.animateCardDrop(cardId);
    }
    this.clearDropIndicator();
},
```

Update existing `moveCardTo` method — add cleanup of categoryOverride when moving to repo. After the line `this.cards[targetColumnId].push(card);` (line ~367), add:

```js
if (targetColumnId === 'repo') {
    delete card.categoryOverride;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/alpine-app.js tests/alpine-app.test.js
git commit -m "feat: category-aware drag-and-drop with override support"
```

---

### Task 6: Update touch drag to detect category drop targets

**Files:**
- Modify: `src/alpine-app.js` (update `touchEnd` and `getDropTarget`)

**Step 1: Update getDropTarget to also detect category**

Modify `getDropTarget` to return both column and category info:

```js
getDropTarget(x, y) {
    if (this.touchDragClone) this.touchDragClone.style.display = 'none';
    let el = document.elementFromPoint(x, y);
    if (this.touchDragClone) this.touchDragClone.style.display = '';

    // Find category-drop zone first
    let categoryEl = el;
    while (categoryEl && !categoryEl.hasAttribute('data-category')) {
        categoryEl = categoryEl.parentElement;
    }

    // Then find column
    let columnEl = el;
    while (columnEl && !columnEl.hasAttribute('data-column')) {
        columnEl = columnEl.parentElement;
    }

    return { columnEl, categoryEl };
},
```

**Step 2: Update touchEnd to use category-aware drop**

Replace the `touchEnd` method's drop logic. The key section to change is where it calls `getDropTarget` and processes the result. Update to handle both `columnEl` and `categoryEl`:

In `touchEnd`, replace:
```js
const target = this.getDropTarget(touch.clientX, touch.clientY);

if (target) {
    const targetColumnId = target.getAttribute('data-column');
```

With:
```js
const { columnEl, categoryEl } = this.getDropTarget(touch.clientX, touch.clientY);
const target = columnEl;

if (target) {
    const targetColumnId = target.getAttribute('data-column');
```

And after `this.cards[targetColumnId].splice(adjustedIndex, 0, card);` add the categoryOverride logic:

```js
// Handle category override for team columns
if (categoryEl && targetColumnId !== 'repo') {
    const categoryId = categoryEl.getAttribute('data-category');
    const autoCategory = this.getCardCategory({ ...card, categoryOverride: undefined });
    if (categoryId && categoryId !== autoCategory) {
        card.categoryOverride = categoryId;
    } else {
        delete card.categoryOverride;
    }
} else if (targetColumnId === 'repo') {
    delete card.categoryOverride;
}
```

**Step 3: Update touchMove to show drop indicator in category section**

In `touchMove`, replace the block:
```js
const target = this.getDropTarget(touch.clientX, touch.clientY);
if (target) {
    if (target !== this.touchDragState.originalCard.closest('[data-column]')) {
        target.classList.add('drop-hover');
    }
    this.showDropIndicator(target, touch.clientY);
```

With:
```js
const { columnEl, categoryEl } = this.getDropTarget(touch.clientX, touch.clientY);
const target = columnEl;
if (target) {
    if (target !== this.touchDragState.originalCard.closest('[data-column]')) {
        target.classList.add('drop-hover');
    }
    // Show indicator in category section if available
    const catCards = categoryEl ? categoryEl.querySelector('.category-cards') : null;
    this.showDropIndicator(catCards || target, touch.clientY);
```

**Step 4: Verify manually on mobile/touch simulator**

Open in browser with touch simulation, verify:
- Touch-drag from repo into a category section works
- Touch-drag between categories within a team works
- categoryOverride is set/cleared correctly

**Step 5: Commit**

```bash
git add src/alpine-app.js
git commit -m "feat: update touch drag to support category-aware drops"
```

---

### Task 7: Build and verify

**Files:**
- Run: `build.js`

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 2: Build**

Run: `node build.js`
Expected: `dist/index.html` generated without errors

**Step 3: Verify built output**

Open `dist/index.html` in browser. Verify:
- 5 category sections appear in each team column
- Collapse/expand works
- Drag from repo auto-classifies cards
- Drag between categories sets override
- Move to repo clears override
- Touch drag works on mobile

**Step 4: Commit build output**

```bash
git add dist/index.html
git commit -m "build: update dist with role category feature"
```