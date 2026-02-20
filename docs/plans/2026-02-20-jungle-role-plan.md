# 打野隊 (Jungle Role) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "打野" job tag and a read-only virtual "打野隊" column that auto-populates from all cards with the 打野 tag, without affecting normal team assignment.

**Architecture:** 打野 is added as a regular job in `availableJobs`. A computed getter `jungleCards` scans all columns to find cards with `jobs.includes('打野')`. The UI renders a read-only column alongside normal teams. No data model or localStorage changes needed.

**Tech Stack:** Alpine.js, Vitest

---

### Task 1: Add 打野 job to data layer and color mapping

**Files:**
- Modify: `src/alpine-app.js:27` (availableJobs)
- Modify: `src/alpine-app.js:139-144` (getJobClass)
- Test: `tests/alpine-app.test.js`

**Step 1: Write the failing tests**

Add to the `職業配色` describe block in `tests/alpine-app.test.js`:

```js
it('getJobClass 打野→job-purple', () => {
    expect(app.getJobClass('打野')).toBe('job-purple');
});
```

Add a new test to confirm 打野 is in availableJobs:

```js
it('availableJobs 包含打野', () => {
    expect(app.availableJobs).toContain('打野');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: 2 FAILs — 打野 not in availableJobs, getJobClass returns 'job-blue' not 'job-purple'

**Step 3: Implement**

In `src/alpine-app.js`:

1. Add `'打野'` to `availableJobs` array (line 27):
```js
availableJobs: ['隊長', '陌刀', '補', '玉玉', '無名', '酒酒', '雙劍', '雙刀', '打野'],
```

2. Update `getJobClass` (line 139-144) — add before the final `return 'job-blue'`:
```js
getJobClass(job) {
    if (job === '隊長') return 'job-red';
    if (job === '陌刀') return 'job-yellow';
    if (job === '補') return 'job-green';
    if (job === '打野') return 'job-purple';
    return 'job-blue';
},
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/alpine-app.js tests/alpine-app.test.js
git commit -m "feat: add 打野 job tag with purple color"
```

---

### Task 2: Add jungleCards computed getter

**Files:**
- Modify: `src/alpine-app.js` (add `jungleCards` getter after `visibleTeams`)
- Test: `tests/alpine-app.test.js`

**Step 1: Write the failing tests**

Add a new describe block in `tests/alpine-app.test.js`:

```js
// ===== 打野隊 =====
describe('打野隊', () => {
    it('jungleCards 回傳所有有打野 tag 的卡片', () => {
        app.cards.repo.push({ id: 'a', name: 'A', jobs: ['陌刀', '打野'], days: [] });
        app.cards.team1.push({ id: 'b', name: 'B', jobs: ['補'], days: [] });
        app.cards.team2.push({ id: 'c', name: 'C', jobs: ['打野'], days: [] });

        expect(app.jungleCards.map(c => c.id)).toEqual(['a', 'c']);
    });

    it('jungleCards 無打野角色時回傳空陣列', () => {
        app.cards.repo.push({ id: 'a', name: 'A', jobs: ['陌刀'], days: [] });
        expect(app.jungleCards).toEqual([]);
    });

    it('jungleCards 順序為 repo → team1 → team2 → team3 → teamMobile', () => {
        app.cards.team2.push({ id: 'c', name: 'C', jobs: ['打野'], days: [] });
        app.cards.repo.push({ id: 'a', name: 'A', jobs: ['打野'], days: [] });
        app.cards.team1.push({ id: 'b', name: 'B', jobs: ['打野'], days: [] });

        expect(app.jungleCards.map(c => c.id)).toEqual(['a', 'b', 'c']);
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: FAIL — `app.jungleCards` is undefined

**Step 3: Implement**

Add after the `visibleTeams` getter in `src/alpine-app.js`:

```js
get jungleCards() {
    const columnOrder = ['repo', ...this.teamConfigs.map(t => t.id)];
    const result = [];
    for (const colId of columnOrder) {
        const cards = this.cards[colId] || [];
        for (const card of cards) {
            if (card.jobs.includes('打野')) {
                result.push(card);
            }
        }
    }
    return result;
},
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/alpine-app.js tests/alpine-app.test.js
git commit -m "feat: add jungleCards computed getter"
```

---

### Task 3: Add 打野隊 column to UI and purple job style

**Files:**
- Modify: `index.html` (add CSS for `.job-purple`, add 打野隊 column in board)

**Step 1: Add `.job-purple` CSS**

Add after the `.job-blue` block (around line 290):

```css
.job-purple {
    background: #f3e5f5;
    color: #6a1b9a;
    border-color: #ce93d8;
}
```

**Step 2: Add 打野隊 column in the board**

After the closing `</template>` of the team columns loop (line 649), before the closing `</div>` of `.board`, add:

```html
<!-- 打野隊 (virtual read-only column) -->
<div class="column" x-show="jungleCards.length > 0">
    <div class="column-header">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
            <span class="column-title" style="font-weight:bold; font-size:0.95em;">🌿 打野隊</span>
            <div class="header-actions">
                <span class="count-badge" x-text="jungleCards.length">0</span>
            </div>
        </div>
    </div>
    <template x-for="card in jungleCards" :key="'jungle-' + card.id">
        <div class="card" style="cursor: default;">
            <strong x-text="card.name"></strong><br>
            <template x-for="job in card.jobs" :key="job">
                <span class="job-tag" :class="getJobClass(job)" x-text="job"></span>
            </template>
        </div>
    </template>
</div>
```

**Step 3: Update board grid to include 打野隊 column**

Change the board `:style` binding (line 581) to account for the extra column when jungle cards exist:

```html
<div class="board" :style="'grid-template-columns: repeat(' + (visibleTeams.length + (jungleCards.length > 0 ? 1 : 0)) + ', 1fr)'">
```

**Step 4: Manual verification**

Run: `node build.js && open dist/index.html` (or open `index.html` directly)
- Create a character with 打野 tag → 打野隊 column appears with that character
- Remove 打野 tag → character disappears from 打野隊
- Character with 打野 tag + other job can still be dragged into normal teams
- 打野隊 column is not draggable/droppable

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add 打野隊 virtual column UI with purple job tag"
```

---

### Task 4: Ensure 打野 tag doesn't affect category classification

**Files:**
- Test: `tests/alpine-app.test.js`

**Step 1: Write the test**

Add to the `角色分類` describe block:

```js
it('getCardCategory 打野 tag 不影響分類（取其他職業）', () => {
    expect(app.getCardCategory({ jobs: ['陌刀', '打野'], days: [] })).toBe('tank');
    expect(app.getCardCategory({ jobs: ['打野', '補'], days: [] })).toBe('healer');
});

it('getCardCategory 只有打野時歸綜合豪', () => {
    expect(app.getCardCategory({ jobs: ['打野'], days: [] })).toBe('general');
});
```

**Step 2: Run tests**

Run: `npx vitest run tests/alpine-app.test.js`
Expected: PASS (打野 is not in any ROLE_CATEGORIES, so it falls through to 'general' naturally. When combined with other jobs like 陌刀, `getCardCategory` skips 隊長 but finds 陌刀 first → 'tank'. This should already work correctly without code changes.)

**Step 3: Commit**

```bash
git add tests/alpine-app.test.js
git commit -m "test: verify 打野 tag doesn't affect category classification"
```

---

### Task 5: Build and verify

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Build**

Run: `node build.js`
Expected: `dist/index.html` generated successfully

**Step 3: Commit if any fixes needed**
