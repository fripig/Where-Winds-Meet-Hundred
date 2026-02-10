/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup minimal HTML structure before requiring the module
function setupDOM() {
    document.body.innerHTML = `
        <div class="container">
            <div class="input-section">
                <span id="saveStatus" class="save-hint" style="display:none;"></span>
                <input type="hidden" id="editingId" value="">
                <input type="text" id="charName" value="">
                <div class="checkbox-group" id="jobGroup">
                    <label><input type="checkbox" value="隊長"><span>⭐隊長</span></label>
                    <label><input type="checkbox" value="陌刀"><span>陌刀</span></label>
                    <label><input type="checkbox" value="補"><span>補</span></label>
                    <label><input type="checkbox" value="玉玉"><span>玉玉</span></label>
                    <label><input type="checkbox" value="無名"><span>無名</span></label>
                    <label><input type="checkbox" value="酒酒"><span>酒酒</span></label>
                    <label><input type="checkbox" value="雙劍"><span>雙劍</span></label>
                </div>
                <div class="checkbox-group" id="dayGroup">
                    <label><input type="checkbox" value="六"><span>六</span></label>
                    <label><input type="checkbox" value="日"><span>日</span></label>
                </div>
                <button id="addChar">儲存</button>
                <button id="cancelEdit" style="display:none;">X</button>
                <div id="importSection" style="display: none;">
                    <textarea id="csvInput"></textarea>
                </div>
                <div id="settingsSection" style="display: none;">
                    <div class="checkbox-group" id="teamVisibilityGroup"></div>
                </div>
            </div>
            <div class="repository-row">
                <span class="count-badge" id="count-repo">0</span>
                <div id="repo" class="repo-scroll-container"></div>
            </div>
            <div class="board" id="mainBoard"></div>
        </div>
    `;
}

let app;

beforeEach(async () => {
    setupDOM();
    localStorage.clear();
    vi.resetModules();
    app = await import('../src/app.js');
    // Reset teamConfigs to default
    app.setTeamConfigs([
        { id: 'team1', name: '🚩 第一隊', visible: true },
        { id: 'team2', name: '🚩 第二隊', visible: true },
        { id: 'team3', name: '🚩 第三隊', visible: true },
        { id: 'teamMobile', name: '⚡ 機動隊', visible: true }
    ]);
});

// ===== localStorage 操作 =====
describe('localStorage 操作', () => {
    it('safeGetStorage 能正確讀取和解析 JSON', () => {
        localStorage.setItem('testKey', JSON.stringify({ foo: 'bar' }));
        const result = app.safeGetStorage('testKey');
        expect(result).toEqual({ foo: 'bar' });
    });

    it('safeGetStorage 在 localStorage 失敗時回傳 null', () => {
        const original = localStorage.getItem;
        localStorage.getItem = () => { throw new Error('fail'); };
        const result = app.safeGetStorage('anyKey');
        expect(result).toBeNull();
        localStorage.getItem = original;
    });

    it('safeGetStorage 無資料時回傳 null', () => {
        const result = app.safeGetStorage('nonexistent');
        expect(result).toBeNull();
    });

    it('safeSetStorage 能正確寫入 JSON', () => {
        app.safeSetStorage('testKey', { hello: 'world' });
        const stored = JSON.parse(localStorage.getItem('testKey'));
        expect(stored).toEqual({ hello: 'world' });
    });
});

