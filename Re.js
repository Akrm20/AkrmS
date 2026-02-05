// === Re.js: لوحة القيادة (المصححة: رسوم صغيرة + ميزان مراجعة) ===

let chartInstance1 = null;
let chartInstance2 = null;

function initHomeDashboard() {
    renderDashboardStyles();
    const tab1 = document.getElementById('tab1');
    
    tab1.innerHTML = `
        <div class="dash-container">
            <div class="dash-header">
                <div>
                    <h3 style="margin:0; font-size:13px;">لوحة المعلومات</h3>
                    <span class="date-badge">${new Date().toLocaleDateString('ar-SA')}</span>
                </div>
                <button onclick="showTrialBalanceModal()" class="tb-btn-main">
                    ⚖️ ميزان المراجعة
                </button>
            </div>

            <div class="cards-grid">
                <div class="d-card blue">
                    <span class="lbl">نقدية وبنوك</span>
                    <span class="val" id="valCash">0</span>
                </div>
                <div class="d-card green">
                    <span class="lbl">صافي الربح</span>
                    <span class="val" id="valNetIncome">0</span>
                </div>
                <div class="d-card orange">
                    <span class="lbl">مديونية (لنا)</span>
                    <span class="val" id="valRec">0</span>
                </div>
                <div class="d-card red">
                    <span class="lbl">التزامات (علينا)</span>
                    <span class="val" id="valPay">0</span>
                </div>
            </div>

            <div class="charts-row">
                <div class="chart-box" style="flex:1;">
                    <div class="chart-mini-head">توزيع المصروفات</div>
                    <div class="canvas-wrap">
                        <canvas id="expenseChart"></canvas>
                    </div>
                </div>
                <div class="chart-box" style="flex:1.5;">
                    <div class="chart-mini-head">إيراد vs مصروف</div>
                    <div class="canvas-wrap">
                        <canvas id="perfChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="ratios-strip">
                <div class="ratio-item">
                    <span class="r-lbl">هامش الربح</span>
                    <span class="r-val" id="ratMargin">0%</span>
                </div>
                <div class="ratio-item border-r">
                    <span class="r-lbl">السيولة</span>
                    <span class="r-val" id="ratLiq">0.0</span>
                </div>
                <div class="ratio-item border-r">
                    <span class="r-lbl">الإيرادات</span>
                    <span class="r-val small" id="ratRev">0</span>
                </div>
            </div>

            <div class="recent-box">
                <div class="sec-head">
                    <span>آخر التحركات</span>
                </div>
                <table class="micro-table">
                    <tbody id="recentTable"></tbody>
                </table>
            </div>
            
            <div style="height:60px"></div>
        </div>
    `;

    // بناء نافذة ميزان المراجعة (مخفية)
    createTrialBalanceModal();

    // بدء الحسابات
    calculateDashboardData();
}

