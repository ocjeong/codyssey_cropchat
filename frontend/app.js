// ========================================
// 노지 농작물 작기 AI 비서 - 프론트엔드
// ========================================

// 설정
// window.APP_CONFIG는 config.js에서 주입됩니다 (Vercel 빌드 시 환경 변수로 치환)
const CONFIG = {
    API_BASE_URL: (window.APP_CONFIG?.API_BASE_URL && window.APP_CONFIG.API_BASE_URL !== '%%API_BASE_URL%%')
        ? window.APP_CONFIG.API_BASE_URL
        : 'http://localhost:8000',
    PAGE_SIZE: window.APP_CONFIG?.PAGE_SIZE || 20,
    TOAST_DURATION: window.APP_CONFIG?.TOAST_DURATION || 3000
};

// 전역 상태
let state = {
    currentTab: 'chat',
    dataPage: 1,
    totalDataCount: 0,
    currentDataId: null,
    selectedConversationId: null,
    conversations: [],
    isLoading: false
};

// DOM 요소 캐시
const elements = {};

// 유틸리티 함수
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

// ========================================
// 초기화
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    cacheElements();
    bindEvents();
    loadTheme();
    await initializeApp();
});

function cacheElements() {
    // 탭
    elements.tabs = $$('.nav-tab');
    elements.tabPanels = $$('.tab-panel');
    
    // 채팅
    elements.chatForm = $('#chat-form');
    elements.chatInput = $('#chat-input');
    elements.chatSubmit = $('#chat-submit');
    elements.chatMessages = $('#chat-messages');
    elements.chatLoading = $('#chat-loading');
    elements.chatStatus = $('#chat-status');
    
    // 데이터
    elements.btnAddData = $('#btn-add-data');
    elements.dataModal = $('#data-modal');
    elements.modalClose = $('#modal-close');
    elements.btnCancel = $('#btn-cancel');
    elements.dataForm = $('#data-form');
    elements.dataId = $('#data-id');
    elements.dataTableBody = $('#data-tbody');
    elements.dataSearch = $('#data-search');
    elements.totalCount = $('#total-count');
    elements.prevPage = $('#prev-page');
    elements.nextPage = $('#next-page');
    elements.pageInfo = $('#page-info');
    
    // 대화 기록
    elements.conversationList = $('#conversation-list-content');
    elements.detailTitle = $('#detail-title');
    elements.detailMessages = $('#detail-messages');
    elements.btnDeleteConversation = $('#btn-delete-conversation');
    elements.btnRefreshHistory = $('#btn-refresh-history');
    
    // 요약
    elements.summaryGrid = $('#summary-grid');
    elements.btnRefreshSummary = $('#btn-refresh-summary');
    
    // 모달 폼 필드
    elements.dataDate = $('#data-date');
    elements.dataCropType = $('#data-crop-type');
    elements.dataRegion = $('#data-region');
    elements.dataArea = $('#data-area');
    elements.dataYieldAmount = $('#data-yield-amount');
    elements.dataYieldPerHa = $('#data-yield-per-ha');
    elements.dataMemo = $('#data-memo');
    
    // 테마
    elements.themeToggle = $('#theme-toggle');
    elements.themeIcon = $('.theme-icon');
}

function bindEvents() {
    // 탭 전환
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // 채팅
    elements.chatForm.addEventListener('submit', handleChatSubmit);
    
    // 데이터 관리
    elements.btnAddData.addEventListener('click', () => openDataModal());
    elements.modalClose.addEventListener('click', closeDataModal);
    elements.btnCancel.addEventListener('click', closeDataModal);
    elements.dataForm.addEventListener('submit', handleDataSubmit);
    elements.dataModal.querySelector('.modal-overlay').addEventListener('click', closeDataModal);
    elements.dataSearch.addEventListener('input', debounce(() => loadData(1), 300));
    elements.prevPage.addEventListener('click', () => loadData(state.dataPage - 1));
    elements.nextPage.addEventListener('click', () => loadData(state.dataPage + 1));
    
    // 대화 기록
    elements.btnRefreshHistory.addEventListener('click', loadConversations);
    elements.btnDeleteConversation.addEventListener('click', handleDeleteConversation);
    
    // 요약
    elements.btnRefreshSummary.addEventListener('click', loadSummary);
    
    // 테마
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDataModal();
            closeConfirmDialog();
        }
    });
}

