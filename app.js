// ============================================
// PANEL RPA AVANZADO v2.0 - LÓGICA PRINCIPAL
// ============================================

const CONFIG = {
    updateInterval: 2000,
    statusColors: {
        'Finalizado': '#2c8f5a',
        'En proceso': '#d79a00',
        'Con error': '#cf3d2e',
        'Sin comenzar': '#617187'
    },
    statusOrder: ['Finalizado', 'En proceso', 'Con error', 'Sin comenzar']
};

const FLOW_NAMES = {
    cloud: 'Sprint CLAUD',
    uber: 'Sprint UBER',
    didi: 'Sprint DIDI',
    rappi: 'Sprint RAPPI'
};

let allRobotsData = [];
let currentRobotList = [];
let updateTimer = null;
const panelRenderCache = new Map();

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

function checkSession() {
    const user = localStorage.getItem('rpa_user');
    if (user && AUTH.robots[user]) {
        showDashboard();
        buildPanels(AUTH.robots[user]);
        loadAllData();
        startAutoUpdate();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard-screen').classList.add('hidden');
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
}

// ============================================
// MANEJO DE LOGIN CON SHA-256
// ============================================

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const user = document.getElementById('user-select').value;
    const password = document.getElementById('password-input').value;
    const errorDiv = document.getElementById('login-error');
    
    if (!user) {
        showLoginError('Selecciona un usuario');
        return;
    }
    
    const storedHash = AUTH.users[user];
    if (storedHash) {
        const inputHash = await hashPassword(password);
        if (inputHash === storedHash) {
            localStorage.setItem('rpa_user', user);
            errorDiv.classList.add('hidden');
            showDashboard();
            buildPanels(AUTH.robots[user]);
            loadAllData();
            startAutoUpdate();
            return;
        }
    }
    
    showLoginError('Usuario o contraseña incorrectos');
});

function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

document.getElementById('logout-button').addEventListener('click', function() {
    localStorage.removeItem('rpa_user');
    allRobotsData = [];
    panelRenderCache.clear();
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
    showLogin();
});

// ============================================
// CONSTRUIR PANELES DINÁMICOS
// ============================================

