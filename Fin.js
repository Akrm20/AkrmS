// === Fin.js: القوائم المالية الذكية (مقارنة آلية + نسب التغير) ===

function initFinancialReports() {
    renderReportStyles();
    const tab4 = document.getElementById('tab4');
    
    // واجهة التحكم
    tab4.innerHTML = `
        <div class="no-print report-dashboard">
            <div class="dash-header">
                <h3>📊 التقارير المالية والختامية</h3>
                <span class="fiscal-badge">السنة المالية: ${AppConfig.fiscalYear.end.split('-')[0]}</span>
            </div>
            <div class="report-controls">
                <button onclick="generateIncomeStatement()" class="rep-btn">📄 قائمة الدخل</button>
                <button onclick="generateBalanceSheet()" class="rep-btn">⚖️ المركز المالي</button>
                <button onclick="window.print()" class="action-btn print-btn">🖨️ طباعة رسمي</button>
            </div>
            <div class="alert-box">
                <small>💡 النظام يقوم تلقائياً بمقارنة أرصدة 2026 مع القيود المدخلة بتاريخ سابق (2025).</small>
            </div>
        </div>

        <div id="report-paper" class="a4-page">
            <div class="watermark">مسودة</div>
            <div style="text-align:center; padding-top:100px; color:#999;">
                اختر التقرير لعرضه
            </div>
        </div>
    `;
}

// ============================================================
// 1. المحرك المنطقي (The Core Engine)
// ============================================================
function calculateFinancialData(callback) {
    dbGetAllAccounts(function(accounts) {
        dbGetAllJournals(function(journals) {
            
            const startOfCurrentYear = new Date(AppConfig.fiscalYear.start); // 2026-01-01
            
            // مخازن الأرصدة
            const currentStore = {}; // 2026
            const prevStore = {};    // 2025 (و ما قبل)

            // دالة مساعدة
            const add = (store, id, val) => {
                if (!store[id]) store[id] = 0;
                store[id] += val;
            };

            journals.forEach(j => {
                const jDate = new Date(j.date);
                
                j.details.forEach(d => {
                    const val = Number(d.debit) - Number(d.credit);
                    
                    if (jDate >= startOfCurrentYear) {
                        // عمليات السنة الحالية تضاف للسنة الحالية فقط
                        add(currentStore, d.accountId, val);
                    } else {
                        // عمليات السنة السابقة تضاف للسنة السابقة
                        add(prevStore, d.accountId, val);
                        
                        // --- المنطق المحاسبي لتدوير الأرصدة ---
                        // هل هذا الحساب يرحل للسنة القادمة؟
                        // حسابات الميزانية (1, 2, 3) -> ترحل أرصدتها
                        // حسابات الدخل (4, 5) -> لا ترحل (تصفر)
                        const acc = accounts.find(a => a.id == d.accountId);
                        if (acc) {
                            const c = String(acc.code);
                            if (c.startsWith('1') || c.startsWith('2') || c.startsWith('3')) {
                                add(currentStore, d.accountId, val); // الرصيد السابق يضاف للحالي
                            }
                        }
                    }
                });
            });

            // دالة جلب المجموع حسب الكود والسنة
            const getSum = (codePrefix, year = 'current') => {
                const store = year === 'current' ? currentStore : prevStore;
                let total = 0;
                accounts.forEach(acc => {
                    if (String(acc.code).startsWith(String(codePrefix))) {
                        const accId = acc.id;
                        if (store[accId]) total += store[accId];
                    }
                });
                return total;
            };

            // حساب الأرباح المبقاة (Retained Earnings) المعقد
            // هي: رصيد حساب 33 + (أرباح السنوات السابقة المرحلة)
            const getRetainedEarnings = (year = 'current') => {
                // 1. الرصيد المباشر في الحساب 33
                let re = getSum('33', year);
                
                // 2. إذا كنا في السنة الحالية، نضيف لها صافي ربح السنة الماضية
                if (year === 'current') {
                    // صافي ربح الماضي = إيرادات الماضي (دائن) - مصاريف الماضي (مدين)
                    // في النظام: الإيراد سالب، المصروف موجب. الجمع الجبري يعطي الصافي (سالب=ربح)
                    const prevNet = getSum('4', 'prev') + getSum('5', 'prev');
                    re += prevNet;
                }
                return re; // النتيجة سالبة إذا كانت ربحاً (طبيعة دائنة)
            };

            callback({ getSum, getRetainedEarnings });
        });
    });
}

