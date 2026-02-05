// === Gen.js: مولد دفتر الأستاذ العام (General Ledger) ===

function injectGenLedgerButton() {
    // نبحث عن مكان مناسب في تبويب الدليل (tab2)
    // نضعه بجوار مربع البحث الموجود في Tree.js
    const treeControls = document.querySelector('#tree-controls .search-box');
    
    if (treeControls && !document.getElementById('btn-gen-ledger')) {
        const btn = document.createElement('button');
        btn.id = 'btn-gen-ledger';
        btn.innerHTML = '📚 دفتر الأستاذ العام';
        // تنسيق الزر ليكون مميزاً
        btn.style = "background: #34495e; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-right: 10px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
        
        btn.onclick = generateGeneralLedgerReport;
        
        // إضافته بجانب مربع البحث
        treeControls.appendChild(btn);
    }
}

// الدالة الرئيسية لتوليد التقرير
function generateGeneralLedgerReport() {
    if (!db) return alert("جاري تحميل قاعدة البيانات... حاول مرة أخرى.");

    // 1. جلب الحسابات
    const tx1 = db.transaction(['accounts'], 'readonly');
    tx1.objectStore('accounts').getAll().onsuccess = (e1) => {
        const accounts = e1.target.result || [];
        
        // 2. جلب القيود
        const tx2 = db.transaction(['journals'], 'readonly');
        tx2.objectStore('journals').getAll().onsuccess = (e2) => {
            const journals = e2.target.result || [];
            processAndShowLedger(accounts, journals);
        };
    };
}