async function initializeApp() {
    showLoading(true);
    try {
        await Promise.all([
            loadData(1),
            loadConversations(),
            loadSummary()
        ]);
        showToast('데이터를 불러왔습니다', 'success');
    } catch (error) {
        console.error('초기화 실패:', error);
        showToast('데이터 로드에 실패했습니다', 'error');
    } finally {
        showLoading(false);
    }
}

// ========================================
// 탭 관리
// ========================================
function switchTab(tabName) {
    state.currentTab = tabName;
    
    elements.tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive);
    });
    
    elements.tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
    
    // 탭별 초기화
    if (tabName === 'history' && state.conversations.length === 0) {
        loadConversations();
    }
    if (tabName === 'summary') {
        loadSummary();
    }
}

// ========================================
// API 헬퍼
// ========================================
async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API 요청 실패 [${endpoint}]:`, error);
        throw error;
    }
}

// ========================================
// 데이터 관리
// ========================================
async function loadData(page = 1) {
    if (state.isLoading) return;
    state.isLoading = true;
    
    try {
        showTableLoading(true);
        const response = await apiRequest(`/api/data?limit=${CONFIG.PAGE_SIZE}&offset=${(page - 1) * CONFIG.PAGE_SIZE}`);
        
        renderDataTable(response);
        state.dataPage = page;
        state.totalDataCount = response.length; // 실제로는 count API 필요
        updatePagination();
    } catch (error) {
        showToast('데이터 목록을 불러오지 못했습니다', 'error');
    } finally {
        state.isLoading = false;
        showTableLoading(false);
    }
}

function renderDataTable(data) {
    elements.dataTableBody.innerHTML = '';
    
    if (!data || data.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="8" class="empty-state" style="padding: 30px;">데이터가 없습니다</td>`;
        elements.dataTableBody.appendChild(row);
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td><span class="crop-badge">${getCropLabel(item.crop_type)}</span></td>
            <td>${item.region}</td>
            <td>${item.area.toLocaleString()}</td>
            <td>${item.yield_amount.toLocaleString()}</td>
            <td>${item.yield_per_ha.toFixed(2)}</td>
            <td>${item.memo || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" data-id="${item.id}" data-action="edit">수정</button>
                    <button class="btn-delete" data-id="${item.id}" data-action="delete">삭제</button>
                </div>
            </td>
        `;
        elements.dataTableBody.appendChild(row);
    });
    
    // 이벤트 위임
    elements.dataTableBody.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const action = e.target.dataset.action;
            if (action === 'edit') openDataModal(id);
            else if (action === 'delete') confirmDeleteData(id);
        });
    });
}

function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(state.totalDataCount / CONFIG.PAGE_SIZE));
    elements.pageInfo.textContent = `${state.dataPage} / ${totalPages}`;
    elements.prevPage.disabled = state.dataPage <= 1;
    elements.nextPage.disabled = state.dataPage >= totalPages;
}

function showTableLoading(show) {
    if (show) {
        elements.dataTableBody.innerHTML = `
            <tr><td colspan="8"><div class="skeleton-row"></div></td></tr>
            <tr><td colspan="8"><div class="skeleton-row"></div></td></tr>
            <tr><td colspan="8"><div class="skeleton-row"></div></td></tr>
        `;
    }
}

// 모달 관리
function openDataModal(id = null) {
    state.currentDataId = id;
    elements.dataForm.reset();
    elements.dataId.value = '';
    
    if (id) {
        // 수정 모드
        $('#modal-title').textContent = '데이터 수정';
        loadDataForEdit(id);
    } else {
        // 추가 모드
        $('#modal-title').textContent = '데이터 추가';
        elements.dataDate.value = new Date().toISOString().split('T')[0];
    }
    
    elements.dataModal.classList.add('open');
    elements.dataDate.focus();
    document.body.style.overflow = 'hidden';
}

async function loadDataForEdit(id) {
    try {
        const data = await apiRequest(`/api/data/${id}`);
        elements.dataId.value = data.id;
        elements.dataDate.value = data.date;
        elements.dataCropType.value = data.crop_type;
        elements.dataRegion.value = data.region;
        elements.dataArea.value = data.area;
        elements.dataYieldAmount.value = data.yield_amount;
        elements.dataYieldPerHa.value = data.yield_per_ha;
        elements.dataMemo.value = data.memo || '';
    } catch (error) {
        showToast('데이터를 불러오지 못했습니다', 'error');
        closeDataModal();
    }
}

function closeDataModal() {
    elements.dataModal.classList.remove('open');
    state.currentDataId = null;
    document.body.style.overflow = '';
}

async function handleDataSubmit(e) {
    e.preventDefault();
    
    const data = {
        date: elements.dataDate.value,
        crop_type: elements.dataCropType.value,
        region: elements.dataRegion.value,
        area: parseFloat(elements.dataArea.value),
        yield_amount: parseFloat(elements.dataYieldAmount.value),
        yield_per_ha: parseFloat(elements.dataYieldPerHa.value),
        memo: elements.dataMemo.value || null
    };
    
    try {
        if (state.currentDataId) {
            await apiRequest(`/api/data/${state.currentDataId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('데이터가 수정되었습니다', 'success');
        } else {
            await apiRequest('/api/data', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('데이터가 추가되었습니다', 'success');
        }
        
        closeDataModal();
        loadData(state.dataPage);
    } catch (error) {
        showToast(error.message || '저장에 실패했습니다', 'error');
    }
}

