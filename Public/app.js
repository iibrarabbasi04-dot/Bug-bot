```javascript
// ==================== KEYBOARD & SIDEBAR ====================
function toggleSidebar(force) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar || !backdrop) return;
    const open = force !== undefined ? force : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('show', open);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleSidebar(false);
});

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
        const options = state.commands.map(c => <option value="${c.attackType}">${c.cmdName} (${c.platform})</option>).join('');
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
        showResult(result, 'success', ✅ SUCCESS (${elapsed}s)\n\nSent:   ${data.result.success}\nFailed: ${data.result.failed}\nTotal:  ${data.result.total});
        toast('Attack sent', 'success');
        loadStats();
    } catch (e) {
        showResult(result, 'error', ❌ ${e.message});
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
        showResult(result, 'success', ✅ COMPLETE (${elapsed}s)\n\nType: ${attackType}\nTarget: ${target}\nSent: ${data.result.success}\nFailed: ${data.result.failed});
        toast('Attack complete', 'success');
        loadStats();
    } catch (e) {
        showResult(result, 'error', ❌ Error: ${e.message});
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
        // Assuming emptyState returns a string or valid HTML element logic
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
    if (!confirm(Delete pairing +${number}?)) return;
    try {
        await apiCall('/api/pair/delete', 'POST', { number });
        toast('Pairing deleted', 'success');
        loadPairings();
    } catch (e) { 
        toast(e.message, 'error'); 
    }
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
            `;
            // Add any remaining HTML here if needed
        }
    } catch (e) {
        console.error(e);
    }
}
```
