// === Home.js: لوحة التحكم الرئيسية المتطورة (مضغوطة للجوال) ===

let homeChart1 = null;
let homeChart2 = null;
let homeChart3 = null;

function initHomeDashboard() {
    renderHomeStyles();
    const tab1 = document.getElementById('tab1');
    
    tab1.innerHTML = `
        <div class="home-container">
            <!-- شريط العنوان والتاريخ -->
            <div class="home-header">
                <div class="header-left">
                    <h3 class="home-title">📊 لوحة التحكم</h3>
                    <span class="home-date">${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="header-right">
                    <button onclick="refreshDashboard()" class="refresh-btn" title="تحديث">🔄</button>
                    <button onclick="showHomeTrialBalance()" class="tb-btn-mini">ميزان مراجعة</button>
                </div>
            </div>

            <!-- البطاقات الرئيسية (4 بطاقات صغيرة) -->
            <div class="cards-grid-mini">
                <div class="mini-card cash-card">
                    <div class="card-icon">💵</div>
                    <div class="card-content">
                        <span class="card-label">النقدية</span>
                        <span class="card-value" id="cardCash">0</span>
                        <span class="card-change" id="cardCashChange">0%</span>
                    </div>
                </div>
                
                <div class="mini-card profit-card">
                    <div class="card-icon">📈</div>
                    <div class="card-content">
                        <span class="card-label">صافي الربح</span>
                        <span class="card-value" id="cardProfit">0</span>
                        <span class="card-change" id="cardProfitChange">0%</span>
                    </div>
                </div>
                
                <div class="mini-card sales-card">
                    <div class="card-icon">🛒</div>
                    <div class="card-content">
                        <span class="card-label">الإيرادات</span>
                        <span class="card-value" id="cardRevenue">0</span>
                        <span class="card-change" id="cardRevenueChange">0%</span>
                    </div>
                </div>
                
                <div class="mini-card expense-card">
                    <div class="card-icon">📉</div>
                    <div class="card-content">
                        <span class="card-label">المصروفات</span>
                        <span class="card-value" id="cardExpense">0</span>
                        <span class="card-change" id="cardExpenseChange">0%</span>
                    </div>
                </div>
            </div>

            <!-- بطاقتين متوسطتين للمدينون والدائنون -->
            <div class="mid-cards">
                <div class="mid-card debtor-card">
                    <div class="mid-card-header">
                        <span class="mid-card-title">👥 المدينون</span>
                        <span class="mid-card-value" id="midDebtors">0</span>
                    </div>
                    <div class="mid-card-progress">
                        <div class="progress-bar" id="debtorProgress"></div>
                    </div>
                </div>
                
                <div class="mid-card creditor-card">
                    <div class="mid-card-header">
                        <span class="mid-card-title">🏛️ الدائنون</span>
                        <span class="mid-card-value" id="midCreditors">0</span>
                    </div>
                    <div class="mid-card-progress">
                        <div class="progress-bar" id="creditorProgress"></div>
                    </div>
                </div>
            </div>

            <!-- الرسوم البيانية (واحد تحت الآخر) -->
            <div class="charts-section-vertical">
                <div class="chart-mini-container">
                    <div class="chart-header">
                        <span>📋 توزيع المصروفات</span>
                        <select id="expenseFilter" class="mini-select" onchange="updateExpenseChart()">
                            <option value="current">الشهر الحالي</option>
                            <option value="quarter">ربع سنوي</option>
                            <option value="year">سنوي</option>
                        </select>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="miniExpenseChart" height="120"></canvas>
                    </div>
                </div>
                
                <div class="chart-mini-container">
                    <div class="chart-header">
                        <span>⚖️ الإيرادات vs المصروفات</span>
                        <span class="chart-subtitle" id="profitIndicator">ربح: 0%</span>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="miniPerformanceChart" height="120"></canvas>
                    </div>
                </div>
                
                <div class="chart-mini-container">
                    <div class="chart-header">
                        <span>📊 توزيع الأصول</span>
                        <span class="chart-subtitle" id="assetIndicator">الإجمالي: 0</span>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="miniAssetChart" height="120"></canvas>
                    </div>
                </div>
            </div>

            <!-- نسب الأداء -->
            <div class="ratios-container">
                <div class="ratio-box">
                    <span class="ratio-label">هامش الربح</span>
                    <span class="ratio-value profit-ratio" id="ratioProfit">0%</span>
                    <div class="ratio-bar">
                        <div class="ratio-fill" id="ratioProfitBar"></div>
                    </div>
                </div>
                
                <div class="ratio-box">
                    <span class="ratio-label">نسبة السيولة</span>
                    <span class="ratio-value" id="ratioLiquidity">0.0</span>
                    <div class="ratio-bar">
                        <div class="ratio-fill" id="ratioLiquidityBar"></div>
                    </div>
                </div>
                
                <div class="ratio-box">
                    <span class="ratio-label">كفاءة التشغيل</span>
                    <span class="ratio-value" id="ratioEfficiency">0%</span>
                    <div class="ratio-bar">
                        <div class="ratio-fill" id="ratioEfficiencyBar"></div>
                    </div>
                </div>
            </div>

            <!-- آخر القيود -->
            <div class="recent-section">
                <div class="section-header">
                    <span>🕐 آخر القيود</span>
                    <button onclick="showTab('tab3')" class="view-all-btn">عرض الكل →</button>
                </div>
                <div class="recent-list" id="recentJournalsList">
                    <div class="loading-item">جاري تحميل القيود...</div>
                </div>
            </div>

            <!-- ملخص سريع -->
            <div class="quick-summary">
                <div class="summary-item">
                    <span class="summary-label">إجمالي الأصول</span>
                    <span class="summary-value" id="summaryAssets">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">إجمالي الخصوم</span>
                    <span class="summary-value" id="summaryLiabilities">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">صافي المركز</span>
                    <span class="summary-value" id="summaryEquity">0</span>
                </div>
            </div>

            <div style="height: 80px;"></div>
        </div>
    `;

    // إنشاء نافذة ميزان المراجعة للوحة الرئيسية
    createHomeTrialBalanceModal();
    
    // تحميل البيانات
    loadHomeDashboardData();
}