// === المحرك الحسابي ===
function calculateDashboardData() {
    dbGetAllAccounts(function(accounts) {
        dbGetAllJournals(function(journals) {
            
            let cash = 0, bank = 0, receivables = 0, payables = 0;
            let revenue = 0, expenses = 0;
            let expenseCategories = {}; 

            journals.forEach(j => {
                j.details.forEach(d => {
                    const val = Number(d.debit) - Number(d.credit);
                    const acc = accounts.find(a => a.id == d.accountId);
                    if (acc) {
                        const code = String(acc.code);
                        if (code.startsWith('111')) cash += val;
                        if (code.startsWith('112')) bank += val;
                        if (code.startsWith('114')) receivables += val;
                        if (code.startsWith('211')) payables += (val * -1);
                        if (code.startsWith('4')) revenue += (val * -1);
                        if (code.startsWith('5')) {
                            expenses += val;
                            const catName = acc.name.split(' ')[0];
                            if (!expenseCategories[catName]) expenseCategories[catName] = 0;
                            expenseCategories[catName] += val;
                        }
                    }
                });
            });

            const netIncome = revenue - expenses;
            const totalCash = cash + bank;
            const margin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
            const liquidity = payables > 0 ? (totalCash + receivables) / payables : 0;

            document.getElementById('valCash').innerText = formatMoneyCompact(totalCash);
            document.getElementById('valRec').innerText = formatMoneyCompact(receivables);
            document.getElementById('valPay').innerText = formatMoneyCompact(payables);
            
            const netEl = document.getElementById('valNetIncome');
            netEl.innerText = formatMoneyCompact(netIncome);
            netEl.style.color = netIncome >= 0 ? '#27ae60' : '#c0392b';

            document.getElementById('ratMargin').innerText = margin.toFixed(0) + '%';
            document.getElementById('ratLiq').innerText = liquidity.toFixed(1);
            document.getElementById('ratRev').innerText = formatMoneyCompact(revenue);

            // جدول آخر العمليات
            const recentRows = journals.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
            const tableBody = document.getElementById('recentTable');
            let html = '';
            recentRows.forEach(j => {
                const total = j.details.reduce((sum, d) => sum + Number(d.debit), 0);
                html += `
                    <tr>
                        <td style="color:#777">#${j.id}</td>
                        <td class="truncate">${j.desc}</td>
                        <td class="num">${formatMoneyCompact(total)}</td>
                    </tr>
                `;
            });
            tableBody.innerHTML = html;

            renderCharts(expenseCategories, revenue, expenses);
        });
    });
}

// === ميزان المراجعة (النافذة والمنطق) ===
function createTrialBalanceModal() {
    if (document.getElementById('tbModal')) return;
    const div = document.createElement('div');
    div.id = 'tbModal';
    div.className = 'modal-overlay-mobile'; // نستخدم نفس ستايل القيود
    div.style.display = 'none';
    div.innerHTML = `
        <div class="modal-box-mobile">
            <div class="modal-header-mob">
                <button class="close-btn-mob" onclick="document.getElementById('tbModal').style.display='none'">إغلاق</button>
                <h4>ميزان المراجعة</h4>
                <button onclick="printTrialBalance()" class="save-btn-mob" style="background:#3498db">طباعة</button>
            </div>
            <div class="modal-body-mob" id="tbContent">
                <div style="text-align:center; padding:20px;">جاري الحساب...</div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function showTrialBalanceModal() {
    const modal = document.getElementById('tbModal');
    modal.style.display = 'flex';
    
    const container = document.getElementById('tbContent');
    container.innerHTML = '<div class="loading-spinner">جاري التجميع...</div>';

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
                <table class="tb-table">
                    <thead>
                        <tr>
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
                        <td>
                            <div style="font-weight:bold; color:#2c3e50">${acc.name}</div>
                            <div style="font-size:9px; color:#999">${acc.code}</div>
                        </td>
                        <td class="num">${debit > 0 ? formatMoneyCompact(debit) : '-'}</td>
                        <td class="num">${credit > 0 ? formatMoneyCompact(credit) : '-'}</td>
                    </tr>
                `;
            });

            html += `
                    <tr class="tb-footer">
                        <td>الإجمالي</td>
                        <td class="num">${formatMoneyCompact(totalDeb)}</td>
                        <td class="num">${formatMoneyCompact(totalCred)}</td>
                    </tr>
                </tbody>
                </table>
                <div style="height:50px"></div>
            `;
            
            container.innerHTML = html;
        });
    });
}

