const storageKey = 'teamData_v2';
let teamConfigs = [
    { id: 'team1', name: '🚩 第一隊', visible: true },
    { id: 'team2', name: '🚩 第二隊', visible: true },
    { id: 'team3', name: '🚩 第三隊', visible: true },
    { id: 'teamMobile', name: '⚡ 機動隊', visible: true }
];

// ===== :has() CSS fallback for older iOS =====
function updateCheckboxStyles() {
    document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(function (cb) {
        if (cb.checked) {
            cb.parentElement.classList.add('checked');
        } else {
            cb.parentElement.classList.remove('checked');
        }
    });
}
document.addEventListener('change', function (e) {
    if (e.target.matches('.checkbox-group input[type="checkbox"]')) {
        updateCheckboxStyles();
    }
});

// ===== localStorage with try/catch =====
function safeGetStorage(key) {
    try {
        var data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn('localStorage read failed:', e);
        return null;
    }
}

function safeSetStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('localStorage write failed:', e);
    }
}

// ===== Touch Drag and Drop System =====
var touchDragState = null;
var touchDragClone = null;
var touchDragPlaceholder = null;

function getDropTarget(x, y) {
    if (touchDragClone) touchDragClone.style.display = 'none';
    var el = document.elementFromPoint(x, y);
    if (touchDragClone) touchDragClone.style.display = '';

    while (el && !(el.id === 'repo' || el.classList.contains('column'))) {
        el = el.parentElement;
    }
    return el;
}

function clearDropHighlights() {
    document.querySelectorAll('.drop-hover').forEach(function (el) {
        el.classList.remove('drop-hover');
    });
}

function onTouchStart(e) {
    var card = e.target.closest('.card');
    if (!card) return;
    if (e.target.closest('.icon-btn')) return;

    var touch = e.touches[0];
    touchDragState = {
        card: card,
        startX: touch.clientX,
        startY: touch.clientY,
        isDragging: false,
        offsetX: 0,
        offsetY: 0
    };
}

function onTouchMove(e) {
    if (!touchDragState) return;
    var touch = e.touches[0];
    var dx = touch.clientX - touchDragState.startX;
    var dy = touch.clientY - touchDragState.startY;

    if (!touchDragState.isDragging) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        touchDragState.isDragging = true;

        var rect = touchDragState.card.getBoundingClientRect();
        touchDragState.offsetX = touch.clientX - rect.left;
        touchDragState.offsetY = touch.clientY - rect.top;

        touchDragClone = touchDragState.card.cloneNode(true);
        touchDragClone.className = 'card dragging';
        touchDragClone.style.width = rect.width + 'px';
        touchDragClone.style.left = rect.left + 'px';
        touchDragClone.style.top = rect.top + 'px';
        document.body.appendChild(touchDragClone);

        touchDragState.card.style.opacity = '0.3';
    }

    if (touchDragState.isDragging) {
        e.preventDefault();
        touchDragClone.style.left = (touch.clientX - touchDragState.offsetX) + 'px';
        touchDragClone.style.top = (touch.clientY - touchDragState.offsetY) + 'px';

        clearDropHighlights();
        var target = getDropTarget(touch.clientX, touch.clientY);
        if (target && target !== touchDragState.card.parentElement) {
            target.classList.add('drop-hover');
        }
    }
}

function onTouchEnd(e) {
    if (!touchDragState) return;

    if (touchDragState.isDragging) {
        var touch = e.changedTouches[0];
        var target = getDropTarget(touch.clientX, touch.clientY);

        if (target) {
            target.appendChild(touchDragState.card);
            updateCounts();
            saveState();
        }

        touchDragState.card.style.opacity = '';
        if (touchDragClone) {
            touchDragClone.remove();
            touchDragClone = null;
        }
        clearDropHighlights();
    }

    touchDragState = null;
}

document.addEventListener('touchstart', onTouchStart, { passive: true });
document.addEventListener('touchmove', onTouchMove, { passive: false });
document.addEventListener('touchend', onTouchEnd);