function confirmDeleteData(id) {
    showConfirmDialog(
        '데이터를 삭제하시겠습니까?',
        '이 작업은 되돌릴 수 없습니다.',
        () => deleteData(id)
    );
}

async function deleteData(id) {
    try {
        await apiRequest(`/api/data/${id}`, { method: 'DELETE' });
        showToast('데이터가 삭제되었습니다', 'success');
        loadData(state.dataPage);
    } catch (error) {
        showToast('삭제에 실패했습니다', 'error');
    }
}

// ========================================
// 채팅
// ========================================
async function handleChatSubmit(e) {
    e.preventDefault();
    
    const message = elements.chatInput.value.trim();
    if (!message || state.isLoading) return;
    
    // 사용자 메시지 표시
    addMessage('user', message);
    elements.chatInput.value = '';
    setChatLoading(true);
    state.isLoading = true;
    
    try {
        const response = await apiRequest('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: message,
                conversation_id: state.selectedConversationId || null
            })
        });
        
        // AI 응답 표시
        addMessage('assistant', response.message);
        state.selectedConversationId = response.conversation_id;
        
        // 대화 기록 갱신
        if (state.currentTab === 'history') {
            loadConversations();
        }
    } catch (error) {
        addMessage('system', `오류: ${error.message}`);
        showToast('채팅 중 오류가 발생했습니다', 'error');
    } finally {
        setChatLoading(false);
        state.isLoading = false;
    }
}