function printTrialBalance() {
    const content = document.getElementById('tbContent').innerHTML;
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

// === الرسوم البيانية (Mini Charts) ===
function renderCharts(expCats, totalRev, totalExp) {
    // 1. الدونات (المصاريف)
    const ctx1 = document.getElementById('expenseChart').getContext('2d');
    if (chartInstance1) chartInstance1.destroy();
    
    chartInstance1 = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: Object.keys(expCats),
            datasets: [{
                data: Object.values(expCats),
                backgroundColor: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#34495e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            cutout: '65%'
        }
    });

    // 2. البار (أفقي صغير)
    const ctx2 = document.getElementById('perfChart').getContext('2d');
    if (chartInstance2) chartInstance2.destroy();

    chartInstance2 = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['إيراد', 'مصروف'],
            datasets: [{
                data: [totalRev, totalExp],
                backgroundColor: ['#27ae60', '#c0392b'],
                borderRadius: 3,
                barThickness: 10
            }]
        },
        options: {
            indexAxis: 'y', // شريط أفقي ليناسب الارتفاع القصير
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: true, ticks: { font: { size: 9 } } } }
        }
    });
}

function formatMoneyCompact(n) {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('en-US');
}

// === CSS ===
function renderDashboardStyles() {
    if (document.getElementById('dash-css')) return;
    const s = document.createElement('style');
    s.id = 'dash-css';
    s.innerHTML = `
        .dash-container { padding: 10px; font-family: Tahoma, sans-serif; }
        
        /* Header */
        .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eee; }
        .date-badge { font-size: 9px; color: #888; background: #f5f5f5; padding: 2px 5px; border-radius: 4px; }
        .tb-btn-main { background: #34495e; color: white; border: none; padding: 5px 10px; border-radius: 15px; font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 5px; }

        /* Cards */
        .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px; }
        .d-card { background: white; padding: 6px 8px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .d-card.blue { border-right: 3px solid #3498db; }
        .d-card.green { border-right: 3px solid #27ae60; }
        .d-card.orange { border-right: 3px solid #e67e22; }
        .d-card.red { border-right: 3px solid #e74c3c; }
        .d-card .lbl { font-size: 9px; color: #7f8c8d; display: block; }
        .d-card .val { font-size: 13px; font-weight: bold; color: #2c3e50; font-family: 'Courier New'; }

        /* Charts - تصغير الارتفاع */
        .charts-row { display: flex; gap: 6px; margin-bottom: 10px; height: 90px; } /* ارتفاع صغير جدا */
        .chart-box { background: white; border-radius: 6px; padding: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
        .chart-mini-head { font-size: 8px; color: #888; text-align: center; margin-bottom: 2px; }
        .canvas-wrap { flex: 1; position: relative; }

        /* Ratios */
        .ratios-strip { display: flex; background: #f8f9fa; border: 1px solid #eee; border-radius: 6px; padding: 6px; margin-bottom: 10px; justify-content: space-between; }
        .ratio-item { flex: 1; text-align: center; }
        .border-r { border-right: 1px solid #ddd; }
        .r-lbl { font-size: 8px; color: #999; display: block; }
        .r-val { font-size: 11px; font-weight: bold; color: #333; font-family: monospace; }
        .r-val.small { font-size: 10px; }

        /* Recent Table */
        .recent-box { background: white; border-radius: 6px; padding: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .sec-head { font-size: 10px; font-weight: bold; color: #555; margin-bottom: 5px; border-bottom: 1px solid #f0f0f0; padding-bottom: 3px; }
        .micro-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .micro-table td { padding: 4px 0; border-bottom: 1px solid #f9f9f9; }
        .micro-table .num { text-align: left; direction: ltr; font-weight: bold; color: #555; }
        .truncate { max-width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Trial Balance Table Styles */
        .tb-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .tb-table th { background: #f0f0f0; padding: 8px; text-align: center; position: sticky; top: 0; }
        .tb-table td { border-bottom: 1px solid #eee; padding: 8px 4px; }
        .tb-table .num { font-family: monospace; text-align: left; direction: ltr; }
        .tb-footer { background: #2c3e50; color: white; font-weight: bold; }
        .tb-footer td { padding: 10px; }
    `;
    document.head.appendChild(s);
}