// ===== Desktop Drag and Drop =====
function allowDrop(ev) { ev.preventDefault(); }
function drag(ev) { ev.dataTransfer.setData("cardId", ev.target.id); }
function drop(ev) {
    ev.preventDefault();
    var cardId = ev.dataTransfer.getData("cardId");
    if (cardId) {
        var target = ev.target;
        while (target && !(target.id === 'repo' || target.classList.contains('column'))) { target = target.parentElement; }
        if (target) {
            target.appendChild(document.getElementById(cardId));
            updateCounts();
            saveState();
        }
    }
}

// ===== Init =====
window.onload = function () {
    var savedData = safeGetStorage(storageKey);
    if (savedData && savedData.data) {
        if (savedData.configs) {
            teamConfigs = savedData.configs.map(function (c) {
                return Object.assign({}, c, { visible: c.visible !== false });
            });
        }
        renderBoard();
        Object.keys(savedData.data).forEach(function (colId) {
            var columnEl = document.getElementById(colId);
            if (columnEl) {
                savedData.data[colId].forEach(function (char) {
                    createCard(char.name, char.jobs, char.days, colId, char.id);
                });
            }
        });
    } else {
        renderBoard();
    }
    renderSettings();
    updateCheckboxStyles();
};

function renderBoard() {
    var board = document.getElementById('mainBoard');
    board.innerHTML = '';

    var visibleTeams = teamConfigs.filter(function (t) { return t.visible !== false; });
    board.style.gridTemplateColumns = 'repeat(' + visibleTeams.length + ', 1fr)';

    teamConfigs.forEach(function (config) {
        var col = document.createElement('div');
        col.className = 'column';
        col.id = config.id;
        col.ondrop = drop;
        col.ondragover = allowDrop;

        if (config.visible === false) {
            col.style.display = 'none';
        }

        col.innerHTML =
            '<div class="column-header" style="flex-wrap: wrap;">' +
            '    <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">' +
            '        <input class="column-title" value="' + config.name + '" onchange="saveState()">' +
            '        <div class="header-actions">' +
            '            <span class="count-badge" id="count-' + config.id + '">0</span>' +
            '        </div>' +
            '    </div>' +
            '    <div id="stats-' + config.id + '" style="width:100%; font-size:0.75em; color:#ddd; margin-top:4px; display:flex; flex-wrap:wrap; gap:4px;"></div>' +
            '</div>';
        board.appendChild(col);
    });
    updateCounts();
}

function saveState() {
    var data = {};
    var allCols = ['repo'].concat(teamConfigs.map(function (t) { return t.id; }));
    allCols.forEach(function (id) {
        var col = document.getElementById(id);
        if (col) {
            data[id] = Array.from(col.querySelectorAll('.card')).map(function (c) {
                return {
                    id: c.id,
                    name: c.dataset.name,
                    jobs: JSON.parse(c.dataset.jobs),
                    days: JSON.parse(c.dataset.days)
                };
            });
        }
    });
    var configs = teamConfigs.map(function (t) {
        var el = document.querySelector('#' + t.id + ' .column-title');
        return {
            id: t.id,
            name: el ? el.value : t.name,
            visible: t.visible
        };
    });
    safeSetStorage(storageKey, { data: data, configs: configs });
    var hint = document.getElementById('saveStatus');
    hint.style.display = 'inline';
    setTimeout(function () { hint.style.display = 'none'; }, 1500);
}

function toggleSettings() {
    var div = document.getElementById('settingsSection');
    div.style.display = div.style.display === 'none' ? 'block' : 'none';
}

function renderSettings() {
    var container = document.getElementById('teamVisibilityGroup');
    container.innerHTML = '';
    teamConfigs.forEach(function (config) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="checkbox" value="' + config.id + '" ' + (config.visible !== false ? 'checked' : '') + ' onchange="updateTeamVisibility(\'' + config.id + '\')"><span>' + config.name + '</span>';
        container.appendChild(label);
    });
    updateCheckboxStyles();
}