function loadHomeDashboardData() {
    dbGetAllAccounts(function(accounts) {
        dbGetAllJournals(function(journals) {
            calculateHomeMetrics(accounts, journals);
            renderRecentJournals(journals, accounts);
        });
    });
}

function calculateHomeMetrics(accounts, journals) {
    // حساب المتغيرات الأساسية
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    let lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // مخازن البيانات
    let metrics = {
        cash: { current: 0, previous: 0 },
        profit: { current: 0, previous: 0 },
        revenue: { current: 0, previous: 0 },
        expense: { current: 0, previous: 0 },
        debtors: 0,
        creditors: 0,
        assets: 0,
        liabilities: 0,
        equity: 0,
        expenseCategories: {},
        assetCategories: {},
        revenueCategories: {}
    };

    // حساب الأرصدة الحالية والسابقة
    journals.forEach(j => {
        const jDate = new Date(j.date);
        const isCurrent = jDate.getMonth() === currentMonth && jDate.getFullYear() === currentYear;
        const isPrevious = jDate.getMonth() === lastMonth && jDate.getFullYear() === lastYear;
        
        j.details.forEach(d => {
            const val = Number(d.debit) - Number(d.credit);
            const acc = accounts.find(a => a.id == d.accountId);
            
            if (acc) {
                const code = String(acc.code);
                
                // النقدية
                if (code.startsWith('111') || code.startsWith('112')) {
                    metrics.cash.current += val;
                    if (isPrevious) metrics.cash.previous += val;
                }
                
                // الإيرادات
                if (code.startsWith('4')) {
                    metrics.revenue.current += (val * -1);
                    if (isPrevious) metrics.revenue.previous += (val * -1);
                    
                    // تجميع الإيرادات حسب الفئة
                    const category = acc.parentId ? accounts.find(a => a.id === acc.parentId)?.name || 'إيرادات أخرى' : 'إيرادات أخرى';
                    if (!metrics.revenueCategories[category]) {
                        metrics.revenueCategories[category] = 0;
                    }
                    metrics.revenueCategories[category] += (val * -1);
                }
                
                // المصروفات
                if (code.startsWith('5')) {
                    metrics.expense.current += val;
                    if (isPrevious) metrics.expense.previous += val;
                    
                    // تجميع المصروفات حسب الفئة
                    const category = acc.parentId ? accounts.find(a => a.id === acc.parentId)?.name || 'مصروفات أخرى' : 'مصروفات أخرى';
                    if (!metrics.expenseCategories[category]) {
                        metrics.expenseCategories[category] = 0;
                    }
                    metrics.expenseCategories[category] += val;
                }
                
                // المدينون
                if (code.startsWith('114')) {
                    metrics.debtors += val;
                }
                
                // الدائنون
                if (code.startsWith('211')) {
                    metrics.creditors += (val * -1);
                }
                
                // الأصول
                if (code.startsWith('1')) {
                    metrics.assets += val;
                    
                    // تجميع الأصول حسب الفئة
                    const category = acc.parentId ? accounts.find(a => a.id === acc.parentId)?.name || 'أصول أخرى' : 'أصول أخرى';
                    if (!metrics.assetCategories[category]) {
                        metrics.assetCategories[category] = 0;
                    }
                    metrics.assetCategories[category] += val;
                }
                
                // الخصوم
                if (code.startsWith('2')) {
                    metrics.liabilities += (val * -1);
                }
                
                // حقوق الملكية
                if (code.startsWith('3')) {
                    metrics.equity += (val * -1);
                }
            }
        });
    });

    // حساب الربح
    metrics.profit.current = metrics.revenue.current - metrics.expense.current;
    metrics.profit.previous = metrics.revenue.previous - metrics.expense.previous;

    // تحديث البطاقات الرئيسية
    updateCard('cardCash', metrics.cash.current, metrics.cash.previous, 'cardCashChange');
    updateCard('cardProfit', metrics.profit.current, metrics.profit.previous, 'cardProfitChange');
    updateCard('cardRevenue', metrics.revenue.current, metrics.revenue.previous, 'cardRevenueChange');
    updateCard('cardExpense', metrics.expense.current, metrics.expense.previous, 'cardExpenseChange');
    
    // تحديث بطاقات المدينين والدائنين
    document.getElementById('midDebtors').innerText = formatCompact(metrics.debtors);
    document.getElementById('midCreditors').innerText = formatCompact(metrics.creditors);
    
    // تحديث أشرطة التقدم
    const maxValue = Math.max(metrics.debtors, metrics.creditors, 1);
    document.getElementById('debtorProgress').style.width = `${(metrics.debtors / maxValue) * 100}%`;
    document.getElementById('creditorProgress').style.width = `${(metrics.creditors / maxValue) * 100}%`;
    
    // حساب وتحديث النسب
    const profitMargin = metrics.revenue.current > 0 ? (metrics.profit.current / metrics.revenue.current) * 100 : 0;
    const liquidityRatio = metrics.liabilities > 0 ? (metrics.cash.current / metrics.liabilities) : 0;
    const efficiencyRatio = metrics.revenue.current > 0 ? (metrics.expense.current / metrics.revenue.current) * 100 : 0;
    
    document.getElementById('ratioProfit').innerText = profitMargin.toFixed(1) + '%';
    document.getElementById('ratioLiquidity').innerText = liquidityRatio.toFixed(2);
    document.getElementById('ratioEfficiency').innerText = efficiencyRatio.toFixed(1) + '%';
    
    // تحديث مؤشرات الرسوم
    document.getElementById('profitIndicator').innerText = 
        metrics.profit.current >= 0 ? `ربح: ${formatCompact(metrics.profit.current)}` : `خسارة: ${formatCompact(Math.abs(metrics.profit.current))}`;
    document.getElementById('assetIndicator').innerText = `الإجمالي: ${formatCompact(metrics.assets)}`;
    
    // تحديث أشرطة النسب
    document.getElementById('ratioProfitBar').style.width = `${Math.min(Math.abs(profitMargin), 100)}%`;
    document.getElementById('ratioProfitBar').style.background = profitMargin >= 0 ? '#27ae60' : '#c0392b';
    document.getElementById('ratioLiquidityBar').style.width = `${Math.min(liquidityRatio * 50, 100)}%`;
    document.getElementById('ratioEfficiencyBar').style.width = `${Math.min(efficiencyRatio, 100)}%`;
    
    // تحديث الملخص
    document.getElementById('summaryAssets').innerText = formatCompact(metrics.assets);
    document.getElementById('summaryLiabilities').innerText = formatCompact(metrics.liabilities);
    document.getElementById('summaryEquity').innerText = formatCompact(metrics.equity);
    
    // رسم الرسوم البيانية
    renderHomeCharts(metrics.expenseCategories, metrics.revenue.current, metrics.expense.current, metrics.assetCategories);
}

