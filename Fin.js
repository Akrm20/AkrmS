// === Fin.js: القوائم المالية المتقدمة (طباعة + تحليل + تدفقات) ===

function initFinancialReports() {
    renderReportStyles();
    const tab4 = document.getElementById('tab4');
    tab4.innerHTML = `
        <div class="no-print">
            <h3>التقارير المالية</h3>
            <div class="report-controls">
                <button onclick="generateIncomeStatement()" class="rep-btn">قائمة الدخل</button>
                <button onclick="generateBalanceSheet()" class="rep-btn">المركز المالي</button>
                <button onclick="generateEquityStatement()" class="rep-btn">حقوق الملكية</button>
                <button onclick="generateCashFlow()" class="rep-btn">التدفقات النقدية</button>
            </div>
            <div class="print-control">
                <button onclick="window.print()" class="action-btn print-btn">🖨️ طباعة التقرير الحالي</button>
            </div>
        </div>

        <div id="report-display-area" class="report-paper">
            <p class="loading-text">اختر تقريراً للعرض...</p>
        </div>
        
        <div id="save-indicator" style="display:none; position:fixed; bottom:10px; left:10px; background:#2ecc71; color:white; padding:5px 10px; border-radius:4px; font-size:10px;">تم الحفظ</div>
    `;
}

// --- المحرك الحسابي (Calculation Engine) ---
function calculateBalances(callback) {
    dbGetAllAccounts(function(accounts) {
        dbGetAllJournals(function(journals) {
            dbGetReportData(function(savedReportData) {
                
                const balances = {};
                accounts.forEach(acc => balances[acc.id] = 0);

                journals.forEach(j => {
                    j.details.forEach(det => {
                        const val = det.debit - det.credit;
                        if (balances[det.accountId] !== undefined) {
                            balances[det.accountId] += val;
                        }
                    });
                });

                const getTotal = (accId) => {
                    let total = balances[accId] || 0;
                    const children = accounts.filter(a => a.parentId === accId);
                    children.forEach(child => {
                        total += getTotal(child.id);
                    });
                    return total;
                };

                // دالة مساعدة لجلب الرصيد بالكود (للتدفقات النقدية)
                const getTotalByCode = (codePrefix) => {
                    let total = 0;
                    accounts.forEach(acc => {
                        if (acc.code.toString().startsWith(codePrefix)) {
                            // جمع الفروع فقط
                            const isParent = accounts.some(child => child.parentId === acc.id);
                            if (!isParent) total += balances[acc.id];
                        }
                    });
                    return total;
                };

                callback(accounts, balances, getTotal, getTotalByCode, savedReportData);
            });
        });
    });
}

// ==========================================
// 1. قائمة الدخل (Income Statement)
// ==========================================
function generateIncomeStatement() {
    renderHeader("قائمة الدخل الشامل", `عن السنة المنتهية في ${AppConfig.fiscalYear.end}`);
    
    calculateBalances((accounts, raw, getTotal, getByCode, repData) => {
        let html = startTable(["البيان", "إيضاح", "السنة الحالية", "السنة السابقة", "تغير %"]);

        // الإيرادات (4) - دائنة (سالبة) نضرب في -1
        const revTotal = getByCode('4') * -1;
        html += renderRow("الإيرادات", revTotal, true, 0, 'inc_rev', repData);

        // التفاصيل
        const revRoot = accounts.find(a => a.code === '4');
        if (revRoot) {
            accounts.filter(a => a.parentId === revRoot.id).forEach(acc => {
                const val = getTotal(acc.id) * -1;
                if (val !== 0) html += renderRow(acc.name, val, false, 1, acc.id, repData);
            });
        }

        // تكلفة المبيعات (51)
        const costTotal = getByCode('51');
        html += renderRow("تكلفة المبيعات", costTotal * -1, false, 0, 'inc_cost', repData);

        const grossProfit = revTotal - costTotal;
        html += renderTotalRow("مجمل الربح", grossProfit, false, 'inc_gross', repData);

        // المصاريف (52)
        const expTotal = getByCode('52');
        html += renderRow("المصاريف التشغيلية", expTotal * -1, false, 0, 'inc_exp', repData);

        // تفاصيل المصاريف
        const expRoot = accounts.find(a => a.code === '52');
        if (expRoot) {
            accounts.filter(a => a.parentId === expRoot.id).forEach(acc => {
                const val = getTotal(acc.id);
                if (val !== 0) html += renderRow(acc.name, val * -1, false, 1, acc.id, repData);
            });
        }

        const netIncome = grossProfit - expTotal;
        window.currentNetIncome = netIncome; // حفظ للاستخدام العام

        html += renderTotalRow("صافي الربح للسنة", netIncome, true, 'inc_net', repData);
        html += endTable();
        document.getElementById('rep-content').innerHTML = html;
    });
}