function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    const avatar = role === 'user' ? '👤' : (role === 'system' ? '⚙️' : '🤖');
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${content.split('\n').map(p => `<p>${escapeHtml(p)}</p>`).join('')}
            <div class="message-time">${time}</div>
        </div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function setChatLoading(show) {
    elements.chatLoading.style.display = show ? 'flex' : 'none';
    elements.chatSubmit.disabled = show;
    elements.chatInput.disabled = show;
    elements.btnSendLoading.style.display = show ? 'inline' : 'none';
    elements.btnSendText.style.display = show ? 'none' : 'inline';
    
    if (show) {
        scrollToBottom();
    }
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ========================================
// 대화 기록
// ========================================
async function loadConversations() {
    try {
        const conversations = await apiRequest('/api/conversations');
        state.conversations = conversations;
        renderConversationList(conversations);
    } catch (error) {
        showToast('대화 기록을 불러오지 못했습니다', 'error');
    }
}

function renderConversationList(conversations) {
    if (!conversations || conversations.length === 0) {
        elements.conversationList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <p>대화 기록이 없습니다.</p>
                <p style="font-size: 0.8rem;">채팅 탭에서 대화를 시작해 보세요.</p>
            </div>
        `;
        return;
    }
    
    elements.conversationList.innerHTML = '';
    
    conversations.forEach(convo => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.dataset.id = convo.id;
        item.innerHTML = `
            <div class="convo-info">
                <div class="convo-title">${escapeHtml(convo.title)}</div>
                <div class="convo-last">${escapeHtml(convo.last_message || '메시지 없음')}</div>
            </div>
            <div class="convo-meta">
                <span class="convo-time">${formatDateTime(convo.updated_at)}</span>
                <span class="convo-count">${convo.message_count}개</span>
            </div>
        `;
        
        if (convo.id === state.selectedConversationId) {
            item.classList.add('active');
        }
        
        item.addEventListener('click', () => selectConversation(convo.id));
        elements.conversationList.appendChild(item);
    });
}

async function selectConversation(id) {
    state.selectedConversationId = id;
    
    // 리스트에서 활성화 표시
    $$('.conversation-item', elements.conversationList).forEach(item => {
        item.classList.toggle('active', item.dataset.id === id);
    });
    
    // 상세 조회
    try {
        const conversation = await apiRequest(`/api/conversations/${id}`);
        renderConversationDetail(conversation);
        elements.btnDeleteConversation.style.display = 'inline-flex';
    } catch (error) {
        showToast('대화를 불러오지 못했습니다', 'error');
    }
}

function renderConversationDetail(conversation) {
    elements.detailTitle.textContent = conversation.title;
    elements.detailMessages.innerHTML = '';
    
    if (!conversation.messages || conversation.messages.length === 0) {
        elements.detailMessages.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <p>메시지가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    conversation.messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const avatar = msg.role === 'user' ? '👤' : '🤖';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                ${escapeHtml(msg.content).split('\n').map(p => `<p>${p}</p>`).join('')}
                <div class="message-time">${time}</div>
            </div>
        `;
        
        elements.detailMessages.appendChild(messageDiv);
    });
    
    elements.detailMessages.scrollTop = elements.detailMessages.scrollHeight;
}

async function handleDeleteConversation() {
    if (!state.selectedConversationId) return;
    
    showConfirmDialog(
        '대화를 삭제하시겠습니까?',
        '이 작업은 되돌릴 수 없습니다.',
        async () => {
            try {
                await apiRequest(`/api/conversations/${state.selectedConversationId}`, { method: 'DELETE' });
                showToast('대화가 삭제되었습니다', 'success');
                state.selectedConversationId = null;
                elements.detailTitle.textContent = '대화를 선택하세요';
                elements.detailMessages.innerHTML = '<div class="empty-state"><p>좌측에서 대화를 선택하면 메시지가 표시됩니다.</p></div>';
                elements.btnDeleteConversation.style.display = 'none';
                loadConversations();
            } catch (error) {
                showToast('삭제에 실패했습니다', 'error');
            }
        }
    );
}