function updateCard(elementId, currentValue, previousValue, changeElementId) {
    const element = document.getElementById(elementId);
    const changeElement = document.getElementById(changeElementId);
    
    if (element) {
        element.innerText = formatCompact(currentValue);
        
        // تحديد لون القيمة بناءً على النوع
        if (elementId.includes('Profit')) {
            element.style.color = currentValue >= 0 ? '#27ae60' : '#c0392b';
        } else if (elementId.includes('Revenue')) {
            element.style.color = '#27ae60';
        } else if (elementId.includes('Expense')) {
            element.style.color = '#c0392b';
        } else if (elementId.includes('Cash')) {
            element.style.color = '#3498db';
        }
    }
    
    if (changeElement && previousValue !== 0) {
        const changePercent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
        changeElement.innerText = `${changePercent >= 0 ? '↑+' : '↓'}${Math.abs(changePercent).toFixed(1)}%`;
        changeElement.style.color = changePercent >= 0 ? '#27ae60' : '#c0392b';
    }
}

function renderRecentJournals(journals, accounts) {
    const container = document.getElementById('recentJournalsList');
    if (!container) return;
    
    const recent = journals
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-item">لا توجد قيود حديثة</div>';
        return;
    }
    
    let html = '';
    recent.forEach(j => {
        const total = j.details.reduce((sum, d) => sum + Number(d.debit), 0);
        const mainAccount = accounts.find(a => a.id == j.details[0]?.accountId);
        
        html += `
            <div class="recent-item" onclick="openJournalModal(${j.id})">
                <div class="recent-item-main">
                    <span class="recent-desc">${j.desc || 'قيد يومية'}</span>
                    <span class="recent-amount">${formatCompact(total)}</span>
                </div>
                <div class="recent-item-meta">
                    <span class="recent-date">${j.date}</span>
                    <span class="recent-account">${mainAccount ? mainAccount.name : ''}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderHomeCharts(expenseCategories, revenue, expense, assetCategories) {
    // 1. مخطط توزيع المصروفات (دونات صغيرة)
    const ctx1 = document.getElementById('miniExpenseChart');
    if (homeChart1) homeChart1.destroy();
    
    const expenseLabels = Object.keys(expenseCategories).slice(0, 5);
    const expenseData = expenseLabels.map(label => expenseCategories[label]);
    
    homeChart1 = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: expenseLabels,
            datasets: [{
                data: expenseData,
                backgroundColor: ['#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#2ecc71'],
                borderWidth: 0,
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            cutout: '70%',
            animation: { duration: 0 }
        }
    });

    // 2. مخطط الأداء (شريطي أفقي مضغوط)
    const ctx2 = document.getElementById('miniPerformanceChart');
    if (homeChart2) homeChart2.destroy();
    
    homeChart2 = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['الإيرادات', 'المصروفات'],
            datasets: [{
                data: [revenue, expense],
                backgroundColor: ['#27ae60', '#c0392b'],
                borderRadius: 4,
                barThickness: 12
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { 
                    display: false,
                    grid: { display: false }
                },
                y: { 
                    display: true,
                    ticks: { 
                        font: { size: 9 },
                        color: '#555'
                    },
                    grid: { display: false }
                }
            },
            animation: { duration: 0 }
        }
    });

    // 3. مخطط توزيع الأصول (شريطي عمودي)
    const ctx3 = document.getElementById('miniAssetChart');
    if (homeChart3) homeChart3.destroy();
    
    const assetLabels = Object.keys(assetCategories).slice(0, 4);
    const assetData = assetLabels.map(label => assetCategories[label]);
    
    homeChart3 = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: assetLabels,
            datasets: [{
                data: assetData,
                backgroundColor: ['#3498db', '#9b59b6', '#1abc9c', '#f1c40f'],
                borderRadius: 4,
                barThickness: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { 
                    display: true,
                    ticks: { 
                        font: { size: 8 },
                        color: '#555'
                    },
                    grid: { display: false }
                },
                y: { 
                    display: false,
                    grid: { display: false }
                }
            },
            animation: { duration: 0 }
        }
    });
}

function updateExpenseChart() {
    loadHomeDashboardData();
}

function refreshDashboard() {
    const refreshBtn = document.querySelector('.refresh-btn');
    refreshBtn.innerHTML = '⏳';
    refreshBtn.style.transform = 'rotate(360deg)';
    
    setTimeout(() => {
        loadHomeDashboardData();
        refreshBtn.innerHTML = '🔄';
        refreshBtn.style.transform = 'rotate(0deg)';
    }, 500);
}

// ==========================================
// ميزان المراجعة للوحة الرئيسية
// ==========================================

function createHomeTrialBalanceModal() {
    if (document.getElementById('homeTbModal')) return;
    const div = document.createElement('div');
    div.id = 'homeTbModal';
    div.className = 'modal-overlay-mobile';
    div.style.display = 'none';
    div.innerHTML = `
        <div class="modal-box-mobile" style="height: 90vh;">
            <div class="modal-header-mob">
                <button class="close-btn-mob" onclick="document.getElementById('homeTbModal').style.display='none'">إغلاق</button>
                <h4>ميزان المراجعة</h4>
                <button onclick="printHomeTrialBalance()" class="save-btn-mob" style="background:#3498db">طباعة</button>
            </div>
            <div class="modal-body-mob" id="homeTbContent">
                <div style="text-align:center; padding:20px;">جاري الحساب...</div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function showHomeTrialBalance() {
    const modal = document.getElementById('homeTbModal');
    modal.style.display = 'flex';
    
    const container = document.getElementById('homeTbContent');
    container.innerHTML = '<div class="loading-spinner">جاري تجميع ميزان المراجعة...</div>';

    dbGetAllAccounts(function(accounts) {
        dbGetAllJournals(function(journals) {
            // حساب الأرصدة
            const balances = {};
            let totalDeb = 0;
            let totalCred = 0;

            accounts.forEach(a => balances[a.id] = 0);

            journals.forEach(j => {
                j.details.forEach(d => {
                    balances[d.accountId] += (Number(d.debit) - Number(d.credit));
                });
            });

            // بناء الجدول
            let html = `
                <div class="tb-summary">
                    <div class="tb-summary-item">
                        <span>إجمالي المدين</span>
                        <span class="tb-summary-value" id="tbTotalDebit">0</span>
                    </div>
                    <div class="tb-summary-item">
                        <span>إجمالي الدائن</span>
                        <span class="tb-summary-value" id="tbTotalCredit">0</span>
                    </div>
                </div>
                <table class="tb-table-compact">
                    <thead>
                        <tr>
                            <th>الكود</th>
                            <th>الحساب</th>
                            <th>مدين</th>
                            <th>دائن</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // تصفية الحسابات التي لها رصيد فقط
            const activeAccounts = accounts.filter(a => Math.abs(balances[a.id]) > 0.01);
            activeAccounts.sort((a,b) => a.code - b.code);

            activeAccounts.forEach(acc => {
                const bal = balances[acc.id];
                const debit = bal > 0 ? bal : 0;
                const credit = bal < 0 ? Math.abs(bal) : 0;
                
                totalDeb += debit;
                totalCred += credit;

                html += `
                    <tr>
                        <td class="tb-code">${acc.code}</td>
                        <td class="tb-name">${acc.name}</td>
                        <td class="tb-debit">${debit > 0 ? formatMoneyCompact(debit) : '-'}</td>
                        <td class="tb-credit">${credit > 0 ? formatMoneyCompact(credit) : '-'}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
                
                <div class="tb-footer-compact">
                    <div class="tb-total-row">
                        <span>الإجمالي</span>
                        <span class="tb-total-debit">${formatMoneyCompact(totalDeb)}</span>
                        <span class="tb-total-credit">${formatMoneyCompact(totalCred)}</span>
                    </div>
                    <div class="tb-difference" style="color: ${Math.abs(totalDeb - totalCred) < 0.01 ? '#27ae60' : '#e74c3c'}">
                        الفرق: ${formatMoneyCompact(Math.abs(totalDeb - totalCred))}
                        ${Math.abs(totalDeb - totalCred) < 0.01 ? ' (متوازن ✓)' : ' (غير متوازن ✗)'}
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
            // تحديث الملخص
            document.getElementById('tbTotalDebit').textContent = formatMoneyCompact(totalDeb);
            document.getElementById('tbTotalCredit').textContent = formatMoneyCompact(totalCred);
        });
    });
}

function printHomeTrialBalance() {
    const content = document.getElementById('homeTbContent').innerHTML;
    const win = window.open('', '', 'width=800,height=600');
    win.document.write('<html><head><title>ميزان المراجعة</title>');
    win.document.write('<style>body{font-family:Tahoma; direction:rtl} table{width:100%; border-collapse:collapse} th,td{border:1px solid #ccc; padding:5px; text-align:center}</style>');
    win.document.write('</head><body>');
    win.document.write('<h3>ميزان المراجعة</h3>');
    win.document.write(content);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
}

function formatCompact(n) {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toLocaleString('en-US');
}

function formatMoneyCompact(n) {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ==========================================
// CSS للوحة التحكم المضغوطة
// ==========================================

function renderHomeStyles() {
    if (document.getElementById('home-css')) return;
    const s = document.createElement('style');
    s.id = 'home-css';
    s.innerHTML = `
        .home-container {
            padding: 8px;
            background: #f8f9fa;
            min-height: 100vh;
            font-family: Tahoma, sans-serif;
        }
        
        /* الهيدر */
        .home-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .header-left {
            flex: 1;
        }
        
        .home-title {
            margin: 0;
            font-size: 13px;
            color: #2c3e50;
        }
        
        .home-date {
            font-size: 9px;
            color: #7f8c8d;
        }
        
        .header-right {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        
        .refresh-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 1px solid #ddd;
            background: white;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .tb-btn-mini {
            padding: 4px 8px;
            font-size: 9px;
            background: #34495e;
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
        }
        
        /* البطاقات الصغيرة */
        .cards-grid-mini {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-bottom: 10px;
        }
        
        .mini-card {
            background: white;
            border-radius: 8px;
            padding: 8px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .card-icon {
            font-size: 14px;
            margin-left: 6px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
        }
        
        .cash-card .card-icon { background: #d5f4e6; color: #27ae60; }
        .profit-card .card-icon { background: #e8f6f3; color: #16a085; }
        .sales-card .card-icon { background: #fef9e7; color: #f39c12; }
        .expense-card .card-icon { background: #fbeeee; color: #e74c3c; }
        
        .card-content {
            flex: 1;
        }
        
        .card-label {
            display: block;
            font-size: 8px;
            color: #7f8c8d;
            margin-bottom: 2px;
        }
        
        .card-value {
            display: block;
            font-size: 11px;
            font-weight: bold;
            color: #2c3e50;
            font-family: 'Courier New', monospace;
        }
        
        .card-change {
            font-size: 7px;
            display: block;
            margin-top: 1px;
        }
        
        /* البطاقات المتوسطة */
        .mid-cards {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-bottom: 10px;
        }
        
        .mid-card {
            background: white;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .mid-card-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .mid-card-title {
            font-size: 10px;
            color: #2c3e50;
            font-weight: bold;
        }
        
        .mid-card-value {
            font-size: 12px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }
        
        .debtor-card .mid-card-value { color: #3498db; }
        .creditor-card .mid-card-value { color: #e67e22; }
        
        .mid-card-progress {
            height: 4px;
            background: #ecf0f1;
            border-radius: 2px;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            width: 0%;
            transition: width 0.5s;
        }
        
        .debtor-card .progress-bar { background: #3498db; }
        .creditor-card .progress-bar { background: #e67e22; }
        
        /* الرسوم البيانية (عمودية) */
        .charts-section-vertical {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 10px;
        }
        
        .chart-mini-container {
            background: white;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .chart-header span {
            font-size: 10px;
            color: #2c3e50;
            font-weight: bold;
        }
        
        .chart-subtitle {
            font-size: 8px;
            color: #7f8c8d;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 10px;
        }
        
        .mini-select {
            font-size: 7px;
            padding: 2px 4px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
        }
        
        .chart-wrapper {
            height: 70px;
            position: relative;
        }
        
        /* نسب الأداء */
        .ratios-container {
            background: white;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .ratio-box {
            margin-bottom: 8px;
        }
        
        .ratio-box:last-child {
            margin-bottom: 0;
        }
        
        .ratio-label {
            font-size: 9px;
            color: #7f8c8d;
            display: block;
            margin-bottom: 4px;
        }
        
        .ratio-value {
            font-size: 11px;
            font-weight: bold;
            float: left;
            font-family: 'Courier New', monospace;
        }
        
        .profit-ratio { color: #27ae60; }
        
        .ratio-bar {
            height: 6px;
            background: #ecf0f1;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 4px;
            clear: both;
        }
        
        .ratio-fill {
            height: 100%;
            width: 0%;
            background: #3498db;
            transition: width 0.8s;
            border-radius: 3px;
        }
        
        /* آخر القيود */
        .recent-section {
            background: white;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .section-header span {
            font-size: 10px;
            color: #2c3e50;
            font-weight: bold;
        }
        
        .view-all-btn {
            font-size: 8px;
            color: #3498db;
            background: none;
            border: none;
            cursor: pointer;
        }
        
        .recent-list {
            max-height: 150px;
            overflow-y: auto;
        }
        
        .recent-item {
            padding: 8px 0;
            border-bottom: 1px solid #f9f9f9;
            cursor: pointer;
        }
        
        .recent-item:last-child {
            border-bottom: none;
        }
        
        .recent-item-main {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        
        .recent-desc {
            font-size: 9px;
            color: #2c3e50;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .recent-amount {
            font-size: 10px;
            font-weight: bold;
            color: #27ae60;
            font-family: 'Courier New', monospace;
            margin-right: 6px;
        }
        
        .recent-item-meta {
            display: flex;
            justify-content: space-between;
        }
        
        .recent-date {
            font-size: 7px;
            color: #95a5a6;
        }
        
        .recent-account {
            font-size: 7px;
            color: #7f8c8d;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 60%;
        }
        
        /* الملخص السريع */
        .quick-summary {
            background: #2c3e50;
            border-radius: 8px;
            padding: 10px;
            color: white;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        
        .summary-item {
            text-align: center;
        }
        
        .summary-label {
            display: block;
            font-size: 8px;
            color: #bdc3c7;
            margin-bottom: 4px;
        }
        
        .summary-value {
            display: block;
            font-size: 11px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }
        
        /* أنماط ميزان المراجعة */
        .tb-summary {
            display: flex;
            justify-content: space-around;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .tb-summary-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .tb-summary-item span:first-child {
            font-size: 10px;
            color: #7f8c8d;
            margin-bottom: 4px;
        }
        
        .tb-summary-value {
            font-size: 14px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }
        
        .tb-table-compact {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
        }
        
        .tb-table-compact th {
            background: #ecf0f1;
            color: #2c3e50;
            padding: 6px 4px;
            text-align: center;
            font-weight: bold;
            border-bottom: 1px solid #bdc3c7;
        }
        
        .tb-table-compact td {
            padding: 6px 4px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .tb-code {
            text-align: center;
            color: #7f8c8d;
            font-family: monospace;
            width: 15%;
        }
        
        .tb-name {
            text-align: right;
            color: #2c3e50;
            width: 40%;
        }
        
        .tb-debit {
            text-align: left;
            direction: ltr;
            font-family: 'Courier New', monospace;
            color: #27ae60;
            width: 22.5%;
        }
        
        .tb-credit {
            text-align: left;
            direction: ltr;
            font-family: 'Courier New', monospace;
            color: #c0392b;
            width: 22.5%;
        }
        
        .tb-footer-compact {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #2c3e50;
        }
        
        .tb-total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 4px;
            font-weight: bold;
            background: #f8f9fa;
            border-radius: 4px;
            margin-bottom: 5px;
        }
        
        .tb-difference {
            text-align: center;
            font-size: 10px;
            padding: 5px;
            border-radius: 4px;
            background: #f8f9fa;
        }
        
        /* حالات التحميل والفراغ */
        .loading-item, .empty-item {
            text-align: center;
            padding: 20px;
            color: #95a5a6;
            font-size: 10px;
        }
        
        .loading-spinner {
            text-align: center;
            padding: 30px;
            color: #7f8c8d;
            font-size: 11px;
        }
        
        /* تحسينات للجوال */
        @media (max-width: 360px) {
            .home-container { padding: 6px; }
            .cards-grid-mini, .mid-cards { gap: 4px; }
            .mini-card, .mid-card, .chart-mini-container { padding: 6px; }
            .card-value { font-size: 10px; }
            .mid-card-value { font-size: 11px; }
            .tb-table-compact { font-size: 8px; }
        }
    `;
    document.head.appendChild(s);
}