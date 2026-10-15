// ============================================
// ziddi BUG VIA WEB — Frontend Logic
// ============================================

const CONFIG = {
    REFRESH_INTERVAL: 30000,
    TOAST_DURATION: 3000,
    MAX_LOGS: 100
};

const state = {
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    commands: [],
    pairings: [],
    adminSessions: [],
    adminUsers: [],
    currentPage: 'dashboard',
    loading: false
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    if (!state.token) {
        window.location.href = '/login';
        return;
    }
    setupNavigation();
    setupKeyboard();
    loadUser();
    loadAll();
    setInterval(() => {
        if (!state.loading) loadStats();
    }, CONFIG.REFRESH_INTERVAL);
});

// ==================== AUTH ====================
async function loadUser() {
    try {
        const data = await apiCall('/api/auth/me');
        state.user = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        renderUserInfo();
    } catch (e) {
        if (e.message.includes('401') || e.message.includes('Invalid')) logout();
    }
}

function renderUserInfo() {
    const u = state.user;
    if (!u) return;

    setText('sidebarUsername', u.username);
    setText('sidebarAvatar', (u.username[0] || 'U').toUpperCase());

    const tierEl = document.getElementById('sidebarTier');
    if (tierEl) {
        tierEl.textContent = u.tier.toUpperCase();
        tierEl.className = 'user-tier ' + u.tier;
    }

    setText('infoUsername', u.username);
    setText('infoTier', u.tier.toUpperCase());
    setText('tierChip', u.tier.toUpperCase());

    const adminGroup = document.getElementById('adminGroup');
    if (adminGroup) adminGroup.style.display = u.tier === 'admin' ? '' : 'none';

    let rule = '';
    if (u.tier === 'admin') rule = 'All sessions (admin)';
    else if (u.tier === 'premium') rule = 'Bot sessions (no pairing)';
    else if (u.tier === 'reseller') rule = 'Bot sessions (reseller)';
    else rule = 'Must pair your WhatsApp';
    setText('infoRule', rule);
}

// ==================== API ====================
async function apiCall(endpoint, method = 'GET', body = null) {
    if (!state.token) { logout(); throw new Error('No token'); }
    const opts = {
        method,
        headers: {
            'Authorization': 'Bearer ' + state.token,
            'Content-Type': 'application/json'
        }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(endpoint, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// ==================== NAVIGATION ====================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });
}

function navigateTo(page) {
    if (!page) return;
    state.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(l =>
        l.classList.toggle('active', l.dataset.page === page)
    );
    document.querySelectorAll('.page').forEach(p =>
        p.classList.toggle('active', p.id === `view-${page}`)
    );

    const titles = {
        dashboard: ['Dashboard', 'Overview & quick actions'],
        attack: ['Attack', 'Full attack configuration'],
        pairing: ['My Pairings', 'Manage your WhatsApp sessions'],
        premium: ['Premium', 'Upgrade your account'],
        'admin-sessions': ['All Sessions', 'Manage all paired WhatsApp numbers'],
        'admin-users': ['Users', 'Manage all users'],
        'admin-logs': ['Logs', 'Recent API activity']
    };
    const [t, s] = titles[page] || ['Dashboard', ''];
    setText('pageTitle', t);
    setText('pageSubtitle', s);
    document.body.dataset.page = page;

    if (window.innerWidth <= 768) toggleSidebar(false);

    if (page === 'pairing') loadPairings();
    if (page === 'admin-sessions') loadAdminSessions();
    if (page === 'admin-users') loadAdminUsers();
    if (page === 'admin-logs') loadLogs();
}

function toggleSidebar(force) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar || !backdrop) return;
    const open = force !== undefined ? force : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('show', open);
}

// ==================== KEYBOARD ====================
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') toggleSidebar(false);
    });
}

// ==================== LOAD ALL ====================
async function loadAll() {
    await Promise.all([loadStats(), loadCommands()]);
}

async function loadStats() {
    try {
        const data = await apiCall('/api/stats');
        setText('statUserSessions', data.userSessions);
        setText('statTotalAttacks', data.totalAttacks);
        setText('statBotSessions', data.botSessions);
    } catch (e) { console.error(e); }
}