// ==========================================
// 2. قائمة المركز المالي (Balance Sheet)
// ==========================================
function generateBalanceSheet() {
    renderHeader("قائمة المركز المالي", `كما في ${AppConfig.fiscalYear.end}`);
    
    calculateBalances((accounts, raw, getTotal, getByCode, repData) => {
        let html = startTable(["البيان", "إيضاح", "السنة الحالية", "السنة السابقة", "تغير %"]);

        // --- الأصول ---
        html += sectionHeader("الأصول");
        
        // المتداولة
        const curAssTotal = getByCode('11');
        const curAssRoot = accounts.find(a => a.code === '11');
        if (curAssRoot) {
            accounts.filter(a => a.parentId === curAssRoot.id).forEach(acc => {
                html += renderRow(acc.name, getTotal(acc.id), false, 1, acc.id, repData);
            });
        }
        html += renderTotalRow("إجمالي الأصول المتداولة", curAssTotal, false, 'bs_cur_ass', repData);

        // غير المتداولة
        const fixAssTotal = getByCode('12');
        const fixAssRoot = accounts.find(a => a.code === '12');
        if (fixAssRoot) {
            accounts.filter(a => a.parentId === fixAssRoot.id).forEach(acc => {
                html += renderRow(acc.name, getTotal(acc.id), false, 1, acc.id, repData);
            });
        }
        html += renderTotalRow("إجمالي الأصول غير المتداولة", fixAssTotal, false, 'bs_fix_ass', repData);

        const totalAssets = curAssTotal + fixAssTotal;
        html += renderTotalRow("إجمالي الأصول", totalAssets, true, 'bs_tot_ass', repData);

        // --- الخصوم وحقوق الملكية ---
        html += sectionHeader("الخصوم وحقوق الملكية");

        // الخصوم
        const liabTotal = getByCode('2') * -1;
        const liabRoot = accounts.find(a => a.code === '2');
        if (liabRoot) {
            accounts.filter(a => a.parentId === liabRoot.id).forEach(acc => {
                 // عرض أبناء الخصوم
                 const val = getTotal(acc.id) * -1;
                 html += renderRow(acc.name, val, false, 1, acc.id, repData);
            });
        }
        html += renderTotalRow("إجمالي الخصوم", liabTotal, false, 'bs_tot_liab', repData);

        // حقوق الملكية
        // نحتاج صافي الربح من القائمة السابقة
        const netIncome = window.currentNetIncome || (getByCode('4') * -1 - getByCode('5'));
        
        // رأس المال والأرباح المبقاة
        const equityRoot = accounts.find(a => a.code === '3');
        let equityTotalStored = equityRoot ? getTotal(equityRoot.id) * -1 : 0;
        
        if (equityRoot) {
             accounts.filter(a => a.parentId === equityRoot.id).forEach(acc => {
                 const val = getTotal(acc.id) * -1;
                 html += renderRow(acc.name, val, false, 1, acc.id, repData);
            });
        }
        
        // إضافة سطر صافي ربح العام
        html += renderRow("أرباح العام الحالي (من قائمة الدخل)", netIncome, false, 1, 'equity_net_inc', repData);

        const totalEquity = equityTotalStored + netIncome;
        html += renderTotalRow("إجمالي حقوق الملكية", totalEquity, false, 'bs_tot_eq', repData);

        const totalLiabEq = liabTotal + totalEquity;
        html += renderTotalRow("إجمالي الخصوم وحقوق الملكية", totalLiabEq, true, 'bs_final', repData);
        
        if (Math.abs(totalAssets - totalLiabEq) > 1) {
            html += `<div style="color:red;text-align:center;font-weight:bold;margin-top:5px;">⚠️ غير متزنة (الفرق: ${formatMoney(totalAssets - totalLiabEq)})</div>`;
        }

        html += endTable();
        document.getElementById('rep-content').innerHTML = html;
    });
}

