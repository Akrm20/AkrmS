// === Cash.js: تقارير التدفقات النقدية وحقوق الملكية ===

// دالة التشغيل الرئيسية التي تحقن الأزرار
function injectCashFlowButtons() {
    // ننتظر حتى يتم تحميل تبويب التقارير (tab4)
    const reportControls = document.querySelector('.report-controls');
    
    if (reportControls && !document.getElementById('btn-equity')) {
        // زر حقوق الملكية
        const btnEquity = document.createElement('button');
        btnEquity.id = 'btn-equity';
        btnEquity.innerHTML = '📜 حقوق الملكية';
        btnEquity.className = 'rep-btn'; // نفس كلاس الأزرار الموجودة
        btnEquity.style.borderRight = "4px solid #8e44ad"; // تمييز لوني
        btnEquity.onclick = () => generateSpecialReport('EQUITY');

        // زر التدفقات النقدية
        const btnCash = document.createElement('button');
        btnCash.id = 'btn-cash';
        btnCash.innerHTML = '🌊 التدفقات النقدية';
        btnCash.className = 'rep-btn';
        btnCash.style.borderRight = "4px solid #2980b9"; // تمييز لوني
        btnCash.onclick = () => generateSpecialReport('CASHFLOW');

        // إضافتهم للقائمة
        reportControls.appendChild(btnEquity);
        reportControls.appendChild(btnCash);
    }
}

// الدالة الموحدة لجلب البيانات والحساب
function generateSpecialReport(type) {
    if (!db) return alert("قاعدة البيانات غير جاهزة");

    // 1. جلب الحسابات
    const tx1 = db.transaction(['accounts'], 'readonly');
    tx1.objectStore('accounts').getAll().onsuccess = (e1) => {
        const accounts = e1.target.result || [];
        
        // 2. جلب القيود
        const tx2 = db.transaction(['journals'], 'readonly');
        tx2.objectStore('journals').getAll().onsuccess = (e2) => {
            const journals = e2.target.result || [];
            
            if (type === 'EQUITY') {
                renderEquityStatement(accounts, journals);
            } else {
                renderCashFlowStatement(accounts, journals);
            }
        };
    };
}

// ==========================================
// 1. منطق وعرض قائمة حقوق الملكية
// ==========================================
function renderEquityStatement(accounts, journals) {
    // 1. حساب صافي الربح (إيرادات - مصروفات)
    let totalRevenue = 0;
    let totalExpense = 0;
    
    // 2. حساب رأس المال والمسحوبات
    let startCapital = 0;
    let additions = 0;
    let withdrawals = 0;

    // خريطة لتحديد نوع الحساب بسرعة
    const accTypeMap = {};
    accounts.forEach(a => accTypeMap[a.id] = String(a.code));

    journals.forEach(j => {
        (j.details || []).forEach(d => {
            const code = accTypeMap[d.accountId] || "";
            const debit = Number(d.debit || 0);
            const credit = Number(d.credit || 0);

            // الإيرادات (Code 4)
            if (code.startsWith('4')) totalRevenue += (credit - debit);
            // المصروفات (Code 5)
            if (code.startsWith('5')) totalExpense += (debit - credit);
            
            // حقوق الملكية (Code 3)
            if (code.startsWith('3')) {
                // رأس المال (غالباً كود 31)
                if (credit > 0) additions += credit; // زيادة رأس المال
                
                // المسحوبات (مدين في حسابات حقوق الملكية)
                if (debit > 0) withdrawals += debit;
            }
        });
    });

    const netIncome = totalRevenue - totalExpense;
    const endingEquity = (startCapital + additions + netIncome) - withdrawals;

    // عرض التقرير
    showReportModal('قائمة حقوق الملكية', `
        <div style="background:white; padding:20px; max-width:600px; margin:auto; border:1px solid #ddd; box-shadow:0 0 10px rgba(0,0,0,0.1);">
            <div style="text-align:center; border-bottom:2px solid #8e44ad; padding-bottom:10px; margin-bottom:20px;">
                <h2 style="margin:0; color:#2c3e50;">قائمة التغير في حقوق الملكية</h2>
                <small style="color:#7f8c8d;">عن السنة المالية المنتهية</small>
            </div>
            
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <tr style="background:#f9f9f9;">
                    <td style="padding:10px;">رأس المال (بداية الفترة)</td>
                    <td style="padding:10px; text-align:left; font-weight:bold;">${startCapital.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:10px;">(+) إضافات رأس المال</td>
                    <td style="padding:10px; text-align:left; color:#27ae60;">${additions.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:10px;">(+) صافي الربح</td>
                    <td style="padding:10px; text-align:left; color:#27ae60;">${netIncome.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:10px;">(-) المسحوبات الشخصية</td>
                    <td style="padding:10px; text-align:left; color:#c0392b;">(${withdrawals.toLocaleString()})</td>
                </tr>
                <tr style="border-top:2px solid #333; font-weight:bold; background:#ecf0f1;">
                    <td style="padding:15px;">صافي حقوق الملكية (نهاية الفترة)</td>
                    <td style="padding:15px; text-align:left; color:#2c3e50; font-size:16px;">${endingEquity.toLocaleString()}</td>
                </tr>
            </table>
        </div>
    `);
}