// ============================================================
// 2. قائمة المركز المالي (الميزانية)
// ============================================================
function generateBalanceSheet() {
    calculateFinancialData(({ getSum, getRetainedEarnings }) => {
        const curYr = AppConfig.fiscalYear.end.split('-')[0];
        const prevYr = Number(curYr) - 1;

        // دالة مساعدة لجلب القيمتين (حالي وسابق)
        const getPair = (code) => {
            return {
                curr: getSum(code, 'current'),
                prev: getSum(code, 'prev')
            };
        };

        // --- الأصول ---
        const nonCurrentAss = getPair('12');
        const inventory = getPair('113');
        const receivables = getPair('114');
        const cash = getPair('11'); // كل المتداولة، سنطرح منها المخزون والمدينين للعرض
        // (للتبسيط سنأخذ المجموعات الرئيسية)
        const currentAssetsTotal = getPair('11');
        
        // تفكيك النقدية (النقدية = إجمالي المتداولة - مخزون - مدينون - عهد)
        const cashOnly = {
            curr: currentAssetsTotal.curr - inventory.curr - receivables.curr,
            prev: currentAssetsTotal.prev - inventory.prev - receivables.prev
        };

        const totalAssets = {
            curr: getSum('1', 'current'),
            prev: getSum('1', 'prev')
        };

        // --- الخصوم وحقوق الملكية ---
        const capital = getPair('31');
        const reserves = getPair('32');
        
        // الأرباح المبقاة (المحسوبة)
        const retained = {
            curr: getRetainedEarnings('current'),
            prev: getRetainedEarnings('prev')
        };
        
        // صافي ربح الفترة الحالية (يظهر في حقوق الملكية للسنة الحالية فقط)
        const netProfitCurr = (getSum('4', 'current') + getSum('5', 'current')); 
        const netProfitPrev = 0; // ربح السنة الماضية تم ترحيله للأرباح المبقاة

        const totalEquity = {
            curr: capital.curr + reserves.curr + retained.curr + netProfitCurr,
            prev: capital.prev + reserves.prev + retained.prev + netProfitPrev
        };

        const nonCurrentLiab = getPair('22');
        const currentLiab = getPair('21');
        const zakat = getPair('212'); // لفصلها إذا أردت
        
        const totalLiab = {
            curr: nonCurrentLiab.curr + currentLiab.curr,
            prev: nonCurrentLiab.prev + currentLiab.prev
        };

        // بناء الجدول
        let html = renderReportHeader("قائمة المركز المالي", `كما في 31 ديسمبر ${curYr}`);
        
        html += `
        <table class="fin-statement-table">
            <thead>
                <tr>
                    <th width="35%">البيان</th>
                    <th width="5%">إيضاح</th>
                    <th width="20%">${curYr}</th>
                    <th width="20%">${prevYr}</th>
                    <th width="10%">التغير</th> </tr>
            </thead>
            <tbody>
        `;

        html += renderSectionHeader("الأصول");
        html += renderSectionHeader("الأصول غير المتداولة", true);
        html += renderRow("الممتلكات والآلات والمعدات", nonCurrentAss.curr, nonCurrentAss.prev);
        html += renderTotalRow("إجمالي الأصول غير المتداولة", nonCurrentAss.curr, nonCurrentAss.prev);

        html += renderSectionHeader("الأصول المتداولة", true);
        html += renderRow("المخزون", inventory.curr, inventory.prev);
        html += renderRow("المدينون التجاريون", receivables.curr, receivables.prev);
        html += renderRow("النقدية وما في حكمها", cashOnly.curr, cashOnly.prev);
        html += renderTotalRow("إجمالي الأصول المتداولة", currentAssetsTotal.curr, currentAssetsTotal.prev);

        html += renderGrandTotal("إجمالي الأصول", totalAssets.curr, totalAssets.prev);

        html += renderSectionHeader("حقوق الملكية والالتزامات");
        html += renderSectionHeader("حقوق الملكية", true);
        html += renderRow("رأس المال", capital.curr * -1, capital.prev * -1);
        html += renderRow("الاحتياطي النظامي", reserves.curr * -1, reserves.prev * -1);
        html += renderRow("الأرباح المبقاة", retained.curr * -1, retained.prev * -1);
        html += renderRow("صافي ربح السنة", netProfitCurr * -1, 0); // في سنة المقارنة يظهر ضمن الأرباح المبقاة
        html += renderTotalRow("إجمالي حقوق الملكية", totalEquity.curr * -1, totalEquity.prev * -1);

        html += renderSectionHeader("الالتزامات", true);
        html += renderRow("الالتزامات غير المتداولة (نهاية الخدمة)", nonCurrentLiab.curr * -1, nonCurrentLiab.prev * -1);
        html += renderRow("الالتزامات المتداولة", currentLiab.curr * -1, currentLiab.prev * -1);
        html += renderTotalRow("إجمالي الالتزامات", totalLiab.curr * -1, totalLiab.prev * -1);

        html += renderGrandTotal("إجمالي الحقوق والالتزامات", (totalEquity.curr + totalLiab.curr) * -1, (totalEquity.prev + totalLiab.prev) * -1);

        html += `</tbody></table>`;
        html += renderFooter();

        document.getElementById('report-paper').innerHTML = html;
    });
}

