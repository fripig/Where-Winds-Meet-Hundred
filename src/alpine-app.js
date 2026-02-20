const ROLE_CATEGORIES = [
    { id: 'tank',    name: '坦克',   jobs: ['陌刀'] },
    { id: 'healer',  name: '奶媽',   jobs: ['補'] },
    { id: 'wuming',  name: '無名',   jobs: ['無名'] },
    { id: 'yuyu',    name: '玉玉',   jobs: ['玉玉'] },
    { id: 'general', name: '綜合豪', jobs: ['酒酒', '雙劍', '雙刀'] },
];

function teamApp() {
    return {
        storageKey: 'teamData_v2',
        teamConfigs: [
            { id: 'team1', name: '🚩 第一隊', visible: true },
            { id: 'team2', name: '🚩 第二隊', visible: true },
            { id: 'team3', name: '🚩 第三隊', visible: true },
            { id: 'teamMobile', name: '⚡ 機動隊', visible: true }
        ],
        cards: {},
        charName: '',
        selectedJobs: [],
        selectedDays: [],
        editingId: null,
        saveStatus: false,
        showImport: false,
        showSettings: false,
        csvInput: '',
        availableJobs: ['隊長', '陌刀', '補', '玉玉', '無名', '酒酒', '雙劍', '雙刀', '打野'],

        // Move menu state
        moveMenuCardId: null,

        // Touch drag state
        touchDragState: null,
        touchDragClone: null,

        collapsedCategories: {},

        init() {
            this.loadState();
            this.$watch('teamConfigs', () => this.saveState());
        },

        get visibleTeams() {
            return this.teamConfigs.filter(t => t.visible !== false);
        },

        safeGetStorage(key) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.warn('localStorage read failed:', e);
                return null;
            }
        },

        safeSetStorage(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.warn('localStorage write failed:', e);
            }
        },

        loadState() {
            const savedData = this.safeGetStorage(this.storageKey);
            if (savedData) {
                if (savedData.configs) {
                    this.teamConfigs = savedData.configs.map(c => ({
                        ...c,
                        visible: c.visible !== false
                    }));
                }
                if (savedData.data) {
                    this.cards = savedData.data;
                }
            } else {
                // Initialize with empty columns
                this.cards = {
                    repo: [],
                    team1: [],
                    team2: [],
                    team3: [],
                    teamMobile: []
                };
            }
        },

        animateCardDrop(cardId) {
            setTimeout(() => {
                const el = document.querySelector(`[data-card-id="${cardId}"]`);
                if (!el) return;
                el.classList.add('just-dropped');
                el.addEventListener('animationend', () => el.classList.remove('just-dropped'), { once: true });
            }, 0);
        },

        saveState() {
            const configs = this.teamConfigs.map(t => ({
                id: t.id,
                name: t.name,
                visible: t.visible
            }));
            this.safeSetStorage(this.storageKey, { data: this.cards, configs });
            this.saveStatus = true;
            setTimeout(() => { this.saveStatus = false; }, 1500);
        },

        getColumnCards(columnId) {
            return this.cards[columnId] || [];
        },

        getColumnCount(columnId) {
            return this.getColumnCards(columnId).length;
        },

        getJobStats(columnId) {
            const cards = this.getColumnCards(columnId);
            const jobCounts = {};
            cards.forEach(card => {
                card.jobs.forEach(job => {
                    jobCounts[job] = (jobCounts[job] || 0) + 1;
                });
            });
            return jobCounts;
        },

        getCategoryStats(columnId) {
            const categories = this.getCategoryCards(columnId);
            const stats = {};
            categories.forEach(cat => {
                if (cat.cards.length > 0) {
                    stats[cat.name] = cat.cards.length;
                }
            });
            return stats;
        },

        getJobClass(job) {
            if (job === '隊長') return 'job-red';
            if (job === '陌刀') return 'job-yellow';
            if (job === '補') return 'job-green';
            if (job === '打野') return 'job-purple';
            return 'job-blue';
        },

        getCategoryCards(columnId) {
            const cards = this.getColumnCards(columnId);
            return ROLE_CATEGORIES.map(cat => ({
                id: cat.id,
                name: cat.name,
                cards: cards.filter(card => this.getCardCategory(card) === cat.id),
            }));
        },

        getCardCategory(card) {
            if (card.categoryOverride) return card.categoryOverride;
            const job = card.jobs.find(j => j !== '隊長');
            if (!job) return 'general';
            const cat = ROLE_CATEGORIES.find(c => c.jobs.includes(job));
            return cat ? cat.id : 'general';
        },

        toggleCategory(columnId, categoryId) {
            const key = columnId + ':' + categoryId;
            this.collapsedCategories[key] = !this.collapsedCategories[key];
        },

        isCategoryCollapsed(columnId, categoryId) {
            return !!this.collapsedCategories[columnId + ':' + categoryId];
        },

        handleNewOrUpdateCharacter() {
            const name = this.charName.trim();
            const jobs = [...this.selectedJobs];
            const days = [...this.selectedDays];

            if (!name || jobs.length === 0) return;

            if (this.editingId) {
                // Update existing card
                let found = false;
                for (const colId in this.cards) {
                    const idx = this.cards[colId].findIndex(c => c.id === this.editingId);
                    if (idx !== -1) {
                        this.cards[colId][idx] = { id: this.editingId, name, jobs, days };
                        found = true;
                        break;
                    }
                }
            } else {
                // Create new card with unique ID
                const cardId = 'char-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
                if (!this.cards.repo) this.cards.repo = [];
                this.cards.repo.push({ id: cardId, name, jobs, days });
            }

            this.resetForm();
            this.saveState();
        },

        startEdit(cardId) {
            let card = null;
            for (const colId in this.cards) {
                card = this.cards[colId].find(c => c.id === cardId);
                if (card) break;
            }

            if (card) {
                this.charName = card.name;
                this.selectedJobs = [...card.jobs];
                this.selectedDays = [...card.days];
                this.editingId = cardId;

                // Scroll to form
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
            }
        },

        resetForm() {
            this.charName = '';
            this.selectedJobs = [];
            this.selectedDays = [];
            this.editingId = null;
        },

        deleteCard(cardId) {
            if (confirm("確定刪除此角色？")) {
                for (const colId in this.cards) {
                    const idx = this.cards[colId].findIndex(c => c.id === cardId);
                    if (idx !== -1) {
                        this.cards[colId].splice(idx, 1);
                        this.saveState();
                        break;
                    }
                }
            }
        },

        updateTeamVisibility() {
            this.saveState();
        },

        processCSV() {
            const text = this.csvInput.trim();
            if (!text) return;

            const lines = text.split('\n');
            const startIdx = lines[0].includes('username') ? 1 : 0;

            if (!this.cards.repo) this.cards.repo = [];

            for (let i = startIdx; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(',');
                if (parts.length < 2) continue;

                const name = parts[0].trim();
                let rawMsg = parts.slice(1).join(',').trim();

                // Job mapping
                let job = rawMsg;
                if (rawMsg === '99') job = '酒酒';
                else if (rawMsg === '奶') job = '補';
                else if (rawMsg === '劍劍') job = '雙劍';

                const cardId = 'char-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11) + '-' + i;
                this.cards.repo.push({ id: cardId, name, jobs: [job], days: [] });
            }

            this.csvInput = '';
            this.showImport = false;
            this.saveState();
            alert('匯入完成！');
        },

        downloadImage() {
            if (typeof html2canvas === 'undefined') {
                alert('截圖功能載入中，請稍後再試。');
                return;
            }
            html2canvas(document.body, { scale: 1 }).then(canvas => {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                if (isIOS && navigator.share) {
                    canvas.toBlob(blob => {
                        const file = new File([blob], 'team-distribution.png', { type: 'image/png' });
                        navigator.share({ files: [file] }).catch(() => {
                            window.open(canvas.toDataURL(), '_blank');
                        });
                    });
                } else if (isIOS) {
                    window.open(canvas.toDataURL(), '_blank');
                } else {
                    const link = document.createElement('a');
                    link.download = 'team-distribution.png';
                    link.href = canvas.toDataURL();
                    link.click();
                }
            }).catch(err => {
                console.error('Screenshot failed:', err);
                alert('截圖失敗，請稍後再試。');
            });
        },

        exportTeamData() {
            const now = new Date().toISOString();
            const exportData = {
                version: '1.0',
                exportDate: now,
                teamConfigs: this.teamConfigs.map(t => ({
                    id: t.id,
                    name: t.name,
                    visible: t.visible
                })),
                cards: this.cards
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `team-division-${now.split('T')[0]}.json`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        },

        importTeamData(fileContent) {
            try {
                const importData = JSON.parse(fileContent);
                
                if (!importData.cards) {
                    throw new Error('無效的檔案格式');
                }

                // Import team configs if available
                if (importData.teamConfigs) {
                    this.teamConfigs = importData.teamConfigs.map(t => ({
                        ...t,
                        // Default to visible if not specified
                        visible: t.visible !== false
                    }));
                }

                // Import cards
                this.cards = importData.cards;

                this.saveState();
                alert('匯入成功！');
            } catch (error) {
                console.error('Import failed:', error);
                alert('匯入失敗：檔案格式錯誤');
            }
        },

        handleImportFile(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.importTeamData(e.target.result);
                // Reset file input
                event.target.value = '';
            };
            reader.onerror = () => {
                alert('讀取檔案失敗');
                event.target.value = '';
            };
            reader.readAsText(file);
        },

        // Move menu
        toggleMoveMenu(cardId) {
            this.moveMenuCardId = this.moveMenuCardId === cardId ? null : cardId;
        },

        getMoveTargets(cardId) {
            // Find which column this card is in
            let sourceColId = null;
            for (const colId in this.cards) {
                if (this.cards[colId].some(c => c.id === cardId)) {
                    sourceColId = colId;
                    break;
                }
            }

            const targets = [];
            if (sourceColId !== 'repo') {
                targets.push({ id: 'repo', name: '📚 角色庫' });
            }
            for (const config of this.teamConfigs) {
                if (config.id !== sourceColId) {
                    targets.push({ id: config.id, name: config.name });
                }
            }
            return targets;
        },

        moveCardTo(cardId, targetColumnId) {
            let card = null;
            for (const colId in this.cards) {
                const idx = this.cards[colId].findIndex(c => c.id === cardId);
                if (idx !== -1) {
                    card = this.cards[colId].splice(idx, 1)[0];
                    break;
                }
            }
            if (card) {
                if (!this.cards[targetColumnId]) this.cards[targetColumnId] = [];
                this.cards[targetColumnId].push(card);
                if (targetColumnId === 'repo') {
                    delete card.categoryOverride;
                }
                this.saveState();
                this.moveMenuCardId = null;
                this.animateCardDrop(cardId);
            }
        },

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
                this.cards[columnId].push(card);
                this.saveState();
                this.animateCardDrop(cardId);
            }
            this.clearDropIndicator();
        },

        // Drag and Drop
        dragStart(event, cardId) {
            event.dataTransfer.setData('cardId', cardId);
        },

        dragOver(event) {
            event.preventDefault();
            this.showDropIndicator(event.currentTarget, event.clientY);
        },

        showDropIndicator(columnEl, clientY) {
            let indicator = document.querySelector('.drop-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'drop-indicator';
            }

            const visibleCards = Array.from(columnEl.querySelectorAll('.card')).filter(
                c => c.style.opacity !== '0.3'
            );
            const insertIdx = this.getInsertIndex(columnEl, clientY);

            if (insertIdx < visibleCards.length) {
                columnEl.insertBefore(indicator, visibleCards[insertIdx]);
            } else {
                columnEl.appendChild(indicator);
            }
        },

        clearDropIndicator() {
            const indicator = document.querySelector('.drop-indicator');
            if (indicator) indicator.remove();
        },

        getInsertIndex(columnEl, clientY) {
            const cards = Array.from(columnEl.querySelectorAll('.card')).filter(
                c => c.style.opacity !== '0.3'
            );
            for (let i = 0; i < cards.length; i++) {
                const rect = cards[i].getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                if (clientY < centerY) return i;
            }
            return cards.length;
        },

        drop(event, targetColumnId) {
            event.preventDefault();
            const cardId = event.dataTransfer.getData('cardId');
            if (!cardId) return;

            const columnEl = event.currentTarget;
            const insertIndex = this.getInsertIndex(columnEl, event.clientY);

            // Find and remove card from source column
            let card = null;
            for (const colId in this.cards) {
                const idx = this.cards[colId].findIndex(c => c.id === cardId);
                if (idx !== -1) {
                    card = this.cards[colId].splice(idx, 1)[0];
                    break;
                }
            }

            // Insert at calculated position
            if (card) {
                if (!this.cards[targetColumnId]) this.cards[targetColumnId] = [];
                const adjustedIndex = Math.min(insertIndex, this.cards[targetColumnId].length);
                this.cards[targetColumnId].splice(adjustedIndex, 0, card);
                this.saveState();
                this.animateCardDrop(cardId);
            }
            this.clearDropIndicator();
        },

        // Touch drag and drop
        touchStart(event, cardId) {
            if (event.target.closest('.icon-btn')) return;

            const touch = event.touches[0];
            const card = event.currentTarget;
            const rect = card.getBoundingClientRect();

            this.touchDragState = {
                cardId: cardId,
                startX: touch.clientX,
                startY: touch.clientY,
                isDragging: false,
                offsetX: touch.clientX - rect.left,
                offsetY: touch.clientY - rect.top,
                originalCard: card
            };
        },

        touchMove(event) {
            if (!this.touchDragState) return;

            const touch = event.touches[0];
            const dx = touch.clientX - this.touchDragState.startX;
            const dy = touch.clientY - this.touchDragState.startY;

            if (!this.touchDragState.isDragging) {
                if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
                this.touchDragState.isDragging = true;

                const rect = this.touchDragState.originalCard.getBoundingClientRect();
                this.touchDragClone = this.touchDragState.originalCard.cloneNode(true);
                this.touchDragClone.className = 'card dragging';
                this.touchDragClone.style.width = rect.width + 'px';
                this.touchDragClone.style.left = rect.left + 'px';
                this.touchDragClone.style.top = rect.top + 'px';
                document.body.appendChild(this.touchDragClone);

                this.touchDragState.originalCard.style.opacity = '0.3';
            }

            if (this.touchDragState.isDragging) {
                event.preventDefault();
                this.touchDragClone.style.left = (touch.clientX - this.touchDragState.offsetX) + 'px';
                this.touchDragClone.style.top = (touch.clientY - this.touchDragState.offsetY) + 'px';

                this.clearDropHighlights();
                const { columnEl, categoryEl } = this.getDropTarget(touch.clientX, touch.clientY);
                const target = columnEl;
                if (target) {
                    if (target !== this.touchDragState.originalCard.closest('[data-column]')) {
                        target.classList.add('drop-hover');
                    }
                    const catCards = categoryEl ? categoryEl.querySelector('.category-cards') : null;
                    this.showDropIndicator(catCards || target, touch.clientY);
                } else {
                    this.clearDropIndicator();
                }
            }
        },

        touchEnd(event) {
            if (!this.touchDragState) return;

            if (this.touchDragState.isDragging) {
                const touch = event.changedTouches[0];
                const { columnEl, categoryEl } = this.getDropTarget(touch.clientX, touch.clientY);

                if (columnEl) {
                    const targetColumnId = columnEl.getAttribute('data-column');
                    if (targetColumnId) {
                        const insertIndex = this.getInsertIndex(columnEl, touch.clientY);

                        let card = null;
                        for (const colId in this.cards) {
                            const idx = this.cards[colId].findIndex(c => c.id === this.touchDragState.cardId);
                            if (idx !== -1) {
                                card = this.cards[colId].splice(idx, 1)[0];
                                break;
                            }
                        }
                        if (card) {
                            if (!this.cards[targetColumnId]) this.cards[targetColumnId] = [];
                            const adjustedIndex = Math.min(insertIndex, this.cards[targetColumnId].length);
                            this.cards[targetColumnId].splice(adjustedIndex, 0, card);

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

                            this.saveState();
                            this.animateCardDrop(this.touchDragState.cardId);
                        }
                    }
                }

                this.touchDragState.originalCard.style.opacity = '';
                if (this.touchDragClone) {
                    this.touchDragClone.remove();
                    this.touchDragClone = null;
                }
                this.clearDropHighlights();
                this.clearDropIndicator();
            }

            this.touchDragState = null;
        },

        getDropTarget(x, y) {
            if (this.touchDragClone) this.touchDragClone.style.display = 'none';
            let el = document.elementFromPoint(x, y);
            if (this.touchDragClone) this.touchDragClone.style.display = '';

            // Find category section first
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

        clearDropHighlights() {
            document.querySelectorAll('.drop-hover').forEach(el => {
                el.classList.remove('drop-hover');
            });
        }
    };
}

// Register as Alpine.data component (works for both external <script defer> and inline)
if (typeof document !== 'undefined') {
    document.addEventListener('alpine:init', () => {
        Alpine.data('teamApp', teamApp);
    });
}

// Export for testing (Vitest), conditional to avoid browser syntax error
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { teamApp, ROLE_CATEGORIES };
}