// معالجة البيانات وعرض التقرير
function processAndShowLedger(accounts, journals) {
    // هيكل لتخزين بيانات كل حساب: { info: AccountObj, txs: [], totalDeb: 0, totalCred: 0 }
    const ledger = {};

    // تهيئة السجل للحسابات الموجودة
    accounts.forEach(acc => {
        ledger[acc.id] = {
            info: acc,
            movements: [],
            totalDebit: 0,
            totalCredit: 0
        };
    });

    // المرور على جميع القيود وتوزيعها على الحسابات (الترحيل)
    journals.forEach(j => {
        const details = j.details || []; // الانتباه لتسمية details حسب ملفك
        details.forEach(d => {
            if (ledger[d.accountId]) {
                const debit = Number(d.debit || 0);
                const credit = Number(d.credit || 0);

                ledger[d.accountId].movements.push({
                    journalId: j.id,
                    date: j.date,
                    desc: j.desc,
                    debit: debit,
                    credit: credit
                });

                ledger[d.accountId].totalDebit += debit;
                ledger[d.accountId].totalCredit += credit;
            }
        });
    });

    // بناء واجهة التقرير
    let reportHtml = `
        <div style="text-align:center; padding:20px; border-bottom:3px double #333; margin-bottom:20px;">
            <h1 style="margin:0; color:#2c3e50;">دفتر الأستاذ العام</h1>
            <p style="color:#7f8c8d; margin:5px;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
    `;

    // تصفية الحسابات التي ليس لها حركة (لعدم طباعة صفحات فارغة)
    // وترتيبها حسب الكود المحاسبي
    const activeAccounts = Object.values(ledger)
        .filter(acc => acc.movements.length > 0)
        .sort((a, b) => String(a.info.code).localeCompare(String(b.info.code), undefined, { numeric: true }));

    if (activeAccounts.length === 0) {
        reportHtml += `<div style="text-align:center; padding:50px;">لا توجد حركات مالية مسجلة بعد.</div>`;
    } else {
        activeAccounts.forEach(acc => {
            const balance = acc.totalDebit - acc.totalCredit;
            const balanceType = balance > 0 ? "مدين" : (balance < 0 ? "دائن" : "متزن");
            
            // جدول حركات الحساب الواحد
            const rows = acc.movements.map(m => `
                <tr>
                    <td style="padding:6px; border-bottom:1px solid #eee;">${m.date}</td>
                    <td style="padding:6px; border-bottom:1px solid #eee; text-align:center;">${m.journalId}</td>
                    <td style="padding:6px; border-bottom:1px solid #eee;">${m.desc || '-'}</td>
                    <td style="padding:6px; border-bottom:1px solid #eee; text-align:center; color:#27ae60;">${m.debit > 0 ? m.debit.toLocaleString() : ''}</td>
                    <td style="padding:6px; border-bottom:1px solid #eee; text-align:center; color:#c0392b;">${m.credit > 0 ? m.credit.toLocaleString() : ''}</td>
                </tr>
            `).join('');

            reportHtml += `
                <div style="background:white; border:1px solid #ccc; margin-bottom:30px; border-radius:5px; overflow:hidden; page-break-inside:avoid;">
                    <div style="background:#f4f6f7; padding:10px 15px; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="background:#2c3e50; color:white; padding:3px 8px; border-radius:4px; font-size:11px;">${acc.info.code}</span>
                            <span style="font-weight:bold; color:#2c3e50; margin-right:10px; font-size:14px;">${acc.info.name}</span>
                        </div>
                        <div style="font-size:12px;">
                            الرصيد الحالي: <span style="font-weight:bold; color:${balance >= 0 ? '#27ae60' : '#c0392b'}">${Math.abs(balance).toLocaleString()} (${balanceType})</span>
                        </div>
                    </div>
                    
                    <table style="width:100%; border-collapse:collapse; font-size:11px;">
                        <thead>
                            <tr style="background:#ecf0f1; color:#7f8c8d;">
                                <th style="padding:8px; text-align:right; width:15%;">التاريخ</th>
                                <th style="padding:8px; text-align:center; width:10%;">رقم القيد</th>
                                <th style="padding:8px; text-align:right; width:45%;">البيان</th>
                                <th style="padding:8px; text-align:center; width:15%;">مدين</th>
                                <th style="padding:8px; text-align:center; width:15%;">دائن</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                        <tfoot style="background:#fdfefe; font-weight:bold;">
                            <tr>
                                <td colspan="3" style="padding:10px; text-align:left;">المجاميع:</td>
                                <td style="padding:10px; text-align:center; color:#27ae60;">${acc.totalDebit.toLocaleString()}</td>
                                <td style="padding:10px; text-align:center; color:#c0392b;">${acc.totalCredit.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        });
    }

    showLedgerModal(reportHtml);
}

// عرض النافذة المنبثقة
function showLedgerModal(content) {
    let modal = document.getElementById('genLedgerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'genLedgerModal';
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:20000; overflow-y:auto; font-family: Tahoma, sans-serif; direction:rtl;";
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="max-width:800px; margin:30px auto; background:white; min-height:297mm; padding:40px; box-shadow:0 0 20px rgba(0,0,0,0.5);">
            <div style="text-align:left; margin-bottom:20px;" class="no-print">
                <button onclick="window.print()" style="background:#2980b9; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold; margin-left:10px;">🖨️ طباعة الدفتر</button>
                <button onclick="document.getElementById('genLedgerModal').style.display='none'" style="background:#c0392b; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold;">إغلاق</button>
            </div>
            ${content}
        </div>
    `;
    
    // إضافة تنسيقات الطباعة الخاصة فقط بهذا التقرير
    if (!document.getElementById('print-style-ledger')) {
        const style = document.createElement('style');
        style.id = 'print-style-ledger';
        style.innerHTML = `
            @media print {
                body * { visibility: hidden; }
                #genLedgerModal, #genLedgerModal * { visibility: visible; }
                #genLedgerModal { position: absolute; left: 0; top: 0; width: 100%; height: auto; background: none; z-index: 999999; }
                .no-print { display: none !important; }
            }
        `;
        document.head.appendChild(style);
    }

    modal.style.display = 'block';
}

// مراقبة ظهور عناصر التبويب لإضافة الزر
const genObserver = new MutationObserver(() => injectGenLedgerButton());
genObserver.observe(document.body, { childList: true, subtree: true });