// ==========================================
// 3. قائمة التغير في حقوق الملكية (New)
// ==========================================
function generateEquityStatement() {
    renderHeader("قائمة التغير في حقوق الملكية", `للسنة المنتهية في ${AppConfig.fiscalYear.end}`);
    
    calculateBalances((accounts, raw, getTotal, getByCode, repData) => {
        let html = startTable(["البيان", "رأس المال", "احتياطيات", "أرباح مبقاة", "الإجمالي"]);

        // البيانات
        const capital = getByCode('31') * -1; // رأس المال
        const reserves = getByCode('32') * -1; // احتياطيات
        const netIncome = window.currentNetIncome || (getByCode('4') * -1 - getByCode('5'));
        
        // أرصدة بداية المدة (تخمينية أو مدخلة يدوياً - هنا سنعتبرها الرصيد الحالي ناقص حركات العام)
        // للتبسيط في هذا النظام: سنعرض الأرصدة الحالية كأرصدة نهاية مدة
        
        // سطر 1: رصيد بداية العام (مفترض أنه صفر + حركات سابقة، هنا سنستخدم أسلوب عرض مبسط)
        // سنعرض الحركة خلال العام
        
        const rowStyle = "border-bottom:1px solid #eee;";
        
        html += `
            <tr style="${rowStyle}">
                <td>رصيد بداية العام (تقديري)</td>
                <td class="num-col">-</td>
                <td class="num-col">-</td>
                <td class="num-col">-</td>
                <td class="num-col">-</td>
            </tr>
            <tr style="${rowStyle}">
                <td>الزيادة في رأس المال</td>
                <td class="num-col">${formatMoney(capital)}</td>
                <td class="num-col">-</td>
                <td class="num-col">-</td>
                <td class="num-col">${formatMoney(capital)}</td>
            </tr>
            <tr style="${rowStyle}">
                <td>صافي ربح العام</td>
                <td class="num-col">-</td>
                <td class="num-col">-</td>
                <td class="num-col">${formatMoney(netIncome)}</td>
                <td class="num-col">${formatMoney(netIncome)}</td>
            </tr>
            <tr style="${rowStyle}">
                <td>المحول للاحتياطيات</td>
                <td class="num-col">-</td>
                <td class="num-col">${formatMoney(reserves)}</td>
                <td class="num-col">(${formatMoney(reserves)})</td>
                <td class="num-col">-</td>
            </tr>
            <tr style="font-weight:bold; background:#f9f9f9; border-top:2px solid #333;">
                <td>رصيد نهاية العام</td>
                <td class="num-col">${formatMoney(capital)}</td>
                <td class="num-col">${formatMoney(reserves)}</td>
                <td class="num-col">${formatMoney(netIncome - reserves)}</td> <td class="num-col">${formatMoney(capital + netIncome)}</td>
            </tr>
        `;

        html += endTable();
        html += `<div class="audit-note">* تم إعداد هذه القائمة بناءً على الأرصدة الحالية للنظام.</div>`;
        document.getElementById('rep-content').innerHTML = html;
    });
}

// ==========================================
// 4. قائمة التدفقات النقدية (Indirect Method)
// ==========================================
function generateCashFlow() {
    renderHeader("قائمة التدفقات النقدية (تقديرية)", `للسنة المنتهية في ${AppConfig.fiscalYear.end}`);
    
    calculateBalances((accounts, raw, getTotal, getByCode, repData) => {
        let html = startTable(["البيان", "المبلغ الجزئي", "الإجمالي"]);

        const netIncome = window.currentNetIncome || (getByCode('4') * -1 - getByCode('5'));

        // 1. الأنشطة التشغيلية
        html += sectionHeader("التدفقات من الأنشطة التشغيلية");
        html += renderSimpleRow("صافي ربح العام", netIncome, true);
        
        // تغيرات رأس المال العامل (يفترض مقارنة بالسنة السابقة، هنا نستخدم الرصيد الحالي كتغير مطلق عن الصفر)
        // الزيادة في الأصول المتداولة (غير النقدية) = تدفق خارج (-)
        const inventory = getByCode('113'); // مخزون
        const receivables = getByCode('114'); // عملاء
        const payables = getByCode('211') * -1; // موردين (دائن)

        html += renderSimpleRow("التغير في المخزون (زيادة)", inventory * -1);
        html += renderSimpleRow("التغير في العملاء (زيادة)", receivables * -1);
        html += renderSimpleRow("التغير في الموردين (زيادة)", payables); // زيادة الخصوم = تدفق داخل

        const netOperating = netIncome - inventory - receivables + payables;
        html += renderTotalRowSimple("صافي النقد من الأنشطة التشغيلية", netOperating);

        // 2. الأنشطة الاستثمارية
        html += sectionHeader("التدفقات من الأنشطة الاستثمارية");
        const fixedAssets = getByCode('12'); // أصول ثابتة (شراء = سالب)
        html += renderSimpleRow("شراء أصول ثابتة", fixedAssets * -1);
        html += renderTotalRowSimple("صافي النقد من الأنشطة الاستثمارية", fixedAssets * -1);

        // 3. الأنشطة التمويلية
        html += sectionHeader("التدفقات من الأنشطة التمويلية");
        const capital = getByCode('31') * -1;
        html += renderSimpleRow("زيادة رأس المال", capital);
        html += renderTotalRowSimple("صافي النقد من الأنشطة التمويلية", capital);

        // الخلاصة
        const netCashChange = netOperating - fixedAssets + capital;
        html += renderTotalRowSimple("صافي التغير في النقد وشبه النقد", netCashChange, true);
        
        const cashBalance = getByCode('111') + getByCode('112');
        html += renderTotalRowSimple("رصيد النقدية في نهاية الفترة (للمطابقة)", cashBalance, true);

        if (Math.abs(netCashChange - cashBalance) > 1) {
             html += `<div style="color:red; font-size:10px; text-align:center;">* ملاحظة: الفرق يعود لأرصدة افتتاحية غير مدخلة أو حركات غير مصنفة بدقة.</div>`;
        }

        html += endTable();
        document.getElementById('rep-content').innerHTML = html;
    });
}