function updateTeamVisibility(id) {
    var config = teamConfigs.find(function (c) { return c.id === id; });
    if (config) {
        config.visible = !config.visible;
        var col = document.getElementById(id);
        if (col) col.style.display = config.visible ? 'block' : 'none';

        var visibleCount = teamConfigs.filter(function (t) { return t.visible !== false; }).length;
        document.getElementById('mainBoard').style.gridTemplateColumns = 'repeat(' + visibleCount + ', 1fr)';

        saveState();
        updateCheckboxStyles();
    }
}

function createCard(name, jobs, days, targetColId, existingId) {
    var cardId = existingId || "char-" + Date.now() + Math.random().toString(16).slice(2);
    var card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.id = cardId;
    card.ondragstart = drag;
    card.dataset.name = name;
    card.dataset.jobs = JSON.stringify(jobs);
    card.dataset.days = JSON.stringify(days);

    var tags = jobs.map(function (j) {
        var cls = 'job-blue';
        if (j === '隊長') cls = 'job-red';
        else if (j === '陌刀') cls = 'job-yellow';
        else if (j === '補') cls = 'job-green';
        return '<span class="job-tag ' + cls + '">' + j + '</span>';
    }).join('');

    card.innerHTML =
        '<div class="card-btns">' +
        '    <button class="icon-btn" onclick="startEdit(\'' + cardId + '\')">✏️</button>' +
        '    <button class="icon-btn" onclick="deleteCard(\'' + cardId + '\')">✕</button>' +
        '</div>' +
        '<strong>' + name + '</strong><br>' + tags;

    document.getElementById(targetColId).appendChild(card);
    updateCounts();
}

function handleNewOrUpdateCharacter() {
    var name = document.getElementById('charName').value.trim();
    var jobs = Array.from(document.querySelectorAll('#jobGroup input:checked')).map(function (cb) { return cb.value; });
    var days = Array.from(document.querySelectorAll('#dayGroup input:checked')).map(function (cb) { return cb.value; });
    var eid = document.getElementById('editingId').value;
    if (!name || jobs.length === 0) return;

    if (eid) {
        var old = document.getElementById(eid);
        var pid = old.parentElement.id;
        old.remove();
        createCard(name, jobs, days, pid, eid);
    } else {
        createCard(name, jobs, days, 'repo');
    }
    resetForm();
    saveState();
}

function startEdit(id) {
    var c = document.getElementById(id);
    document.getElementById('charName').value = c.dataset.name;
    document.getElementById('editingId').value = id;
    var jobs = JSON.parse(c.dataset.jobs);
    document.querySelectorAll('#jobGroup input').forEach(function (cb) {
        cb.checked = jobs.includes(cb.value);
    });
    document.getElementById('cancelEdit').style.display = 'inline';
    updateCheckboxStyles();
    document.getElementById('charName').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
    document.getElementById('charName').value = '';
    document.getElementById('editingId').value = '';
    document.querySelectorAll('input:checked').forEach(function (cb) { cb.checked = false; });
    document.getElementById('cancelEdit').style.display = 'none';
    updateCheckboxStyles();
}

function deleteCard(id) {
    if (confirm("確定刪除此角色？")) {
        document.getElementById(id).remove();
        updateCounts();
        saveState();
    }
}

function updateCounts() {
    var allIds = ['repo'].concat(teamConfigs.map(function (t) { return t.id; }));
    allIds.forEach(function (id) {
        var el = document.getElementById('count-' + id);
        var col = document.getElementById(id);
        if (el && col) {
            var cards = col.querySelectorAll('.card');
            el.textContent = cards.length;

            var statsEl = document.getElementById('stats-' + id);
            if (statsEl) {
                var jobCounts = {};
                cards.forEach(function (c) {
                    var jobs = JSON.parse(c.dataset.jobs);
                    jobs.forEach(function (j) {
                        jobCounts[j] = (jobCounts[j] || 0) + 1;
                    });
                });

                var entries = Object.keys(jobCounts).map(function (job) {
                    return '<span style="background:rgba(255,255,255,0.2); padding:1px 4px; border-radius:3px; color: #555; border: 1px solid #ddd;">' + job + ':' + jobCounts[job] + '</span>';
                });
                statsEl.innerHTML = entries.length > 0 ? entries.join('') : '<span style="opacity:0.5; font-size: 0.9em;">-</span>';
            }
        }
    });
}

