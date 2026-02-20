/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
const { teamApp, ROLE_CATEGORIES } = require('../src/alpine-app.js');

let app;

beforeEach(() => {
    localStorage.clear();
    app = teamApp();
    // Stub $watch (Alpine.js runtime method)
    app.$watch = vi.fn();
    // Initialize empty cards (skip loadState to isolate tests)
    app.cards = {
        repo: [],
        team1: [],
        team2: [],
        team3: [],
        teamMobile: []
    };
});

// ===== localStorage 操作 =====
describe('localStorage 操作', () => {
    it('safeGetStorage 能正確讀取和解析 JSON', () => {
        localStorage.setItem('testKey', JSON.stringify({ foo: 'bar' }));
        expect(app.safeGetStorage('testKey')).toEqual({ foo: 'bar' });
    });

    it('safeGetStorage 在 localStorage 失敗時回傳 null', () => {
        const original = localStorage.getItem;
        localStorage.getItem = () => { throw new Error('fail'); };
        expect(app.safeGetStorage('anyKey')).toBeNull();
        localStorage.getItem = original;
    });

    it('safeGetStorage 無資料時回傳 null', () => {
        expect(app.safeGetStorage('nonexistent')).toBeNull();
    });

    it('safeSetStorage 能正確寫入 JSON', () => {
        app.safeSetStorage('testKey', { hello: 'world' });
        expect(JSON.parse(localStorage.getItem('testKey'))).toEqual({ hello: 'world' });
    });
});

// ===== 角色管理 =====
describe('角色管理', () => {
    it('handleNewOrUpdateCharacter 新增角色到角色庫', () => {
        app.charName = '新角色';
        app.selectedJobs = ['陌刀'];
        app.selectedDays = ['六'];

        app.handleNewOrUpdateCharacter();

        expect(app.cards.repo).toHaveLength(1);
        expect(app.cards.repo[0].name).toBe('新角色');
        expect(app.cards.repo[0].jobs).toEqual(['陌刀']);
        expect(app.cards.repo[0].days).toEqual(['六']);
    });

    it('handleNewOrUpdateCharacter 更新既有角色', () => {
        app.cards.repo.push({ id: 'edit-target', name: '舊名稱', jobs: ['補'], days: ['六'] });

        app.editingId = 'edit-target';
        app.charName = '新名稱';
        app.selectedJobs = ['陌刀'];
        app.selectedDays = ['日'];

        app.handleNewOrUpdateCharacter();

        const card = app.cards.repo.find(c => c.id === 'edit-target');
        expect(card.name).toBe('新名稱');
        expect(card.jobs).toEqual(['陌刀']);
        expect(card.days).toEqual(['日']);
    });

    it('handleNewOrUpdateCharacter 可更新不同欄位中的角色', () => {
        app.cards.team1.push({ id: 'in-team', name: '隊員', jobs: ['補'], days: [] });

        app.editingId = 'in-team';
        app.charName = '新隊員';
        app.selectedJobs = ['隊長'];
        app.selectedDays = [];

        app.handleNewOrUpdateCharacter();

        const card = app.cards.team1.find(c => c.id === 'in-team');
        expect(card.name).toBe('新隊員');
        expect(card.jobs).toEqual(['隊長']);
    });

    it('handleNewOrUpdateCharacter 名稱為空時不執行', () => {
        app.charName = '';
        app.selectedJobs = ['陌刀'];

        app.handleNewOrUpdateCharacter();

        expect(app.cards.repo).toHaveLength(0);
    });

    it('handleNewOrUpdateCharacter 職業為空時不執行', () => {
        app.charName = '有名字';
        app.selectedJobs = [];

        app.handleNewOrUpdateCharacter();

        expect(app.cards.repo).toHaveLength(0);
    });

    it('deleteCard 能刪除角色', () => {
        app.cards.repo.push({ id: 'del-target', name: '待刪除', jobs: ['補'], days: [] });
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        app.deleteCard('del-target');

        expect(app.cards.repo).toHaveLength(0);
    });

    it('deleteCard 取消時不刪除', () => {
        app.cards.repo.push({ id: 'keep-me', name: '保留', jobs: ['補'], days: [] });
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        app.deleteCard('keep-me');

        expect(app.cards.repo).toHaveLength(1);
    });
});