// ==========================================
// دوال الرسم المساعدة (Helpers)
// ==========================================

function renderHeader(title, subtitle) {
    const area = document.getElementById('report-display-area');
    area.innerHTML = `
        <div class="sheet-header">
            <h4>${title}</h4>
            <span>${subtitle}</span>
            <div id="rep-content"></div>
        </div>
    `;
}

function startTable(headers) {
    let ths = headers.map(h => `<th>${h}</th>`).join('');
    return `<table class="fin-table"><thead><tr>${ths}</tr></thead><tbody>`;
}

function endTable() {
    return `</tbody></table><div class="audit-note">* تم إصدار التقرير آلياً.</div>`;
}

function sectionHeader(title) {
    return `<tr class="section-head"><td colspan="5">${title}</td></tr>`;
}

// دالة رسم الصف (مع حساب نسبة التغير والايضاحات)
function renderRow(name, amount, isBold, indentLevel, uniqueId, repData) {
    const style = isBold ? 'font-weight:bold;' : '';
    const indent = indentLevel * 10;
    
    // مفاتيح البيانات المحفوظة
    const noteKey = `ref_${uniqueId}`;
    const prevKey = `prev_${uniqueId}`;

    const noteVal = repData && repData[noteKey] ? repData[noteKey] : '';
    const prevValRaw = repData && repData[prevKey] ? repData[prevKey] : 0;
    
    const prevVal = unformatMoney(prevValRaw); // تحويل النص لرقم للحساب
    
    // حساب نسبة التغير
    let pctChange = '-';
    if (prevVal !== 0) {
        const diff = amount - prevVal;
        const pct = (diff / Math.abs(prevVal)) * 100;
        pctChange = pct.toFixed(1) + '%';
    } else if (amount !== 0 && prevVal === 0) {
        pctChange = '100%'; // جديد
    }

    // تحديد لون النسبة
    const pctColor = pctChange.includes('-') ? 'red' : 'green';

    return `
        <tr style="${style}">
            <td style="padding-right:${indent}px">${name}</td>
            
            <td class="input-cell" width="50px">
                <input type="text" id="${noteKey}" value="${noteVal}" 
                       class="sheet-input center" placeholder="#"
                       onblur="autoSaveCell(this)">
            </td>
            
            <td class="num-col">${amount === 0 ? '-' : formatMoney(amount)}</td>
            
            <td class="input-cell">
                <input type="text" id="${prevKey}" value="${prevValRaw || ''}" 
                       class="sheet-input prev-input" placeholder="0.00"
                       onblur="autoSaveCell(this); refreshPct(this);"> 
            </td>
            
            <td class="num-col" style="color:${pctColor}; font-size:9px;">${pctChange}</td>
        </tr>
    `;
}