// ============================================================
// 3. قائمة الربح أو الخسارة (الدخل)
// ============================================================
function generateIncomeStatement() {
    calculateFinancialData(({ getSum }) => {
        const curYr = AppConfig.fiscalYear.end.split('-')[0];
        const prevYr = Number(curYr) - 1;

        const getPair = (code) => {
            return {
                curr: getSum(code, 'current'),
                prev: getSum(code, 'prev')
            };
        };

        const revenue = getPair('41');
        const cost = getPair('51');
        
        const grossProfit = {
            curr: (revenue.curr * -1) - cost.curr,
            prev: (revenue.prev * -1) - cost.prev
        };

        const selling = getPair('52');
        const admin = getPair('53');
        const otherExp = {
            curr: getSum('5', 'current') - cost.curr - selling.curr - admin.curr,
            prev: getSum('5', 'prev') - cost.prev - selling.prev - admin.prev
        };

        const netProfit = {
            curr: grossProfit.curr - selling.curr - admin.curr - otherExp.curr,
            prev: grossProfit.prev - selling.prev - admin.prev - otherExp.prev
        };

        let html = renderReportHeader("قائمة الربح أو الخسارة", `للسنة المنتهية في 31 ديسمبر ${curYr}`);
        
        html += `
        <table class="fin-statement-table">
            <thead>
                <tr>
                    <th width="35%">البيان</th>
                    <th width="5%">إيضاح</th>
                    <th width="20%">${curYr}</th>
                    <th width="20%">${prevYr}</th>
                    <th width="10%">التغير</th>
                </tr>
            </thead>
            <tbody>
        `;

        html += renderRow("الإيرادات", revenue.curr * -1, revenue.prev * -1);
        html += renderRow("تكلفة الإيرادات", cost.curr * -1, cost.prev * -1);
        html += renderTotalRow("مجمل الربح", grossProfit.curr, grossProfit.prev);

        html += renderRow("مصاريف البيع والتسويق", selling.curr * -1, selling.prev * -1);
        html += renderRow("المصاريف العمومية والإدارية", admin.curr * -1, admin.prev * -1);
        if(otherExp.curr !== 0 || otherExp.prev !== 0) {
            html += renderRow("مصاريف أخرى", otherExp.curr * -1, otherExp.prev * -1);
        }

        html += renderGrandTotal("صافي ربح السنة", netProfit.curr, netProfit.prev);

        html += `</tbody></table>`;
        html += renderFooter();

        document.getElementById('report-paper').innerHTML = html;
    });
}

// ============================================================
// 4. أدوات العرض (Rendering Tools)
// ============================================================

function renderRow(label, currVal, prevVal) {
    const format = (n) => {
        if (n === 0 || n == null) return "-";
        const abs = Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 0});
        return n < 0 ? `(${abs})` : abs;
    };

    // حساب نسبة التغير
    let pctHtml = '<span class="dash">-</span>';
    if (prevVal !== 0 && currVal !== 0) {
        const diff = currVal - prevVal;
        const pct = (diff / Math.abs(prevVal)) * 100;
        const color = pct > 0 ? 'green' : (pct < 0 ? 'red' : 'gray');
        const arrow = pct > 0 ? '▲' : (pct < 0 ? '▼' : '');
        pctHtml = `<span style="color:${color}; font-size:9px;">${arrow} ${Math.abs(pct).toFixed(0)}%</span>`;
    } else if (prevVal === 0 && currVal !== 0) {
         pctHtml = `<span style="color:green; font-size:9px;">جديد</span>`;
    }

    return `
    <tr>
        <td class="row-label">${label}</td>
        <td class="center edit-cell" contenteditable="true"></td>
        <td class="row-num">${format(currVal)}</td>
        <td class="row-num text-muted">${format(prevVal)}</td>
        <td class="center">${pctHtml}</td>
    </tr>
    `;
}