async function loadCommands() {
    try {
        const data = await apiCall('/api/commands');
        state.commands = data.commands || [];
        const options = state.commands.map(c =>
            `<option value="${c.attackType}">${c.cmdName} (${c.platform})</option>`
        ).join('');
        const q = document.getElementById('quickAttackType');
        const a = document.getElementById('attackType');
        if (q) q.innerHTML = options;
        if (a) a.innerHTML = options;
    } catch (e) { console.error(e); }
}

// ==================== ATTACK ====================
async function quickAttack(event) {
    const attackType = document.getElementById('quickAttackType').value;
    const target = document.getElementById('quickTarget').value.trim();
    const count = parseInt(document.getElementById('quickCount').value);
    const result = document.getElementById('quickResult');
    const btn = event?.target;

    if (!target) return toast('Enter target number', 'error');

    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳';
    showResult(result, 'info', '⏳ Sending attack...');
    const start = Date.now();

    try {
        const data = await apiCall('/api/attack', 'POST', { attackType, target, count });
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        showResult(result, 'success',
            `✅ SUCCESS (${elapsed}s)\n\nSent:   ${data.result.success}\nFailed: ${data.result.failed}\nTotal:  ${data.result.total}`
        );
        toast('Attack sent', 'success');
        loadStats();
    } catch (e) {
        showResult(result, 'error', `❌ ${e.message}`);
        toast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

async function sendAttack(event) {
    const attackType = document.getElementById('attackType').value;
    const target = document.getElementById('attackTarget').value.trim();
    const count = parseInt(document.getElementById('attackCount').value);
    const result = document.getElementById('attackResult');
    const btn = event?.target;

    if (!target) return toast('Enter target number', 'error');

    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳ Executing...';
    showResult(result, 'info', '⏳ Executing attack...');
    const start = Date.now();

    try {
        const data = await apiCall('/api/attack', 'POST', { attackType, target, count });
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        showResult(result, 'success',
            `✅ COMPLETE (${elapsed}s)\n\nType:   ${attackType}\nTarget: ${target}\nSent:   ${data.result.success}\nFailed: ${data.result.failed}`
        );
        toast('Attack complete', 'success');
        loadStats();
    } catch (e) {
        showResult(result, 'error', `❌ ${e.message}`);
        toast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

// ==================== PAIRING ====================
async function loadPairings() {
    try {
        const data = await apiCall('/api/pair/sessions');
        state.pairings = data.sessions || [];
        renderPairings();
        setText('badgePairings', state.pairings.length);
        setText('statUserSessions', state.pairings.length);
    } catch (e) { console.error(e); }
}

function renderPairings() {
    const el = document.getElementById('pairingList');
    if (!el) return;
    if (state.pairings.length === 0) {
        el.innerHTML = emptyState('📱', 'No pairings', 'Pair your WhatsApp to start attacking');
        return;
    }
    el.innerHTML = state.pairings.map(p => `
        <div class="list-item">
            <div class="list-content">
                <div class="list-title">📱 +${p.number}</div>
                <div class="list-sub">Status: Connected</div>
            </div>
            <div class="list-actions">
                <button class="list-btn danger" onclick="deletePairing('${p.number}')" title="Delete">🗑</button>
            </div>
        </div>
    `).join('');
}

async function requestPair(event) {
    const number = document.getElementById('pairNumber').value.trim();
    const display = document.getElementById('pairCodeDisplay');
    const btn = event?.target;

    if (!number) return toast('Enter number', 'error');

    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳ Requesting...';

    try {
        const data = await apiCall('/api/pair/request', 'POST', { number });
        display.className = 'pair-code show';
        display.innerHTML = `
            <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;font-weight:700;">Pair Code</div>
            <div class="pair-code-value">${data.code}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:8px;">Enter this in WhatsApp → Linked Devices</div>
        `;
        toast('Pair code generated', 'success');
    } catch (e) {
        toast(e.message, 'error');
        display.className = 'pair-code';
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

async function deletePairing(number) {
    if (!confirm(`Delete pairing +${number}?`)) return;
    try {
        await apiCall('/api/pair/delete', 'POST', { number });
        toast('Pairing deleted', 'success');
        loadPairings();
    } catch (e) { toast(e.message, 'error'); }
}

// ==================== ADMIN SESSIONS (WITH ALL FUNCTIONS) ====================
async function loadAdminSessions() {
    try {
        const data = await apiCall('/api/admin/sessions/full');
        state.adminSessions = data.sessions || [];

        // Render session stats cards
        const statsEl = document.getElementById('sessionStats');
        if (statsEl) {
            const uniqueUsers = [...new Set(state.adminSessions.map(s => s.chatId))].length;
            statsEl.innerHTML = `
                <div class="session-stat">
                    <span class="session-stat-label">Total Sessions</span>
                    <span class="session-stat-value blue">${data.total || 0}</span>
                </div>
                <div class="session-stat">
                    <span class="session-stat-label">Connected</span>
                    <span class="session-stat-value green">${data.connected || 0}</span>
                </div>
                <div class="session-stat">
                    <span class="session-stat-label">Disconnected</span>
                    <span class="session-stat-value red">${data.disconnected || 0}</span>
                </div>
                <div class="session-stat">
                    <span class="session-stat-label">Users</span>
                    <span class="session-stat-value purple">${uniqueUsers}</span>
                </div>
            `;
        }

        renderAdminSessions();
        setText('badgeBotSessions', data.total || 0);
        setText('statBotSessions', data.total || 0);
    } catch (e) {
        console.error(e);
        toast(e.message, 'error');
    }
}

function renderAdminSessions() {
    const el = document.getElementById('adminSessionsList');
    if (!el) return;

    if (state.adminSessions.length === 0) {
        el.innerHTML = emptyState('🔗', 'No sessions', 'No WhatsApp numbers paired yet');
        return;
    }

    el.innerHTML = state.adminSessions.map(s => {
        const statusClass = s.connected ? 'connected' : 'disconnected';
        const statusText = s.connected ? 'Connected' : 'Disconnected';
        const statusIcon = s.connected ? '🟢' : '🔴';
        const sizeKb = (s.size / 1024).toFixed(1);
        const modDate = new Date(s.modifiedAt).toLocaleDateString();
        const modTime = new Date(s.modifiedAt).toLocaleTimeString();
        const createdDate = new Date(s.createdAt).toLocaleDateString();

        return `
            <div class="session-card ${statusClass}">
                <div class="session-head">
                    <div class="session-number">
                        <div class="session-number-main">📱 +${s.number}</div>
                        <div class="session-number-sub">
                            <span>👤 ${escapeHtml(s.userName)}</span>
                            <span>·</span>
                            <span>ID: ${s.chatId}</span>
                        </div>
                    </div>
                    <div class="session-status ${statusClass}">
                        <span class="session-status-dot"></span>
                        <span>${statusIcon} ${statusText}</span>
                    </div>
                </div>

                <div class="session-meta">
                    <div class="session-meta-item">
                        <span class="session-meta-key">Modified</span>
                        <span class="session-meta-val">${modDate} ${modTime}</span>
                    </div>
                    <div class="session-meta-item">
                        <span class="session-meta-key">Created</span>
                        <span class="session-meta-val">${createdDate}</span>
                    </div>
                    <div class="session-meta-item">
                        <span class="session-meta-key">Size</span>
                        <span class="session-meta-val">${sizeKb} KB</span>
                    </div>
                    <div class="session-meta-item">
                        <span class="session-meta-key">Registered</span>
                        <span class="session-meta-val">${s.registered ? 'Yes' : 'No'}</span>
                    </div>
                </div>

                <div class="session-actions">
                    <button class="session-action-btn restart" onclick="restartSession('${s.chatId}', '${s.number}')">
                        🔄 Restart
                    </button>
                    <button class="session-action-btn delete" onclick="deleteSession('${s.chatId}', '${s.number}')">
                        🗑 Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function restartSession(chatId, number) {
    if (!confirm(`Restart session +${number}?\n\nThe bot will reconnect this WhatsApp session.`)) return;
    try {
        const data = await apiCall('/api/admin/sessions/restart', 'POST', { chatId, number });
        toast(data.message || 'Restart signal sent', 'success');
        setTimeout(() => loadAdminSessions(), 2000);
    } catch (e) { toast(e.message, 'error'); }
}

async function deleteSession(chatId, number) {
    if (!confirm(`Delete session +${number}?\n\nThis will disconnect WhatsApp permanently!`)) return;
    try {
        await apiCall('/api/admin/sessions/delete-full', 'POST', { chatId, number });
        toast('Session deleted', 'success');
        loadAdminSessions();
    } catch (e) { toast(e.message, 'error'); }
}

// ==================== ADMIN USERS ====================
async function loadAdminUsers() {
    try {
        const data = await apiCall('/api/admin/users');
        state.adminUsers = data.users || [];
        renderAdminUsers();
        setText('badgeUsers', state.adminUsers.length);
    } catch (e) { console.error(e); }
}

function renderAdminUsers() {
    const el = document.getElementById('adminUsersList');
    if (!el) return;
    if (state.adminUsers.length === 0) {
        el.innerHTML = emptyState('👥', 'No users', '');
        return;
    }
    el.innerHTML = state.adminUsers.map(u => `
        <div class="list-item">
            <div class="list-content">
                <div class="list-title">
                    👤 ${escapeHtml(u.username)}
                    <span class="stat-chip">${u.tier.toUpperCase()}</span>
                </div>
                <div class="list-sub">
                    Attacks: ${u.totalAttacks} · ID: ${u.id}
                </div>
            </div>
            <div class="list-actions">
                ${u.tier === 'free'
                    ? `<button class="list-btn" onclick="promptPremium('${u.id}')" title="Make Premium">💎</button>`
                    : `<button class="list-btn" onclick="removePremium('${u.id}')" title="Remove Premium">⬇</button>`
                }
                <button class="list-btn danger" onclick="deleteUser('${u.id}')" title="Delete">🗑</button>
            </div>
        </div>
    `).join('');
}

async function promptPremium(userId) {
    const duration = prompt('Duration (30d, 12h, perm):', '30d');
    if (!duration) return;
    try {
        await apiCall('/api/admin/premium/add', 'POST', { userId, duration });
        toast('Premium added', 'success');
        loadAdminUsers();
    } catch (e) { toast(e.message, 'error'); }
}

async function removePremium(userId) {
    if (!confirm('Remove premium?')) return;
    try {
        await apiCall('/api/admin/premium/remove', 'POST', { userId });
        toast('Premium removed', 'success');
        loadAdminUsers();
    } catch (e) { toast(e.message, 'error'); }
}

async function deleteUser(userId) {
    if (!confirm('Delete user permanently?')) return;
    try {
        await apiCall('/api/admin/user/delete', 'POST', { userId });
        toast('User deleted', 'success');
        loadAdminUsers();
    } catch (e) { toast(e.message, 'error'); }
}

// ==================== LOGS ====================
async function loadLogs() {
    try {
        const data = await apiCall('/api/logs');
        const el = document.getElementById('logsList');
        if (!el) return;
        if (!data.logs || data.logs.length === 0) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">📜</div><div class="empty-title">No logs</div></div>';
            return;
        }
        el.innerHTML = data.logs.slice(-CONFIG.MAX_LOGS).reverse().map(line => {
            let cls = 'log-line';
            if (line.includes('[ERROR]')) cls += ' error';
            else if (line.includes('[WARN]')) cls += ' warn';
            else if (line.includes('[INFO]')) cls += ' info';
            const esc = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<div class="${cls}">${esc}</div>`;
        }).join('');
    } catch (e) { console.error(e); }
}

// ==================== HELPERS ====================
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function showResult(el, type, text) {
    if (!el) return;
    el.className = `result show ${type}`;
    el.textContent = text;
}

function emptyState(icon, title, text) {
    return `<div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <div class="empty-title">${title}</div>
        ${text ? `<div class="empty-text">${text}</div>` : ''}
    </div>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.className = `toast show ${type}`;
    el.textContent = msg;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), CONFIG.TOAST_DURATION);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Global
window.quickAttack = quickAttack;
window.sendAttack = sendAttack;
window.requestPair = requestPair;
window.deletePairing = deletePairing;
window.restartSession = restartSession;
window.deleteSession = deleteSession;
window.promptPremium = promptPremium;
window.removePremium = removePremium;
window.deleteUser = deleteUser;
window.loadPairings = loadPairings;
window.loadAdminSessions = loadAdminSessions;
window.loadAdminUsers = loadAdminUsers;
window.loadLogs = loadLogs;
window.logout = logout;
window.toggleSidebar = toggleSidebar; 