// Column drag (desktop only)
var draggedColId = null;
function dragColumn(ev) { draggedColId = ev.target.parentElement.id; }

var mainBoard = document.getElementById('mainBoard');
mainBoard.ondragover = function (e) { e.preventDefault(); };
mainBoard.ondrop = function (e) {
    var targetCol = e.target.closest('.column');
    if (targetCol && draggedColId && targetCol.id !== draggedColId) {
        var fromIdx = teamConfigs.findIndex(function (t) { return t.id === draggedColId; });
        var toIdx = teamConfigs.findIndex(function (t) { return t.id === targetCol.id; });
        var movedItem = teamConfigs.splice(fromIdx, 1)[0];
        teamConfigs.splice(toIdx, 0, movedItem);
        saveState();
        var savedData = safeGetStorage(storageKey);
        if (savedData && savedData.data) {
            renderBoard();
            Object.keys(savedData.data).forEach(function (colId) {
                var columnEl = document.getElementById(colId);
                if (columnEl) {
                    savedData.data[colId].forEach(function (char) {
                        createCard(char.name, char.jobs, char.days, colId, char.id);
                    });
                }
            });
        }
    }
};

function toggleImport() {
    var div = document.getElementById('importSection');
    div.style.display = div.style.display === 'none' ? 'block' : 'none';
}

function processCSV() {
    var text = document.getElementById('csvInput').value.trim();
    if (!text) return;
    var lines = text.split('\n');

    var startIdx = lines[0].includes('username') ? 1 : 0;

    for (var i = startIdx; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        var parts = line.split(',');
        if (parts.length < 2) continue;

        var name = parts[0].trim();
        var rawMsg = parts.slice(1).join(',').trim();

        var job = rawMsg;
        if (rawMsg === '99') job = '酒酒';
        else if (rawMsg === '奶') job = '補';
        else if (rawMsg === '劍劍') job = '雙劍';

        createCard(name, [job], [], 'repo');
    }

    document.getElementById('csvInput').value = '';
    toggleImport();
    saveState();
    alert('匯入完成！');
}

function downloadImage() {
    if (typeof html2canvas === 'undefined') {
        alert('截圖功能載入中，請稍後再試。');
        return;
    }
    html2canvas(document.body, { scale: 1 }).then(function (canvas) {
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && navigator.share) {
            canvas.toBlob(function (blob) {
                var file = new File([blob], 'team-distribution.png', { type: 'image/png' });
                navigator.share({ files: [file] }).catch(function () {
                    window.open(canvas.toDataURL(), '_blank');
                });
            });
        } else if (isIOS) {
            window.open(canvas.toDataURL(), '_blank');
        } else {
            var link = document.createElement('a');
            link.download = 'team-distribution.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    }).catch(function (err) {
        console.error('Screenshot failed:', err);
        alert('截圖失敗，請稍後再試。');
    });
}

function setTeamConfigs(val) { teamConfigs = val; }
function getTeamConfigs() { return teamConfigs; }

// Expose to global scope for inline onclick handlers in HTML
window.handleNewOrUpdateCharacter = handleNewOrUpdateCharacter;
window.resetForm = resetForm;
window.toggleImport = toggleImport;
window.downloadImage = downloadImage;
window.toggleSettings = toggleSettings;
window.processCSV = processCSV;
window.startEdit = startEdit;
window.deleteCard = deleteCard;
window.saveState = saveState;
window.updateTeamVisibility = updateTeamVisibility;

// Export for testing (Vitest)
export {
    storageKey,
    safeGetStorage,
    safeSetStorage,
    updateCheckboxStyles,
    createCard,
    handleNewOrUpdateCharacter,
    startEdit,
    resetForm,
    deleteCard,
    updateCounts,
    renderBoard,
    saveState,
    renderSettings,
    updateTeamVisibility,
    processCSV,
    toggleSettings,
    toggleImport,
    allowDrop,
    drag,
    drop,
    setTeamConfigs,
    getTeamConfigs,
};
