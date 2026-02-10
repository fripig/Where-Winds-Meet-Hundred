/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
const { teamApp } = require('../src/alpine-app.js');

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
        expect(app.$watch).toHaveBeenCalledWith('teamConfigs', expect.any(Function), { deep: true });
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
    it('drop 將卡片從來源欄位移到目標欄位', () => {
        app.cards.repo.push({ id: 'drag-me', name: '拖拽', jobs: ['陌刀'], days: [] });

        const event = {
            preventDefault: vi.fn(),
            dataTransfer: { getData: () => 'drag-me' }
        };

        app.drop(event, 'team1');

        expect(app.cards.repo).toHaveLength(0);
        expect(app.cards.team1).toHaveLength(1);
        expect(app.cards.team1[0].id).toBe('drag-me');
    });

    it('drop 無效 cardId 不執行', () => {
        const event = {
            preventDefault: vi.fn(),
            dataTransfer: { getData: () => '' }
        };

        app.drop(event, 'team1');

        expect(app.cards.team1).toHaveLength(0);
    });
});