// ===== 角色管理 =====
describe('角色管理', () => {
    beforeEach(() => {
        app.renderBoard();
    });

    it('createCard 能正確建立含名稱、職業、場次的卡片', () => {
        app.createCard('測試角色', ['陌刀'], ['六'], 'repo', 'test-card-1');
        const card = document.getElementById('test-card-1');
        expect(card).not.toBeNull();
        expect(card.dataset.name).toBe('測試角色');
        expect(JSON.parse(card.dataset.jobs)).toEqual(['陌刀']);
        expect(JSON.parse(card.dataset.days)).toEqual(['六']);
    });

    it('createCard 卡片職業標籤有正確配色', () => {
        app.createCard('隊長角色', ['隊長'], [], 'repo', 'card-leader');
        app.createCard('陌刀角色', ['陌刀'], [], 'repo', 'card-modao');
        app.createCard('補師角色', ['補'], [], 'repo', 'card-healer');
        app.createCard('其他角色', ['玉玉'], [], 'repo', 'card-other');

        expect(document.querySelector('#card-leader .job-red')).not.toBeNull();
        expect(document.querySelector('#card-modao .job-yellow')).not.toBeNull();
        expect(document.querySelector('#card-healer .job-green')).not.toBeNull();
        expect(document.querySelector('#card-other .job-blue')).not.toBeNull();
    });

    it('handleNewOrUpdateCharacter 新增角色到角色庫', () => {
        document.getElementById('charName').value = '新角色';
        document.querySelector('#jobGroup input[value="陌刀"]').checked = true;

        app.handleNewOrUpdateCharacter();

        const cards = document.querySelectorAll('#repo .card');
        expect(cards.length).toBe(1);
        expect(cards[0].dataset.name).toBe('新角色');
    });

    it('handleNewOrUpdateCharacter 更新既有角色', () => {
        app.createCard('舊名稱', ['補'], ['六'], 'repo', 'edit-target');

        document.getElementById('editingId').value = 'edit-target';
        document.getElementById('charName').value = '新名稱';
        document.querySelector('#jobGroup input[value="陌刀"]').checked = true;

        app.handleNewOrUpdateCharacter();

        const card = document.getElementById('edit-target');
        expect(card).not.toBeNull();
        expect(card.dataset.name).toBe('新名稱');
        expect(JSON.parse(card.dataset.jobs)).toEqual(['陌刀']);
    });

    it('handleNewOrUpdateCharacter 名稱或職業為空時不執行', () => {
        document.getElementById('charName').value = '';
        document.querySelector('#jobGroup input[value="陌刀"]').checked = true;
        app.handleNewOrUpdateCharacter();
        expect(document.querySelectorAll('#repo .card').length).toBe(0);

        document.getElementById('charName').value = '有名字';
        document.querySelector('#jobGroup input[value="陌刀"]').checked = false;
        app.handleNewOrUpdateCharacter();
        expect(document.querySelectorAll('#repo .card').length).toBe(0);
    });

    it('deleteCard 能刪除角色並更新計數', () => {
        app.createCard('待刪除', ['補'], [], 'repo', 'del-target');
        expect(document.getElementById('del-target')).not.toBeNull();

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        app.deleteCard('del-target');

        expect(document.getElementById('del-target')).toBeNull();
        expect(document.getElementById('count-repo').textContent).toBe('0');
    });
});

// ===== 看板渲染 =====
describe('看板渲染', () => {
    it('renderBoard 根據 teamConfigs 渲染正確數量的隊伍欄位', () => {
        app.renderBoard();
        const columns = document.querySelectorAll('#mainBoard .column');
        expect(columns.length).toBe(4);
    });

    it('renderBoard 隱藏 visible=false 的隊伍', () => {
        app.setTeamConfigs([
            { id: 'team1', name: '第一隊', visible: true },
            { id: 'team2', name: '第二隊', visible: false },
            { id: 'team3', name: '第三隊', visible: true },
            { id: 'teamMobile', name: '機動隊', visible: true }
        ]);
        app.renderBoard();

        const hiddenCol = document.getElementById('team2');
        expect(hiddenCol.style.display).toBe('none');

        const visibleCol = document.getElementById('team1');
        expect(visibleCol.style.display).not.toBe('none');
    });
});

// ===== 計數統計 =====
describe('計數統計', () => {
    beforeEach(() => {
        app.renderBoard();
    });

    it('updateCounts 正確計算各欄卡片數', () => {
        app.createCard('角色A', ['陌刀'], [], 'repo', 'cA');
        app.createCard('角色B', ['補'], [], 'repo', 'cB');
        app.createCard('角色C', ['隊長'], [], 'team1', 'cC');

        app.updateCounts();
        expect(document.getElementById('count-repo').textContent).toBe('2');
        expect(document.getElementById('count-team1').textContent).toBe('1');
    });

    it('updateCounts 正確統計各欄職業分佈', () => {
        app.createCard('A', ['陌刀'], [], 'team1', 'sA');
        app.createCard('B', ['陌刀'], [], 'team1', 'sB');
        app.createCard('C', ['補'], [], 'team1', 'sC');

        app.updateCounts();
        const statsEl = document.getElementById('stats-team1');
        expect(statsEl.innerHTML).toContain('陌刀:2');
        expect(statsEl.innerHTML).toContain('補:1');
    });
});

// ===== 狀態持久化 =====
describe('狀態持久化', () => {
    it('saveState 正確序列化所有欄位資料', () => {
        app.renderBoard();
        app.createCard('角色X', ['隊長'], ['六'], 'repo', 'save-test');

        app.saveState();

        const saved = JSON.parse(localStorage.getItem(app.storageKey));
        expect(saved.data.repo).toHaveLength(1);
        expect(saved.data.repo[0].name).toBe('角色X');
        expect(saved.data.repo[0].jobs).toEqual(['隊長']);
        expect(saved.configs).toHaveLength(4);
    });

    it('window.onload 從 localStorage 載入既有資料', () => {
        const savedState = {
            data: {
                repo: [{ id: 'loaded-1', name: '載入角色', jobs: ['補'], days: ['日'] }],
                team1: [],
                team2: [],
                team3: [],
                teamMobile: []
            },
            configs: [
                { id: 'team1', name: '🚩 第一隊', visible: true },
                { id: 'team2', name: '🚩 第二隊', visible: true },
                { id: 'team3', name: '🚩 第三隊', visible: true },
                { id: 'teamMobile', name: '⚡ 機動隊', visible: true }
            ]
        };
        localStorage.setItem(app.storageKey, JSON.stringify(savedState));

        window.onload();

        const card = document.getElementById('loaded-1');
        expect(card).not.toBeNull();
        expect(card.dataset.name).toBe('載入角色');
    });

    it('window.onload 無資料時顯示空看板', () => {
        localStorage.clear();
        window.onload();

        const columns = document.querySelectorAll('#mainBoard .column');
        expect(columns.length).toBe(4);
        const cards = document.querySelectorAll('#mainBoard .card');
        expect(cards.length).toBe(0);
    });
});