// ==========================================
// 2. منطق وعرض قائمة التدفقات النقدية (الطريقة غير المباشرة المبسطة)
// ==========================================
function renderCashFlowStatement(accounts, journals) {
    // المتغيرات
    let netIncome = 0;
    let depreciation = 0; // إهلاك (يضاف)
    let cashInInvesting = 0; // بيع أصول
    let cashOutInvesting = 0; // شراء أصول
    let cashInFinancing = 0; // زيادة رأس مال
    let cashOutFinancing = 0; // مسحوبات

    const accTypeMap = {};
    accounts.forEach(a => {
        accTypeMap[a.id] = { code: String(a.code), name: a.name };
    });

    journals.forEach(j => {
        (j.details || []).forEach(d => {
            const acc = accTypeMap[d.accountId];
            if (!acc) return;
            
            const code = acc.code;
            const debit = Number(d.debit || 0);
            const credit = Number(d.credit || 0);

            // 1. حساب صافي الربح
            if (code.startsWith('4')) netIncome += (credit - debit);
            if (code.startsWith('5')) netIncome -= (debit - credit);

            // 2. بند الإهلاك (مصروف غير نقدي يجب إضافته)
            // نبحث عن مصروف يحتوي اسمه على "إهلاك"
            if (code.startsWith('5') && acc.name.includes('إهلاك')) {
                depreciation += debit;
            }

            // 3. الأنشطة الاستثمارية (شراء/بيع أصول ثابتة - كود 12)
            if (code.startsWith('12')) {
                if (debit > 0) cashOutInvesting += debit; // شراء أصل (تدفق خارج)
                if (credit > 0) cashInInvesting += credit; // بيع أصل (تدفق داخل)
            }

            // 4. الأنشطة التمويلة (حقوق ملكية وقروض - كود 3 أو 22)
            if (code.startsWith('3') || code.startsWith('22')) {
                if (credit > 0) cashInFinancing += credit; // زيادة رأس مال أو قرض (داخل)
                if (debit > 0) cashOutFinancing += debit; // سداد قرض أو مسحوبات (خارج)
            }
        });
    });

    // العمليات التشغيلية (صافي الربح + الإهلاك) - نسخة مبسطة
    const operatingFlow = netIncome + depreciation;
    const investingFlow = cashInInvesting - cashOutInvesting;
    const financingFlow = cashInFinancing - cashOutFinancing;
    const netCashChange = operatingFlow + investingFlow + financingFlow;

    // عرض التقرير
    showReportModal('قائمة التدفقات النقدية', `
        <div style="background:white; padding:20px; max-width:600px; margin:auto; border:1px solid #ddd; box-shadow:0 0 10px rgba(0,0,0,0.1);">
            <div style="text-align:center; border-bottom:2px solid #2980b9; padding-bottom:10px; margin-bottom:20px;">
                <h2 style="margin:0; color:#2c3e50;">قائمة التدفقات النقدية</h2>
                <small style="color:#7f8c8d;">(الطريقة غير المباشرة - تقديري)</small>
            </div>
            
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <tr style="background:#eaf2f8;"><td colspan="2" style="padding:8px; font-weight:bold; color:#2980b9;">أولاً: الأنشطة التشغيلية</td></tr>
                <tr>
                    <td style="padding:5px 15px;">صافي الربح للفترة</td>
                    <td style="text-align:left;">${netIncome.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:5px 15px;">(+) الإهلاك (بند غير نقدي)</td>
                    <td style="text-align:left;">${depreciation.toLocaleString()}</td>
                </tr>
                <tr style="font-weight:bold; background:#f4f6f7;">
                    <td style="padding:5px;">صافي النقد من التشغيل</td>
                    <td style="text-align:left;">${operatingFlow.toLocaleString()}</td>
                </tr>

                <tr style="background:#eaf2f8;"><td colspan="2" style="padding:8px; font-weight:bold; color:#2980b9; border-top:1px solid #ddd;">ثانياً: الأنشطة الاستثمارية</td></tr>
                <tr>
                    <td style="padding:5px 15px;">(-) شراء أصول ثابتة</td>
                    <td style="text-align:left; color:#c0392b;">(${cashOutInvesting.toLocaleString()})</td>
                </tr>
                <tr>
                    <td style="padding:5px 15px;">(+) بيع أصول ثابتة</td>
                    <td style="text-align:left;">${cashInInvesting.toLocaleString()}</td>
                </tr>
                <tr style="font-weight:bold; background:#f4f6f7;">
                    <td style="padding:5px;">صافي النقد الاستثماري</td>
                    <td style="text-align:left; direction:ltr;">${investingFlow.toLocaleString()}</td>
                </tr>

                <tr style="background:#eaf2f8;"><td colspan="2" style="padding:8px; font-weight:bold; color:#2980b9; border-top:1px solid #ddd;">ثالثاً: الأنشطة التمويلية</td></tr>
                <tr>
                    <td style="padding:5px 15px;">(+) زيادة رأس المال / قروض</td>
                    <td style="text-align:left;">${cashInFinancing.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:5px 15px;">(-) المسحوبات / سداد قروض</td>
                    <td style="text-align:left; color:#c0392b;">(${cashOutFinancing.toLocaleString()})</td>
                </tr>
                <tr style="font-weight:bold; background:#f4f6f7;">
                    <td style="padding:5px;">صافي النقد التمويلي</td>
                    <td style="text-align:left; direction:ltr;">${financingFlow.toLocaleString()}</td>
                </tr>

                <tr style="background:#2c3e50; color:white; font-weight:bold;">
                    <td style="padding:15px;">صافي التغير في النقدية</td>
                    <td style="padding:15px; text-align:left; direction:ltr; font-size:14px;">${netCashChange.toLocaleString()}</td>
                </tr>
            </table>
        </div>
    `);
}

// دالة مساعدة لإنشاء النافذة المنبثقة
function showReportModal(title, content) {
    let modal = document.getElementById('reportModalGen');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reportModalGen';
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:20000; display:flex; align-items:center; justify-content:center; font-family: Tahoma;";
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="background:white; width:95%; max-height:90%; overflow-y:auto; border-radius:8px; position:relative;">
            <button onclick="document.getElementById('reportModalGen').style.display='none'" style="position:absolute; left:10px; top:10px; background:#c0392b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">إغلاق X</button>
            <div style="padding:40px 10px 20px 10px;">
                ${content}
            </div>
            <div style="text-align:center; padding-bottom:20px;">
                <button onclick="window.print()" style="background:#34495e; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">🖨️ طباعة التقرير</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

// مراقب لإضافة الأزرار عند فتح تبويب التقارير
const cashObserver = new MutationObserver(() => injectCashFlowButtons());
cashObserver.observe(document.body, { childList: true, subtree: true });