// ===== 看板與可見性 =====
describe('看板與可見性', () => {
    it('visibleTeams 只回傳 visible=true 的隊伍', () => {
        app.teamConfigs[1].visible = false;
        expect(app.visibleTeams).toHaveLength(3);
        expect(app.visibleTeams.find(t => t.id === 'team2')).toBeUndefined();
    });

    it('visibleTeams 預設 4 隊全部可見', () => {
        expect(app.visibleTeams).toHaveLength(4);
    });

    it('updateTeamVisibility 呼叫 saveState', () => {
        const spy = vi.spyOn(app, 'saveState');
        app.updateTeamVisibility();
        expect(spy).toHaveBeenCalled();
    });
});

// ===== 計數與統計 =====
describe('計數與統計', () => {
    it('getColumnCount 正確計算各欄卡片數', () => {
        app.cards.repo.push(
            { id: 'a', name: 'A', jobs: ['陌刀'], days: [] },
            { id: 'b', name: 'B', jobs: ['補'], days: [] }
        );
        app.cards.team1.push(
            { id: 'c', name: 'C', jobs: ['隊長'], days: [] }
        );

        expect(app.getColumnCount('repo')).toBe(2);
        expect(app.getColumnCount('team1')).toBe(1);
        expect(app.getColumnCount('team2')).toBe(0);
    });

    it('getColumnCards 回傳空陣列若欄位不存在', () => {
        expect(app.getColumnCards('nonexistent')).toEqual([]);
    });

    it('getJobStats 正確統計各欄職業分佈', () => {
        app.cards.team1.push(
            { id: 'a', name: 'A', jobs: ['陌刀'], days: [] },
            { id: 'b', name: 'B', jobs: ['陌刀'], days: [] },
            { id: 'c', name: 'C', jobs: ['補'], days: [] }
        );

        const stats = app.getJobStats('team1');
        expect(stats).toEqual({ '陌刀': 2, '補': 1 });
    });

    it('getJobStats 多職業角色每個職業各計一次', () => {
        app.cards.team1.push(
            { id: 'a', name: 'A', jobs: ['隊長', '補'], days: [] }
        );

        const stats = app.getJobStats('team1');
        expect(stats).toEqual({ '隊長': 1, '補': 1 });
    });
});

// ===== 職業配色 =====
describe('職業配色', () => {
    it('getJobClass 隊長→job-red', () => {
        expect(app.getJobClass('隊長')).toBe('job-red');
    });

    it('getJobClass 陌刀→job-yellow', () => {
        expect(app.getJobClass('陌刀')).toBe('job-yellow');
    });

    it('getJobClass 補→job-green', () => {
        expect(app.getJobClass('補')).toBe('job-green');
    });

    it('getJobClass 其他→job-blue', () => {
        expect(app.getJobClass('玉玉')).toBe('job-blue');
        expect(app.getJobClass('酒酒')).toBe('job-blue');
    });
});