function renderTotalRow(label, currVal, prevVal) {
    const format = (n) => Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 0});
    const dispCurr = currVal < 0 ? `(${format(currVal)})` : format(currVal);
    const dispPrev = prevVal < 0 ? `(${format(prevVal)})` : (prevVal === 0 ? '-' : format(prevVal));
    
    return `
    <tr class="sub-total-row">
        <td>${label}</td>
        <td></td>
        <td class="row-num">${dispCurr}</td>
        <td class="row-num">${dispPrev}</td>
        <td></td>
    </tr>
    `;
}

function renderGrandTotal(label, currVal, prevVal) {
    const format = (n) => Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 0});
    const dispCurr = currVal < 0 ? `(${format(currVal)})` : format(currVal);
    const dispPrev = prevVal < 0 ? `(${format(prevVal)})` : (prevVal === 0 ? '-' : format(prevVal));
    
    return `
    <tr class="grand-total-row">
        <td>${label}</td>
        <td></td>
        <td class="row-num">${dispCurr}</td>
        <td class="row-num">${dispPrev}</td>
        <td></td>
    </tr>
    `;
}

function renderSectionHeader(title, isSub = false) {
    return `<tr><td colspan="5" class="${isSub ? 'sub-header' : 'main-header'}">${title}</td></tr>`;
}

function renderReportHeader(title, subTitle) {
    return `
        <div class="print-header">
            <div class="report-title">
                <h1 style="margin:0; font-size:16px;">شركة الآفاق التجارية</h1>
                <h2 style="margin:4px; font-size:18px;">${title}</h2>
                <p style="margin:2px; font-size:11px;">${subTitle}</p>
            </div>
            <div style="font-size:30px;">🏢</div>
        </div>
    `;
}

function renderFooter() {
    return `
        <div class="print-footer">
            <div class="sign-box"><p>المحاسب</p></div>
            <div class="sign-box"><p>المدير المالي</p></div>
            <div class="sign-box"><p>المدير العام</p></div>
        </div>
    `;
}

// ============================================================
// 5. التصميم (CSS)
// ============================================================
function renderReportStyles() {
    if (document.getElementById('fin-pro-css')) return;
    const s = document.createElement('style');
    s.id = 'fin-pro-css';
    s.innerHTML = `
        .a4-page {
            background: white; width: 100%; max-width: 210mm; min-height: 297mm;
            margin: 10px auto; padding: 10mm; box-shadow: 0 0 10px rgba(0,0,0,0.1);
            font-family: 'Times New Roman', serif;
        }
        .fin-statement-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .fin-statement-table th { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px; background: #fff; text-align: center; }
        .fin-statement-table td { padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: middle; }
        
        .row-label { text-align: right; }
        .row-num { text-align: left; direction: ltr; font-family: 'Courier New'; font-weight: bold; }
        .center { text-align: center; }
        .text-muted { color: #888; font-weight: normal; }
        .dash { color: #ccc; }
        
        .main-header { font-weight: bold; font-size: 12px; padding-top: 15px; border-bottom: 1px solid #000; background:#f9f9f9; }
        .sub-header { font-weight: bold; font-style: italic; padding-right: 15px; color: #444; padding-top:10px; }
        
        .sub-total-row td { border-top: 1px solid #000; font-weight: bold; background: #fdfdfd; }
        .grand-total-row td { border-top: 2px solid #000; border-bottom: 3px double #000; font-weight: bold; font-size: 13px; background: #f4f4f4; }
        
        .print-header { display: flex; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; align-items: center; }
        .print-footer { display: flex; justify-content: space-around; margin-top: 50px; }
        .sign-box { text-align: center; width: 30%; border-top: 1px dashed #000; padding-top: 5px; margin-top:30px; }

        /* Mobile */
        @media screen and (max-width: 600px) {
            .a4-page { zoom: 0.65; padding: 5mm; }
        }
        @media print {
            .no-print { display: none !important; }
            .a4-page { width: 100%; margin: 0; padding: 0; box-shadow: none; zoom:1; }
            body { background: white; }
        }
        
        /* Dashboard Controls */
        .report-dashboard { background: #ecf0f1; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .fiscal-badge { background: #2c3e50; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
        .rep-btn { background: white; border: 1px solid #ccc; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-left: 5px; }
        .print-btn { background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 4px; }
    `;
    document.head.appendChild(s);
}