// ===== 隊伍設定 =====
describe('隊伍設定', () => {
    beforeEach(() => {
        app.renderBoard();
    });

    it('updateTeamVisibility 切換隊伍顯示狀態', () => {
        app.updateTeamVisibility('team2');
        const col = document.getElementById('team2');
        expect(col.style.display).toBe('none');
        expect(app.getTeamConfigs().find(c => c.id === 'team2').visible).toBe(false);

        app.updateTeamVisibility('team2');
        expect(col.style.display).toBe('block');
        expect(app.getTeamConfigs().find(c => c.id === 'team2').visible).toBe(true);
    });

    it('renderSettings 渲染隊伍勾選框', () => {
        app.renderSettings();
        const checkboxes = document.querySelectorAll('#teamVisibilityGroup input[type="checkbox"]');
        expect(checkboxes.length).toBe(4);
        expect(checkboxes[0].value).toBe('team1');
        expect(checkboxes[0].checked).toBe(true);
    });
});

// ===== CSV 匯入 =====
describe('CSV 匯入', () => {
    beforeEach(() => {
        app.renderBoard();
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    it('processCSV 正確解析 CSV 並建立角色', () => {
        document.getElementById('csvInput').value = '玩家A,陌刀\n玩家B,補';
        document.getElementById('importSection').style.display = 'block';

        app.processCSV();

        const cards = document.querySelectorAll('#repo .card');
        expect(cards.length).toBe(2);
        expect(cards[0].dataset.name).toBe('玩家A');
        expect(JSON.parse(cards[0].dataset.jobs)).toEqual(['陌刀']);
    });

    it('processCSV 跳過 header 行', () => {
        document.getElementById('csvInput').value = 'username,message\n玩家C,補';
        document.getElementById('importSection').style.display = 'block';

        app.processCSV();

        const cards = document.querySelectorAll('#repo .card');
        expect(cards.length).toBe(1);
        expect(cards[0].dataset.name).toBe('玩家C');
    });

    it('processCSV 職業代號映射（99→酒酒、奶→補、劍劍→雙劍）', () => {
        document.getElementById('csvInput').value = '玩家D,99\n玩家E,奶\n玩家F,劍劍';
        document.getElementById('importSection').style.display = 'block';

        app.processCSV();

        const cards = document.querySelectorAll('#repo .card');
        expect(cards.length).toBe(3);
        expect(JSON.parse(cards[0].dataset.jobs)).toEqual(['酒酒']);
        expect(JSON.parse(cards[1].dataset.jobs)).toEqual(['補']);
        expect(JSON.parse(cards[2].dataset.jobs)).toEqual(['雙劍']);
    });
});

// ===== 表單操作 =====
describe('表單操作', () => {
    beforeEach(() => {
        app.renderBoard();
    });

    it('resetForm 清空所有欄位', () => {
        document.getElementById('charName').value = '某角色';
        document.getElementById('editingId').value = 'some-id';
        document.querySelector('#jobGroup input[value="陌刀"]').checked = true;
        document.getElementById('cancelEdit').style.display = 'inline';

        app.resetForm();

        expect(document.getElementById('charName').value).toBe('');
        expect(document.getElementById('editingId').value).toBe('');
        expect(document.querySelector('#jobGroup input[value="陌刀"]').checked).toBe(false);
        expect(document.getElementById('cancelEdit').style.display).toBe('none');
    });

    it('startEdit 載入角色資料到表單', () => {
        app.createCard('編輯目標', ['隊長', '補'], ['六'], 'repo', 'edit-test');

        document.getElementById('charName').scrollIntoView = vi.fn();

        app.startEdit('edit-test');

        expect(document.getElementById('charName').value).toBe('編輯目標');
        expect(document.getElementById('editingId').value).toBe('edit-test');
        expect(document.querySelector('#jobGroup input[value="隊長"]').checked).toBe(true);
        expect(document.querySelector('#jobGroup input[value="補"]').checked).toBe(true);
        expect(document.querySelector('#jobGroup input[value="陌刀"]').checked).toBe(false);
        expect(document.getElementById('cancelEdit').style.display).toBe('inline');
    });
});