// ===== 狀態持久化 =====
describe('狀態持久化', () => {
    it('saveState 正確序列化資料到 localStorage', () => {
        app.cards.repo.push({ id: 'x', name: '角色X', jobs: ['隊長'], days: ['六'] });

        app.saveState();

        const saved = JSON.parse(localStorage.getItem(app.storageKey));
        expect(saved.data.repo).toHaveLength(1);
        expect(saved.data.repo[0].name).toBe('角色X');
        expect(saved.configs).toHaveLength(4);
    });

    it('saveState 儲存 teamConfigs 含 visible 狀態', () => {
        app.teamConfigs[1].visible = false;

        app.saveState();

        const saved = JSON.parse(localStorage.getItem(app.storageKey));
        expect(saved.configs[1].visible).toBe(false);
    });

    it('loadState 從 localStorage 載入既有資料', () => {
        const savedState = {
            data: {
                repo: [{ id: 'loaded-1', name: '載入角色', jobs: ['補'], days: ['日'] }],
                team1: [], team2: [], team3: [], teamMobile: []
            },
            configs: [
                { id: 'team1', name: '第一隊', visible: true },
                { id: 'team2', name: '第二隊', visible: false },
                { id: 'team3', name: '第三隊', visible: true },
                { id: 'teamMobile', name: '機動隊', visible: true }
            ]
        };
        localStorage.setItem(app.storageKey, JSON.stringify(savedState));

        app.loadState();

        expect(app.cards.repo).toHaveLength(1);
        expect(app.cards.repo[0].name).toBe('載入角色');
        expect(app.teamConfigs[1].visible).toBe(false);
    });

    it('loadState 無資料時初始化空欄位', () => {
        localStorage.clear();

        app.loadState();

        expect(app.cards.repo).toEqual([]);
        expect(app.cards.team1).toEqual([]);
        expect(app.cards.team2).toEqual([]);
        expect(app.cards.team3).toEqual([]);
        expect(app.cards.teamMobile).toEqual([]);
    });

    it('init 呼叫 loadState 並設定 $watch', () => {
        const loadSpy = vi.spyOn(app, 'loadState');

        app.init();

        expect(loadSpy).toHaveBeenCalled();
        expect(app.$watch).toHaveBeenCalledWith('teamConfigs', expect.any(Function));
    });
});