// ========================================
// 데이터 요약
// ========================================
async function loadSummary() {
    try {
        elements.summaryGrid.innerHTML = `
            <div class="summary-card skeleton" style="height: 120px;"></div>
            <div class="summary-card skeleton" style="height: 120px;"></div>
            <div class="summary-card skeleton" style="height: 120px;"></div>
            <div class="summary-card skeleton" style="height: 120px;"></div>
        `;
        
        const summary = await apiRequest('/api/data/summary');
        renderSummary(summary);
        renderCharts(summary);
    } catch (error) {
        showToast('요약 정보를 불러오지 못했습니다', 'error');
        elements.summaryGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📊</div>
                <p>데이터가 없습니다.</p>
                <p style="font-size: 0.8rem;">데이터 관리 탭에서 데이터를 추가해 주세요.</p>
            </div>
        `;
    }
}

function renderSummary(summary) {
    const trendClass = summary.trend.includes('상승') ? 'up' : 
                       summary.trend.includes('하락') ? 'down' : 'stable';
    
    const cards = [
        {
            icon: '📅',
            label: '데이터 기간',
            value: summary.period,
            sub: `${summary.count}개 레코드`
        },
        {
            icon: '🌱',
            label: '총 재배 면적',
            value: `${summary.total_area.toLocaleString()} ha`,
            sub: `총 생산량: ${summary.total_yield.toLocaleString()} 톤`
        },
        {
            icon: '📊',
            label: '평균 단위면적당 생산량',
            value: `${summary.avg_yield_per_ha.toFixed(2)} 톤/ha`,
            sub: `최대 ${summary.max_yield_per_ha.toFixed(2)} / 최소 ${summary.min_yield_per_ha.toFixed(2)}`
        },
        {
            icon: '📈',
            label: '최근 추세',
            value: `<span class="trend-badge ${trendClass}">${summary.trend}</span>`,
            sub: summary.trend_details?.change_percentage ? `변화율: ${summary.trend_details.change_percentage}%` : ''
        }
    ];
    
    elements.summaryGrid.innerHTML = '';
    
    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'summary-card';
        div.innerHTML = `
            <div class="card-icon">${card.icon}</div>
            <div class="card-label">${card.label}</div>
            <div class="card-value">${card.value}</div>
            <div class="card-sub">${card.sub}</div>
        `;
        elements.summaryGrid.appendChild(div);
    });
    
    // 작물별 분포 카드
    if (summary.crop_types && Object.keys(summary.crop_types).length > 0) {
        const cropCard = document.createElement('div');
        cropCard.className = 'summary-card wide';
        cropCard.innerHTML = `
            <div class="card-icon">🌾</div>
            <div class="card-label">작물별 레코드 분포</div>
            <div class="distribution-tags" id="crop-distribution"></div>
        `;
        elements.summaryGrid.appendChild(cropCard);
        
        const distContainer = $('#crop-distribution', cropCard);
        Object.entries(summary.crop_types)
            .sort((a, b) => b[1] - a[1])
            .forEach(([crop, count]) => {
                const tag = document.createElement('span');
                tag.className = 'dist-tag';
                tag.innerHTML = `${getCropLabel(crop)} <span class="dist-tag-count">${count}건</span>`;
                distContainer.appendChild(tag);
            });
    }
    
    // 지역별 분포 카드
    if (summary.regions && Object.keys(summary.regions).length > 0) {
        const regionCard = document.createElement('div');
        regionCard.className = 'summary-card wide';
        regionCard.innerHTML = `
            <div class="card-icon">🗺️</div>
            <div class="card-label">지역별 레코드 분포</div>
            <div class="distribution-tags" id="region-distribution"></div>
        `;
        elements.summaryGrid.appendChild(regionCard);
        
        const distContainer = $('#region-distribution', regionCard);
        Object.entries(summary.regions)
            .sort((a, b) => b[1] - a[1])
            .forEach(([region, count]) => {
                const tag = document.createElement('span');
                tag.className = 'dist-tag';
                tag.innerHTML = `${region} <span class="dist-tag-count">${count}건</span>`;
                distContainer.appendChild(tag);
            });
    }
}

function renderCharts(summary) {
    // 작물별 분포 차트
    if (summary.crop_types && Object.keys(summary.crop_types).length > 0) {
        renderCropChart(summary.crop_types);
    }
    
    // 추세 차트는 실제 데이터가 필요하므로 여기서는 간단히 구현
    renderTrendChartPlaceholder();
}

function renderCropChart(cropTypes) {
    const canvas = $('#crop-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const labels = Object.keys(cropTypes).map(getCropLabel);
    const data = Object.values(cropTypes);
    const colors = generateColors(labels.length);
    
    // 캔버스 크기 설정
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 260 * dpr;
    ctx.scale(dpr, dpr);
    
    // 기존 차트 제거
    if (canvas.chart) {
        canvas.chart.destroy();
    }
    
    // Chart.js가 없으면 간단한 막대 차트 직접 그리기
    if (typeof Chart !== 'undefined') {
        canvas.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '레코드 수',
                    data: data,
                    backgroundColor: colors.map(c => c + '80'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim(),
                        titleColor: getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim(),
                        bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim(),
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim(),
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim() },
                        ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim(), maxRotation: 45, minRotation: 45 }
                    }
                }
            }
        });
    } else {
        // Chart.js 없이 간단한 막대 차트 그리기
        drawSimpleBarChart(ctx, labels, data, colors);
    }
}

function drawSimpleBarChart(ctx, labels, data, colors) {
    const width = canvas.offsetWidth;
    const height = 260;
    const padding = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data);
    const barWidth = chartWidth / labels.length * 0.7;
    const gap = chartWidth / labels.length * 0.3;
    
    // 배경
    ctx.clearRect(0, 0, width, height);
    
    // Y축 그리기
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim();
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
    
    // X축 그리기
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // 눈금 및 막대
    ctx.font = '12px var(--font-sans)';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    data.forEach((val, i) => {
        const x = padding.left + i * (barWidth + gap) + gap / 2;
        const barHeight = (val / maxVal) * chartHeight;
        const y = padding.top + chartHeight - barHeight;
        
        // 막대
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, colors[i] + 'CC');
        gradient.addColorStop(1, colors[i] + '60');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 값 표시
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
        ctx.fillText(val.toString(), x + barWidth / 2, y - 20);
        
        // 라벨
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim();
        ctx.fillText(labels[i], x + barWidth / 2, padding.top + chartHeight + 10);
    });
}

function renderTrendChartPlaceholder() {
    const canvas = $('#trend-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 260 * dpr;
    ctx.scale(dpr, dpr);
    
    if (typeof Chart !== 'undefined') {
        // Chart.js 사용 시 추세 차트 구현
        // 여기서는 플레이스홀더로 둠
    } else {
        // 간단한 안내 텍스트
        ctx.font = '14px var(--font-sans)';
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim();
        ctx.textAlign = 'center';
        ctx.fillText('데이터가 충분해지면 추세 차트가 표시됩니다', canvas.offsetWidth / 2, 130);
    }
}

// ========================================
// 테마
// ========================================
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    elements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ========================================
// 확인 다이얼로그
// ========================================
function showConfirmDialog(title, message, onConfirm) {
    const existing = document.querySelector('.confirm-dialog');
    if (existing) existing.remove();
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-overlay"></div>
        <div class="confirm-box">
            <h4>${escapeHtml(title)}</h4>
            <p>${escapeHtml(message)}</p>
            <div class="confirm-actions">
                <button class="btn btn-secondary" id="confirm-cancel">취소</button>
                <button class="btn btn-danger" id="confirm-ok">확인</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    $('#confirm-cancel', dialog).addEventListener('click', closeConfirmDialog);
    $('#confirm-ok', dialog).addEventListener('click', () => {
        onConfirm();
        closeConfirmDialog();
    });
    $('.confirm-overlay', dialog).addEventListener('click', closeConfirmDialog);
}

function closeConfirmDialog() {
    const dialog = document.querySelector('.confirm-dialog');
    if (dialog) dialog.remove();
}

// ========================================
// 토스트 알림
// ========================================
function showToast(message, type = 'info') {
    const container = $('#toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
        </span>
        <span>${escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION);
}

// ========================================
// 로딩
// ========================================
function showLoading(show) {
    // 전역 로딩 표시가 필요한 경우 사용
}

// ========================================
// 유틸리티
// ========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getCropLabel(cropType) {
    const labels = {
        rice: '벼',
        barley: '보리',
        wheat: '밀',
        potato: '감자',
        sweet_potato: '고구마',
        corn: '옥수수',
        soybean: '콩',
        red_pepper: '고추',
        garlic: '마늘',
        onion: '양파',
        cabbage: '배추',
        radish: '무',
        other: '기타'
    };
    return labels[cropType] || cropType;
}

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function generateColors(count) {
    const baseColors = [
        '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9', '#2e7d32',
        '#66bb6a', '#388e3c', '#1b5e20', '#689f38', '#558b2f'
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

// Chart.js 전역 변수 (CDN으로 로드 시 사용)
let Chart = window.Chart || null;

// Chart.js 동적 로드 (필요시)
if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    script.onload = () => {
        Chart = window.Chart;
        // 요약이 이미 로드되었다면 차트 다시 그리기
        loadSummary();
    };
    document.head.appendChild(script);
}

console.log('🌱 노지 농작물 작기 AI 비서 초기화 완료');