function buildPanels(robotList) {
    const container = document.getElementById('panels-container');
    container.innerHTML = '';
    currentRobotList = [...robotList];
    
    robotList.forEach((robotId, index) => {
        const panelId = `panel-${index}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'panel-wrapper is-collapsed';
        wrapper.innerHTML = `
            <button
                type="button"
                class="panel-header"
                aria-expanded="false"
                aria-controls="${panelId}-content"
            >
                <span class="panel-header-main">
                    <span class="panel-title-block">
                        <h2 id="${panelId}-name">${escapeHtml(getFlowDisplayName(robotId))}</h2>
                        <span class="panel-meta-row">
                            <span class="panel-meta" id="${panelId}-duration">Duracion: --:--:--</span>
                            <span class="panel-meta" id="${panelId}-started">Inicio: --</span>
                        </span>
                    </span>
                </span>
                <span class="panel-header-side">
                    <span class="panel-toggle-icon" aria-hidden="true"></span>
                </span>
            </button>
            <div class="panel-body hidden" id="${panelId}-content">
                <div class="panel-table">
                    <table>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Nombre del paso</th>
                                <th>Estado</th>
                                <th>Descripción</th>
                                <th>Actualizado</th>
                            </tr>
                        </thead>
                        <tbody id="${panelId}-body"></tbody>
                    </table>
                </div>
                <div class="panel-chart">
                    <div class="pie-chart" id="${panelId}-chart">
                        <div class="pie-core">
                            <strong id="${panelId}-total">0</strong>
                            <span>pasos</span>
                        </div>
                    </div>
                    <ul class="panel-legend" id="${panelId}-legend">
                        <li><span class="legend-dot" style="background:#2c8f5a"></span><span>Finalizado</span><strong id="${panelId}-finalizado">0</strong></li>
                        <li><span class="legend-dot" style="background:#d79a00"></span><span>En proceso</span><strong id="${panelId}-en-proceso">0</strong></li>
                        <li><span class="legend-dot" style="background:#cf3d2e"></span><span>Con error</span><strong id="${panelId}-con-error">0</strong></li>
                        <li><span class="legend-dot" style="background:#617187"></span><span>Sin comenzar</span><strong id="${panelId}-sin-comenzar">0</strong></li>
                    </ul>
                </div>
            </div>
        `;
        container.appendChild(wrapper);

        const header = wrapper.querySelector('.panel-header');
        const body = wrapper.querySelector('.panel-body');
        header.addEventListener('click', () => togglePanel(wrapper, header, body));
    });
    
    document.getElementById('process-name').textContent =
        robotList.length > 1
            ? 'Sprints asignados'
            : getFlowDisplayName(robotList[0]);
}

function togglePanel(wrapper, header, body) {
    const isCollapsed = wrapper.classList.contains('is-collapsed');
    wrapper.classList.toggle('is-collapsed', !isCollapsed);
    header.setAttribute('aria-expanded', String(isCollapsed));
    body.classList.toggle('hidden', !isCollapsed);
}

// ============================================
// CARGA DE DATOS
// ============================================

async function loadAllData(showSuccess = false) {
    const user = localStorage.getItem('rpa_user');
    if (!user) return;
    
    const dashboard = document.getElementById('dashboard-screen');
    if (dashboard.classList.contains('hidden')) return;
    
    const robotList = AUTH.robots[user];
    if (!robotList) return;

    const previousRobotsData = Array.isArray(allRobotsData) ? [...allRobotsData] : [];
    const nextRobotsData = new Array(robotList.length).fill(null);
    
    for (let i = 0; i < robotList.length; i++) {
        try {
            const data = await fetchRobotData(robotList[i]);
            nextRobotsData[i] = data;
            renderPanel(i, data);
        } catch (error) {
            console.error(`Error cargando ${robotList[i]}:`, error.message);
            const fallbackData = previousRobotsData[i];
            if (fallbackData && Array.isArray(fallbackData.steps)) {
                nextRobotsData[i] = fallbackData;
                renderPanel(i, fallbackData);
            } else {
                renderPanelEmpty(i);
            }
        }
    }

    allRobotsData = nextRobotsData.filter(data => data && Array.isArray(data.steps));
    
    updateGlobalSummary();
    
    if (showSuccess) {
        showNotice('Actualizado', 'Datos recargados correctamente.', 'success');
    }
}

async function fetchRobotData(robotId) {
    const response = await fetch(`data/${robotId}.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Error ' + response.status);
    
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Archivo vacío');
    
    let lastMatch = null;
    let depth = 0;
    let start = -1;
    
    for (let i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (trimmed[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                lastMatch = trimmed.substring(start, i + 1);
            }
        }
    }
    
    if (!lastMatch) throw new Error('No se encontró JSON');
    
    const data = JSON.parse(lastMatch);
    if (!data.steps || !Array.isArray(data.steps)) throw new Error('Formato inválido');
    
    return data;
}

// ============================================
// RENDERIZAR PANEL
// ============================================

function renderPanel(index, data) {
    const panelId = `panel-${index}`;
    const robotId = currentRobotList[index];
    
    document.getElementById(`${panelId}-name`).textContent = getFlowDisplayName(robotId);
    updatePanelMeta(panelId, data);
    if (currentRobotList.length === 1 && robotId) {
        document.getElementById('process-name').textContent = getFlowDisplayName(robotId);
    }
    
    const filteredSteps = filterStepsGlobal(data.steps);
    renderPanelTable(panelId, filteredSteps);
    updatePanelChart(panelId, calculateSummary(filteredSteps));
}

function renderPanelEmpty(index) {
    const panelId = `panel-${index}`;
    const robotId = currentRobotList[index];
    document.getElementById(`${panelId}-name`).textContent = getFlowDisplayName(robotId);
    updatePanelMeta(panelId, null);
    panelRenderCache.delete(`${panelId}-table`);
    panelRenderCache.delete(`${panelId}-chart`);
    document.getElementById(`${panelId}-body`).innerHTML = `
        <tr><td colspan="5" class="empty-state">Esperando datos del robot...</td></tr>
    `;
    updatePanelChart(panelId, {});
}

function updatePanelMeta(panelId, data) {
    const durationEl = document.getElementById(`${panelId}-duration`);
    const startedEl = document.getElementById(`${panelId}-started`);
    const duration = data && data.durationLabel ? data.durationLabel : '--:--:--';
    const startedAt = data && data.startedAt ? data.startedAt : '--';

    if (durationEl) durationEl.textContent = `Duracion: ${duration}`;
    if (startedEl) startedEl.textContent = `Inicio: ${startedAt}`;
}

function renderPanelTable(panelId, steps) {
    const tbody = document.getElementById(`${panelId}-body`);
    
    if (steps.length === 0) {
        panelRenderCache.delete(`${panelId}-table`);
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay pasos</td></tr>';
        return;
    }

    Array.from(tbody.querySelectorAll('tr:not([data-step-key])')).forEach(row => row.remove());

    const existingRows = new Map(
        Array.from(tbody.querySelectorAll('tr[data-step-key]')).map(row => [row.dataset.stepKey, row])
    );

    steps.forEach((step, index) => {
        const stepKey = getStepKey(step, index);
        const stepSignature = getStepSignature(step);
        let row = existingRows.get(stepKey);

        if (!row) {
            row = createPanelStepRow(stepKey);
        }

        if (row.dataset.signature !== stepSignature) {
            updatePanelStepRow(row, step, stepSignature);
        }

        const referenceRow = tbody.children[index] || null;
        if (referenceRow !== row) {
            tbody.insertBefore(row, referenceRow);
        }

        existingRows.delete(stepKey);
    });

    existingRows.forEach(row => row.remove());
    panelRenderCache.set(`${panelId}-table`, steps.map(getStepSignature).join('||'));
}

function updatePanelChart(panelId, summary) {
    const summarySignature = CONFIG.statusOrder.map(status => `${status}:${summary[status] || 0}`).join('|');
    if (panelRenderCache.get(`${panelId}-chart`) === summarySignature) {
        return;
    }

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    const safeTotal = Math.max(total, 1);
    
    const chart = document.getElementById(`${panelId}-chart`);
    let start = 0;
    const segments = CONFIG.statusOrder
        .filter(s => summary[s] > 0)
        .map(s => {
            const size = (summary[s] / safeTotal) * 100;
            const end = start + size;
            const seg = `${CONFIG.statusColors[s]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
            start = end;
            return seg;
        });
    
    chart.style.background = segments.length === 0 ? '#e0e0e0' : `conic-gradient(${segments.join(', ')})`;
    
    document.getElementById(`${panelId}-total`).textContent = total;
    
    CONFIG.statusOrder.forEach(status => {
        const key = status.toLowerCase().replace(/\s+/g, '-');
        const el = document.getElementById(`${panelId}-${key}`);
        if (el) el.textContent = summary[status] || 0;
    });

    panelRenderCache.set(`${panelId}-chart`, summarySignature);
}

function updateGlobalSummary() {
    let totalSteps = 0;
    
    allRobotsData.forEach(data => {
        if (data.steps) totalSteps += data.steps.length;
    });
    
    const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let dbTime = '--:--:--';
    if (allRobotsData.length > 0) {
        const lastData = allRobotsData[allRobotsData.length - 1];
        dbTime = lastData.lastDatabaseUpdate || lastData.lastUpdated || '--:--:--';
    }
    
    document.getElementById('total-steps').textContent = totalSteps;
    document.getElementById('last-updated').textContent = ahora;
    document.getElementById('last-db-updated').textContent = dbTime;
}

// ============================================
// FILTROS Y BÚSQUEDA
// ============================================

function filterStepsGlobal(steps) {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    const selectedStatus = document.getElementById('status-filter').value;
    
    return steps.filter(step => {
        const matchesText = !query || 
            step.step_name.toLowerCase().includes(query) ||
            step.description.toLowerCase().includes(query) ||
            String(step.step_number).includes(query);
        const matchesStatus = selectedStatus === 'Todos' || step.status === selectedStatus;
        return matchesText && matchesStatus;
    });
}

function renderAllPanels() {
    allRobotsData.forEach((data, index) => {
        if (data && data.steps) {
            renderPanel(index, data);
        }
    });
}

// ============================================
// ACTUALIZACIÓN AUTOMÁTICA
// ============================================

function startAutoUpdate() {
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(() => {
        const user = localStorage.getItem('rpa_user');
        if (!user) {
            clearInterval(updateTimer);
            updateTimer = null;
            return;
        }
        const dashboard = document.getElementById('dashboard-screen');
        if (dashboard.classList.contains('hidden')) return;
        loadAllData(false);
    }, CONFIG.updateInterval);
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function calculateSummary(steps) {
    const summary = {'Finalizado': 0, 'En proceso': 0, 'Con error': 0, 'Sin comenzar': 0};
    steps.forEach(step => {
        if (summary[step.status] !== undefined) summary[step.status]++;
    });
    return summary;
}

function normalizeDescriptionText(value) {
    return String(value || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ')
        .trim();
}

function getErrorSummaryText(text) {
    const normalized = normalizeDescriptionText(text);
    const primaryBlock = normalized
        .split(/\n{2,}/)
        .map(block => block.replace(/\s+/g, ' ').trim())
        .find(Boolean) || normalized.replace(/\s+/g, ' ').trim();

    let summary = primaryBlock;
    const objectiveIndex = summary.indexOf('[Objetivo]');
    if (objectiveIndex > 0) {
        summary = summary.slice(0, objectiveIndex).trim();
    }

    if (summary.length > 180) {
        summary = `${summary.slice(0, 177).trimEnd()}...`;
    }

    return summary || 'Se detecto un error en este paso.';
}

function getStepKey(step, index) {
    const baseKey = step && step.step_number !== undefined ? String(step.step_number) : String(index + 1);
    return `step-${baseKey}`;
}

function getStepSignature(step) {
    return [
        step.step_number,
        step.step_name,
        step.status,
        step.description,
        step.updated_at || '--'
    ].join('|');
}

function createPanelStepRow(stepKey) {
    const row = document.createElement('tr');
    row.className = 'panel-step-row';
    row.dataset.stepKey = stepKey;

    for (let i = 0; i < 5; i++) {
        row.appendChild(document.createElement('td'));
    }

    return row;
}

function updatePanelStepRow(row, step, signature) {
    const cells = row.children;
    cells[0].textContent = step.step_number;
    cells[1].textContent = step.step_name;
    cells[2].innerHTML = `<span class="status-pill ${getStatusClass(step.status)}">${escapeHtml(step.status)}</span>`;
    renderDescriptionCell(cells[3], step);
    cells[4].textContent = step.updated_at || '--';
    row.dataset.signature = signature;
}

function renderDescriptionCell(cell, step) {
    const description = step && step.description ? String(step.description) : '';
    const normalizedDescription = normalizeDescriptionText(description);

    cell.innerHTML = '';

    if (step && step.status === 'Con error' && normalizedDescription) {
        const summaryText = getErrorSummaryText(normalizedDescription);
        const summary = document.createElement('div');
        summary.className = 'error-summary';
        summary.textContent = summaryText;
        cell.appendChild(summary);
        return;
    }

    const text = document.createElement('span');
    text.className = 'description-text';
    text.textContent = normalizedDescription || '--';
    cell.appendChild(text);
}

function getFlowDisplayName(robotId) {
    return FLOW_NAMES[robotId] || (robotId ? robotId.toUpperCase() : 'Panel RPA Servicios');
}

function getStatusClass(status) {
    const classes = {
        'Finalizado': 'status-finalizado',
        'En proceso': 'status-proceso',
        'Con error': 'status-error',
        'Sin comenzar': 'status-pendiente'
    };
    return classes[status] || 'status-pendiente';
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showNotice(title, message, type) {
    const notice = document.getElementById('db-notice');
    document.getElementById('notice-title').textContent = title;
    document.getElementById('notice-message').textContent = message;
    notice.className = `notice-card ${type}`;
    notice.classList.remove('hidden');
    setTimeout(() => notice.classList.add('hidden'), 3000);
}

// ============================================
// EVENT LISTENERS
// ============================================

document.getElementById('search-input').addEventListener('input', renderAllPanels);
document.getElementById('status-filter').addEventListener('change', renderAllPanels);
document.getElementById('refresh-button').addEventListener('click', () => loadAllData(true));

// ============================================
// INICIALIZACIÓN
// ============================================

checkSession();