// ===== CSV 匯入 =====
describe('CSV 匯入', () => {
    beforeEach(() => {
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    it('processCSV 正確解析 CSV 並建立角色', () => {
        app.csvInput = '玩家A,陌刀\n玩家B,補';

        app.processCSV();

        expect(app.cards.repo).toHaveLength(2);
        expect(app.cards.repo[0].name).toBe('玩家A');
        expect(app.cards.repo[0].jobs).toEqual(['陌刀']);
        expect(app.cards.repo[1].name).toBe('玩家B');
        expect(app.cards.repo[1].jobs).toEqual(['補']);
    });

    it('processCSV 跳過 header 行', () => {
        app.csvInput = 'username,message\n玩家C,補';

        app.processCSV();

        expect(app.cards.repo).toHaveLength(1);
        expect(app.cards.repo[0].name).toBe('玩家C');
    });

    it('processCSV 職業代號映射（99→酒酒、奶→補、劍劍→雙劍）', () => {
        app.csvInput = '玩家D,99\n玩家E,奶\n玩家F,劍劍';

        app.processCSV();

        expect(app.cards.repo).toHaveLength(3);
        expect(app.cards.repo[0].jobs).toEqual(['酒酒']);
        expect(app.cards.repo[1].jobs).toEqual(['補']);
        expect(app.cards.repo[2].jobs).toEqual(['雙劍']);
    });

    it('processCSV 完成後清空輸入並關閉面板', () => {
        app.csvInput = '玩家G,陌刀';
        app.showImport = true;

        app.processCSV();

        expect(app.csvInput).toBe('');
        expect(app.showImport).toBe(false);
    });

    it('processCSV 空輸入不執行', () => {
        app.csvInput = '';

        app.processCSV();

        expect(app.cards.repo).toHaveLength(0);
    });
});

// ===== 表單操作 =====
describe('表單操作', () => {
    it('resetForm 清空所有欄位', () => {
        app.charName = '某角色';
        app.selectedJobs = ['陌刀', '補'];
        app.selectedDays = ['六'];
        app.editingId = 'some-id';

        app.resetForm();

        expect(app.charName).toBe('');
        expect(app.selectedJobs).toEqual([]);
        expect(app.selectedDays).toEqual([]);
        expect(app.editingId).toBeNull();
    });

    it('startEdit 載入角色資料到表單', () => {
        app.cards.repo.push({ id: 'edit-test', name: '編輯目標', jobs: ['隊長', '補'], days: ['六'] });

        app.startEdit('edit-test');

        expect(app.charName).toBe('編輯目標');
        expect(app.selectedJobs).toEqual(['隊長', '補']);
        expect(app.selectedDays).toEqual(['六']);
        expect(app.editingId).toBe('edit-test');
    });

    it('startEdit 能找到不同欄位中的角色', () => {
        app.cards.team2.push({ id: 'in-t2', name: '隊員二', jobs: ['無名'], days: ['日'] });

        app.startEdit('in-t2');

        expect(app.charName).toBe('隊員二');
        expect(app.editingId).toBe('in-t2');
    });

    it('startEdit 不修改原始資料（拷貝而非引用）', () => {
        app.cards.repo.push({ id: 'ref-test', name: 'REF', jobs: ['補'], days: ['六'] });

        app.startEdit('ref-test');
        app.selectedJobs.push('陌刀');

        expect(app.cards.repo[0].jobs).toEqual(['補']);
    });
});

// ===== 拖放功能 =====
describe('拖放功能', () => {
    function makeDropEvent(cardId, clientY = 9999) {
        return {
            preventDefault: vi.fn(),
            clientY,
            dataTransfer: { getData: () => cardId },
            currentTarget: makeFakeColumnEl([])
        };
    }

    function makeFakeColumnEl(cardRects) {
        const cards = cardRects.map(rect => ({
            getBoundingClientRect: () => rect,
            style: {}
        }));
        return { querySelectorAll: (sel) => sel === '.card' ? cards : [] };
    }

    it('drop 將卡片從來源欄位移到目標欄位', () => {
        app.cards.repo.push({ id: 'drag-me', name: '拖拽', jobs: ['陌刀'], days: [] });

        const event = makeDropEvent('drag-me');
        app.drop(event, 'team1');

        expect(app.cards.repo).toHaveLength(0);
        expect(app.cards.team1).toHaveLength(1);
        expect(app.cards.team1[0].id).toBe('drag-me');
    });

    it('drop 無效 cardId 不執行', () => {
        const event = makeDropEvent('');
        app.drop(event, 'team1');

        expect(app.cards.team1).toHaveLength(0);
    });

    it('getInsertIndex 在所有卡片之前插入', () => {
        const columnEl = makeFakeColumnEl([
            { top: 100, height: 40 },
            { top: 150, height: 40 }
        ]);
        expect(app.getInsertIndex(columnEl, 90)).toBe(0);
    });

    it('getInsertIndex 在兩張卡片之間插入', () => {
        const columnEl = makeFakeColumnEl([
            { top: 100, height: 40 },
            { top: 150, height: 40 }
        ]);
        // clientY=130 is after center of first card (120) but before center of second (170)
        expect(app.getInsertIndex(columnEl, 130)).toBe(1);
    });

    it('getInsertIndex 在所有卡片之後插入', () => {
        const columnEl = makeFakeColumnEl([
            { top: 100, height: 40 },
            { top: 150, height: 40 }
        ]);
        expect(app.getInsertIndex(columnEl, 999)).toBe(2);
    });

    it('getInsertIndex 空欄位回傳 0', () => {
        const columnEl = makeFakeColumnEl([]);
        expect(app.getInsertIndex(columnEl, 100)).toBe(0);
    });

    it('drop 插入到指定位置而非末尾', () => {
        app.cards.team1.push(
            { id: 'a', name: 'A', jobs: ['補'], days: [] },
            { id: 'b', name: 'B', jobs: ['補'], days: [] }
        );
        app.cards.repo.push({ id: 'new', name: 'New', jobs: ['陌刀'], days: [] });

        // Simulate dropping between card A (top:100,h:40,center:120) and card B (top:150,h:40,center:170)
        const event = {
            preventDefault: vi.fn(),
            clientY: 130,
            dataTransfer: { getData: () => 'new' },
            currentTarget: makeFakeColumnEl([
                { top: 100, height: 40 },
                { top: 150, height: 40 }
            ])
        };

        app.drop(event, 'team1');

        expect(app.cards.team1.map(c => c.id)).toEqual(['a', 'new', 'b']);
    });

    it('showDropIndicator 插入指示線到正確位置', () => {
        const container = document.createElement('div');
        const card1 = document.createElement('div');
        card1.className = 'card';
        card1.getBoundingClientRect = () => ({ top: 100, height: 40 });
        const card2 = document.createElement('div');
        card2.className = 'card';
        card2.getBoundingClientRect = () => ({ top: 150, height: 40 });
        container.appendChild(card1);
        container.appendChild(card2);
        container.querySelectorAll = (sel) => sel === '.card' ? [card1, card2] : [];

        // Insert before second card (clientY=130, between centers 120 and 170)
        app.showDropIndicator(container, 130);

        const indicator = container.querySelector('.drop-indicator');
        expect(indicator).not.toBeNull();
        // indicator should be before card2
        const children = Array.from(container.children);
        expect(children.indexOf(indicator)).toBe(children.indexOf(card2) - 1);
    });

    it('showDropIndicator 在末尾插入指示線', () => {
        const container = document.createElement('div');
        const card1 = document.createElement('div');
        card1.className = 'card';
        card1.getBoundingClientRect = () => ({ top: 100, height: 40 });
        container.appendChild(card1);
        container.querySelectorAll = (sel) => sel === '.card' ? [card1] : [];

        app.showDropIndicator(container, 999);

        const indicator = container.querySelector('.drop-indicator');
        expect(indicator).not.toBeNull();
        expect(container.lastChild).toBe(indicator);
    });

    it('clearDropIndicator 移除指示線元素', () => {
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        document.body.appendChild(indicator);

        app.clearDropIndicator();

        expect(document.querySelector('.drop-indicator')).toBeNull();
    });

    it('clearDropIndicator 無指示線時不報錯', () => {
        expect(() => app.clearDropIndicator()).not.toThrow();
    });

    it('showDropIndicator 跳過被拖曳中的卡片', () => {
        const container = document.createElement('div');
        const card1 = document.createElement('div');
        card1.className = 'card';
        card1.style.opacity = '0.3'; // dragging card
        card1.getBoundingClientRect = () => ({ top: 100, height: 40 });
        const card2 = document.createElement('div');
        card2.className = 'card';
        card2.getBoundingClientRect = () => ({ top: 150, height: 40 });
        container.appendChild(card1);
        container.appendChild(card2);
        container.querySelectorAll = (sel) => sel === '.card' ? [card1, card2] : [];

        // clientY=90 should insert before card2 (the only visible card)
        app.showDropIndicator(container, 90);

        const indicator = container.querySelector('.drop-indicator');
        expect(indicator).not.toBeNull();
        const children = Array.from(container.children);
        expect(children.indexOf(indicator)).toBeLessThan(children.indexOf(card2));
    });

    it('drop 同欄位內拖曳調整順序', () => {
        app.cards.team1.push(
            { id: 'a', name: 'A', jobs: ['補'], days: [] },
            { id: 'b', name: 'B', jobs: ['陌刀'], days: [] },
            { id: 'c', name: 'C', jobs: ['隊長'], days: [] }
        );

        // Drag card 'c' to before card 'a' (drop at top, Y=50)
        const event = {
            preventDefault: vi.fn(),
            clientY: 50,
            dataTransfer: { getData: () => 'c' },
            currentTarget: makeFakeColumnEl([
                { top: 100, height: 40 },
                { top: 150, height: 40 },
                { top: 200, height: 40 }
            ])
        };

        app.drop(event, 'team1');

        expect(app.cards.team1.map(c => c.id)).toEqual(['c', 'a', 'b']);
    });
});

// ===== 分隊結果匯入匯出 =====
describe('分隊結果匯入匯出', () => {
    beforeEach(() => {
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    it('exportTeamData 產生包含所有資料的 JSON', () => {
        app.cards.repo.push({ id: 'r1', name: '角色1', jobs: ['陌刀'], days: ['六'] });
        app.cards.team1.push({ id: 't1', name: '角色2', jobs: ['補'], days: ['日'] });
        app.teamConfigs[0].name = '自訂隊名';

        const createElementSpy = vi.spyOn(document, 'createElement');
        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

        app.exportTeamData();

        // Verify a link element was created
        expect(createElementSpy).toHaveBeenCalledWith('a');
        
        // Get the blob that was created
        const blobCall = createObjectURLSpy.mock.calls[0];
        expect(blobCall).toBeDefined();
        
        const blob = blobCall[0];
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json');

        // Verify revoke was called
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('mock-url');

        createElementSpy.mockRestore();
        createObjectURLSpy.mockRestore();
        revokeObjectURLSpy.mockRestore();
    });

    it('importTeamData 正確載入 JSON 資料', () => {
        const importData = {
            version: '1.0',
            exportDate: '2024-01-01T00:00:00.000Z',
            teamConfigs: [
                { id: 'team1', name: '匯入隊伍1', visible: true },
                { id: 'team2', name: '匯入隊伍2', visible: false },
                { id: 'team3', name: '匯入隊伍3', visible: true },
                { id: 'teamMobile', name: '匯入機動', visible: true }
            ],
            cards: {
                repo: [{ id: 'i1', name: '匯入角色1', jobs: ['隊長'], days: ['六'] }],
                team1: [{ id: 'i2', name: '匯入角色2', jobs: ['陌刀'], days: ['日'] }],
                team2: [],
                team3: [],
                teamMobile: []
            }
        };

        app.importTeamData(JSON.stringify(importData));

        expect(app.cards.repo).toHaveLength(1);
        expect(app.cards.repo[0].name).toBe('匯入角色1');
        expect(app.cards.team1).toHaveLength(1);
        expect(app.cards.team1[0].name).toBe('匯入角色2');
        expect(app.teamConfigs[0].name).toBe('匯入隊伍1');
        expect(app.teamConfigs[1].visible).toBe(false);
    });

    it('importTeamData 無效的 JSON 顯示錯誤', () => {
        app.importTeamData('invalid json');
        expect(window.alert).toHaveBeenCalledWith('匯入失敗：檔案格式錯誤');
    });

    it('importTeamData 缺少 cards 欄位顯示錯誤', () => {
        const invalidData = {
            version: '1.0',
            teamConfigs: []
        };

        app.importTeamData(JSON.stringify(invalidData));
        expect(window.alert).toHaveBeenCalledWith('匯入失敗：檔案格式錯誤');
    });

    it('importTeamData 成功後顯示成功訊息', () => {
        const validData = {
            cards: {
                repo: [],
                team1: [],
                team2: [],
                team3: [],
                teamMobile: []
            }
        };

        app.importTeamData(JSON.stringify(validData));
        expect(window.alert).toHaveBeenCalledWith('匯入成功！');
    });

    it('importTeamData 沒有 teamConfigs 時保持原配置', () => {
        const originalConfigs = JSON.parse(JSON.stringify(app.teamConfigs));
        const validData = {
            cards: {
                repo: [{ id: 'test', name: 'Test', jobs: ['補'], days: [] }],
                team1: [],
                team2: [],
                team3: [],
                teamMobile: []
            }
        };

        app.importTeamData(JSON.stringify(validData));

        expect(app.teamConfigs[0].id).toBe(originalConfigs[0].id);
        expect(app.cards.repo).toHaveLength(1);
    });
});

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

// ===== 分類摺疊 =====
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
