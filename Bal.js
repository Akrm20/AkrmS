// === Bal.js: المركز المالي المجهري (Mobile-First Balance Sheet) ===

function injectBalanceSheetButton() {
    const reportControls = document.querySelector('.report-controls');
    if (reportControls && !document.getElementById('btn-detailed-bal')) {
        const btn = document.createElement('button');
        btn.id = 'btn-detailed-bal';
        btn.innerHTML = '🏛️ المركز المالي (مجهري)';
        btn.className = 'rep-btn'; 
        btn.style = "border-right: 3px solid #1abc9c; font-size: 9px; padding: 5px; margin-top: 2px;"; 
        btn.onclick = generateDetailedBalanceSheet;
        reportControls.appendChild(btn);
    }
}

function generateDetailedBalanceSheet() {
    if (!db) return;
    const tx = db.transaction(['accounts', 'journals'], 'readonly');
    let accs = [], jors = [];
    tx.objectStore('accounts').getAll().onsuccess = (e) => accs = e.target.result;
    tx.objectStore('journals').getAll().onsuccess = (e) => jors = e.target.result;
    tx.oncomplete = () => renderCompactBalanceSheet(accs, jors);
}

function renderCompactBalanceSheet(accounts, journals) {
    const balances = {};
    let netIncome = 0;
    accounts.forEach(a => balances[a.id] = 0);

    // حساب الأرصدة وصافي الربح
    journals.forEach(j => {
        (j.details || []).forEach(d => {
            const acc = accounts.find(a => a.id === d.accountId);
            if (!acc) return;
            const val = (Number(d.debit) || 0) - (Number(d.credit) || 0);
            balances[acc.id] += val;
            const code = String(acc.code);
            if (code.startsWith('4')) netIncome += (Number(d.credit) || 0) - (Number(d.debit) || 0);
            if (code.startsWith('5')) netIncome -= (Number(d.debit) || 0) - (Number(d.credit) || 0);
        });
    });

    // بناء الشجرة
    const tree = {};
    accounts.forEach(a => tree[a.id] = { info: a, total: 0, children: [] });
    const roots = [];
    accounts.forEach(a => {
        const node = tree[a.id];
        node.total = balances[a.id];
        if (a.parentId && tree[a.parentId]) tree[a.parentId].children.push(node);
        else roots.push(node);
    });

    // تجميع الأرصدة للأعلى
    function rollup(node) {
        let sum = node.total;
        node.children.forEach(c => sum += rollup(c));
        node.total = sum;
        return sum;
    }
    roots.forEach(r => rollup(r));

    const assets = roots.find(n => String(n.info.code).startsWith('1'));
    const liabs = roots.find(n => String(n.info.code).startsWith('2'));
    const equity = roots.find(n => String(n.info.code).startsWith('3'));

    function drawRows(node, lv) {
        if (Math.abs(node.total) < 0.01 && node.children.length === 0) return '';
        const isP = node.children.length > 0;
        let h = `<tr style="font-weight:${isP?'bold':'normal'}; background:${isP?'#f9f9f9':'none'}; border-bottom:1px solid #eee;">
            <td style="padding:2px; padding-right:${lv*8+5}px;">${node.info.name}</td>
            <td style="text-align:left; padding:2px;">${Math.abs(node.total).toLocaleString()}</td>
        </tr>`;
        node.children.forEach(c => h += drawRows(c, lv + 1));
        return h;
    }

    const totalA = assets ? assets.total : 0;
    const totalL = liabs ? Math.abs(liabs.total) : 0;
    const totalE = (equity ? Math.abs(equity.total) : 0) + netIncome;

    const modalHtml = `
        <div style="font-size:8px; font-family:Tahoma; direction:rtl; padding:5px;">
            <div style="text-align:center; border-bottom:1px solid #000; margin-bottom:5px;">
                <b style="font-size:10px;">المركز المالي</b><br/>${new Date().toLocaleDateString('ar-SA')}
            </div>

            <div style="background:#1abc9c; color:#fff; padding:2px; font-weight:bold;">الأصول</div>
            <table style="width:100%; border-collapse:collapse;">${drawRows(assets, 0)}</table>
            <div style="display:flex; justify-content:space-between; font-weight:bold; background:#e8f8f5; padding:2px; border-top:1px solid #1abc9c;">
                <span>إجمالي الأصول</span><span>${totalA.toLocaleString()}</span>
            </div>

            <div style="background:#e74c3c; color:#fff; padding:2px; font-weight:bold; margin-top:5px;">الخصوم</div>
            <table style="width:100%; border-collapse:collapse;">${drawRows(liabs, 0)}</table>
            <div style="display:flex; justify-content:space-between; font-weight:bold; background:#fdedec; padding:2px; border-top:1px solid #e74c3c;">
                <span>إجمالي الخصوم</span><span>${totalL.toLocaleString()}</span>
            </div>

            <div style="background:#f39c12; color:#fff; padding:2px; font-weight:bold; margin-top:5px;">حقوق الملكية</div>
            <table style="width:100%; border-collapse:collapse;">
                ${drawRows(equity, 0)}
                <tr style="color:#d35400; font-style:italic;">
                    <td style="padding:2px 5px;">ربح/خسارة العام</td>
                    <td style="text-align:left; padding:2px;">${netIncome.toLocaleString()}</td>
                </tr>
            </table>
            <div style="display:flex; justify-content:space-between; font-weight:bold; background:#fef5e7; padding:2px; border-top:1px solid #f39c12;">
                <span>إجمالي الملكية</span><span>${totalE.toLocaleString()}</span>
            </div>

            <div style="background:#2c3e50; color:#fff; padding:4px; margin-top:5px; font-weight:bold; display:flex; justify-content:space-between; font-size:9px;">
                <span>الموازنة (L+E)</span><span>${(totalL + totalE).toLocaleString()}</span>
            </div>
        </div>
    `;

    showBalModalCompact(modalHtml);
}

function showBalModalCompact(content) {
    let m = document.getElementById('balModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'balModal';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:#fff; z-index:20000; overflow-y:auto; direction:rtl;";
        document.body.appendChild(m);
    }
    m.innerHTML = `
        <div style="position:sticky; top:0; background:#eee; display:flex; gap:5px; padding:5px;" class="no-print">
            <button onclick="window.print()" style="flex:1; font-size:9px; padding:5px;">طباعة</button>
            <button onclick="document.getElementById('balModal').style.display='none'" style="flex:1; font-size:9px; padding:5px; background:#c0392b; color:#fff;">إغلاق</button>
        </div>
        ${content}
    `;
    m.style.display = 'block';
}

const balObserver = new MutationObserver(() => injectBalanceSheetButton());
balObserver.observe(document.body, { childList: true, subtree: true });