function renderTotalRow(name, amount, isGrand, uniqueId, repData) {
    const bg = isGrand ? '#ecf0f1' : '#f9f9f9';
    const weight = isGrand ? 'bold' : 'normal';
    
    // حتى الإجماليات نحتاج لها مقارنة
    const prevKey = `prev_${uniqueId}`;
    const prevValRaw = repData && repData[prevKey] ? repData[prevKey] : 0;
    const prevVal = unformatMoney(prevValRaw);

    let pctChange = '-';
    if (prevVal !== 0) {
        const pct = ((amount - prevVal) / Math.abs(prevVal)) * 100;
        pctChange = pct.toFixed(1) + '%';
    }

    return `
        <tr style="background:${bg}; font-weight:${weight}; border-top:1px solid #ccc;">
            <td>${name}</td>
            <td></td>
            <td class="num-col">${formatMoney(amount)}</td>
            
            <td class="input-cell">
                <input type="text" id="${prevKey}" value="${prevValRaw || ''}" 
                       class="sheet-input prev-input" placeholder="0.00"
                       style="font-weight:bold"
                       onblur="autoSaveCell(this)">
            </td>
             <td class="num-col" style="font-size:9px;">${pctChange}</td>
        </tr>
    `;
}

// دوال بسيطة للتدفقات النقدية
function renderSimpleRow(name, amount) {
    return `<tr><td>${name}</td><td class="num-col">${formatMoney(amount)}</td><td></td></tr>`;
}
function renderTotalRowSimple(name, amount, isGrand=false) {
    const style = isGrand ? 'font-weight:bold;border-top:2px solid #333;background:#eee;' : 'font-weight:bold;border-top:1px solid #ccc;';
    return `<tr style="${style}"><td>${name}</td><td></td><td class="num-col">${formatMoney(amount)}</td></tr>`;
}

// الحفظ التلقائي
function autoSaveCell(el) {
    dbSaveReportCell(el.id, el.value);
    document.getElementById('save-indicator').style.display = 'block';
    setTimeout(() => document.getElementById('save-indicator').style.display = 'none', 1000);
}

// تحديث الصفحة لحساب النسبة فوراً بعد إدخال رقم المقارنة
function refreshPct(el) {
    // يمكن إعادة استدعاء دالة التقرير الحالية، لكن للسهولة سنطلب من المستخدم التحديث
    // أو نعتمد على الحفظ ثم إعادة الضغط على الزر.
    // الأفضل: لا نفعل شيئاً مزعجاً، النسبة ستتحدث عند إعادة فتح التقرير.
}

function renderReportStyles() {
    if (document.getElementById('rep-css')) return;
    const s = document.createElement('style');
    s.id = 'rep-css';
    s.innerHTML = `
        .report-controls { display: flex; gap: 5px; margin-bottom: 10px; justify-content: center; flex-wrap: wrap; }
        .rep-btn { background: #2c3e50; color: white; border: none; padding: 8px 10px; border-radius: 4px; font-size: 10px; cursor: pointer; flex: 1; min-width: 70px; }
        .rep-btn:hover { background: #34495e; }
        
        .print-control { text-align: center; margin-bottom: 15px; }
        .print-btn { background: #fff; border: 1px solid #2c3e50; color: #2c3e50; width: auto; display: inline-flex; padding: 5px 20px; }

        .report-paper { background: white; padding: 15px; border: 1px solid #ddd; min-height: 500px; font-family: 'Times New Roman', serif; }
        .sheet-header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #000; padding-bottom: 10px; }
        .sheet-header h4 { font-size: 16px; margin: 0 0 5px 0; color: #000; }
        .sheet-header span { font-size: 11px; color: #555; }

        .fin-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
        .fin-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px; background: #f0f0f0; font-weight: bold; }
        .fin-table td { border-bottom: 1px dotted #ccc; padding: 4px; vertical-align: middle; }
        
        .num-col { text-align: left; direction: ltr; font-family: 'Courier New', monospace; font-weight: 500; }
        .input-cell { padding: 0 !important; }
        .sheet-input { width: 100%; border: none; background: transparent; font-family: inherit; font-size: 10px; padding: 4px; outline: none; text-align: center; }
        .sheet-input:focus { background: #fffbe6; }
        .sheet-input.center { text-align: center; }
        .sheet-input.prev-input { text-align: left; direction: ltr; color: #7f8c8d; }

        .section-head { font-weight: bold; background: #fafafa; font-style: italic; }
        .audit-note { margin-top: 20px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 5px; }

        /* الطباعة */
        @media print {
            body * { visibility: hidden; }
            #report-display-area, #report-display-area * { visibility: visible; }
            #report-display-area { position: absolute; left: 0; top: 0; width: 100%; border: none; padding: 0; }
            .no-print { display: none !important; }
            .sheet-input { border: none !important; background: transparent !important; } 
            /* عند الطباعة، تظهر القيم المدخلة وكأنها نص عادي */
        }
    `;
    document.head.appendChild(s);
}
