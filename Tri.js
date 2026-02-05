// === Tri.js: مولد ميزان المراجعة (Trial Balance) ===

function injectTrialButton() {
    // نستهدف نفس المكان الذي وضعنا فيه زر دفتر الأستاذ (بجانب البحث)
    const treeControls = document.querySelector('#tree-controls .search-box');
    
    // التأكد من عدم تكرار الزر
    if (treeControls && !document.getElementById('btn-trial-bal')) {
        const btn = document.createElement('button');
        btn.id = 'btn-trial-bal';
        btn.innerHTML = '⚖️ ميزان المراجعة';
        // تنسيق الزر (لون مختلف للتمييز - تركواز)
        btn.style = "background: #16a085; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-right: 5px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
        
        btn.onclick = generateTrialBalance;
        
        // إضافته للقائمة
        treeControls.appendChild(btn);
    }
}

function generateTrialBalance() {
    if (!db) return alert("انتظر تحميل قاعدة البيانات...");

    // 1. جلب الحسابات
    const tx1 = db.transaction(['accounts'], 'readonly');
    tx1.objectStore('accounts').getAll().onsuccess = (e1) => {
        const accounts = e1.target.result || [];
        
        // 2. جلب القيود
        const tx2 = db.transaction(['journals'], 'readonly');
        tx2.objectStore('journals').getAll().onsuccess = (e2) => {
            const journals = e2.target.result || [];
            calculateAndShowTrial(accounts, journals);
        };
    };
}

function calculateAndShowTrial(accounts, journals) {
    // خريطة لتخزين البيانات: { accountId: { info, totalDeb, totalCred } }
    const accData = {};

    // 1. تهيئة الحسابات
    accounts.forEach(a => {
        accData[a.id] = { 
            info: a, 
            sumDebit: 0, 
            sumCredit: 0 
        };
    });

    // 2. تجميع الحركات من القيود
    journals.forEach(j => {
        (j.details || []).forEach(d => {
            if (accData[d.accountId]) {
                accData[d.accountId].sumDebit += Number(d.debit || 0);
                accData[d.accountId].sumCredit += Number(d.credit || 0);
            }
        });
    });

    // 3. تحويل الخريطة لمصفوفة وتصفية الحسابات الصفرية
    // (يظهر الحساب فقط إذا كان له حركة أو رصيد)
    let rowsData = Object.values(accData).filter(item => 
        item.sumDebit > 0 || item.sumCredit > 0
    );

    // ترتيب حسب الكود المحاسبي
    rowsData.sort((a, b) => String(a.info.code).localeCompare(String(b.info.code), undefined, { numeric: true }));

    // 4. حساب المجاميع النهائية للميزان
    let grandTotalDeb = 0;
    let grandTotalCred = 0;
    let grandBalDeb = 0;
    let grandBalCred = 0;

    // بناء صفوف الجدول
    const tableRows = rowsData.map(item => {
        const netBalance = item.sumDebit - item.sumCredit;
        
        // تحديد مكان الرصيد (مدين أم دائن)
        const balanceDr = netBalance > 0 ? netBalance : 0;
        const balanceCr = netBalance < 0 ? Math.abs(netBalance) : 0;

        // التجميع الكلي
        grandTotalDeb += item.sumDebit;
        grandTotalCred += item.sumCredit;
        grandBalDeb += balanceDr;
        grandBalCred += balanceCr;

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:5px; text-align:center;">${item.info.code}</td>
                <td style="padding:5px;">${item.info.name}</td>
                
                <td style="padding:5px; text-align:center; background:#f4f6f6; color:#7f8c8d;">${item.sumDebit > 0 ? item.sumDebit.toLocaleString() : '-'}</td>
                <td style="padding:5px; text-align:center; background:#f4f6f6; color:#7f8c8d;">${item.sumCredit > 0 ? item.sumCredit.toLocaleString() : '-'}</td>
                
                <td style="padding:5px; text-align:center; color:#27ae60; font-weight:bold; background:#eafaf1;">${balanceDr > 0 ? balanceDr.toLocaleString() : '-'}</td>
                <td style="padding:5px; text-align:center; color:#c0392b; font-weight:bold; background:#fdedec;">${balanceCr > 0 ? balanceCr.toLocaleString() : '-'}</td>
            </tr>
        `;
    }).join('');

    // التحقق من التوازن
    const isBalanced = Math.abs(grandTotalDeb - grandTotalCred) < 0.01 && Math.abs(grandBalDeb - grandBalCred) < 0.01;
    const statusColor = isBalanced ? "#27ae60" : "#c0392b";
    const statusText = isBalanced ? "✅ الميزان متزن" : "❌ الميزان غير متزن (يوجد خطأ)";

    // محتوى التقرير
    const reportContent = `
        <div style="text-align:center; margin-bottom:20px;">
            <h2 style="margin:0; color:#2c3e50;">ميزان المراجعة</h2>
            <p style="margin:5px; color:#7f8c8d;">حتى تاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
            <div style="display:inline-block; background:${statusColor}; color:white; padding:5px 15px; border-radius:15px; font-size:12px; margin-top:5px;">
                ${statusText}
            </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #ddd;">
            <thead>
                <tr style="background:#2c3e50; color:white;">
                    <th rowspan="2" style="padding:8px; border:1px solid #ccc;">الكود</th>
                    <th rowspan="2" style="padding:8px; border:1px solid #ccc; width:30%;">الحساب</th>
                    <th colspan="2" style="padding:5px; border:1px solid #ccc; background:#34495e;">المجاميع</th>
                    <th colspan="2" style="padding:5px; border:1px solid #ccc; background:#2980b9;">الأرصدة</th>
                </tr>
                <tr style="background:#2c3e50; color:white;">
                    <th style="padding:5px; border:1px solid #ccc;">مدين</th>
                    <th style="padding:5px; border:1px solid #ccc;">دائن</th>
                    <th style="padding:5px; border:1px solid #ccc;">مدين</th>
                    <th style="padding:5px; border:1px solid #ccc;">دائن</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
            <tfoot>
                <tr style="background:#2c3e50; color:white; font-weight:bold;">
                    <td colspan="2" style="padding:10px; text-align:center;">الإجمالي العام</td>
                    <td style="padding:10px; text-align:center;">${grandTotalDeb.toLocaleString()}</td>
                    <td style="padding:10px; text-align:center;">${grandTotalCred.toLocaleString()}</td>
                    <td style="padding:10px; text-align:center; background:#27ae60;">${grandBalDeb.toLocaleString()}</td>
                    <td style="padding:10px; text-align:center; background:#c0392b;">${grandBalCred.toLocaleString()}</td>
                </tr>
            </tfoot>
        </table>
    `;

    showTrialModal(reportContent);
}

function showTrialModal(content) {
    let modal = document.getElementById('trialModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'trialModal';
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:20000; overflow-y:auto; font-family: Tahoma, sans-serif; direction:rtl;";
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="max-width:900px; margin:30px auto; background:white; min-height:297mm; padding:40px; box-shadow:0 0 20px rgba(0,0,0,0.5);">
            <div style="text-align:left; margin-bottom:20px;" class="no-print">
                <button onclick="window.print()" style="background:#2980b9; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; margin-left:10px;">🖨️ طباعة</button>
                <button onclick="document.getElementById('trialModal').style.display='none'" style="background:#c0392b; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">إغلاق</button>
            </div>
            ${content}
        </div>
    `;

    // إضافة ستايل الطباعة إذا لم يكن موجوداً
    if (!document.getElementById('print-style-trial')) {
        const style = document.createElement('style');
        style.id = 'print-style-trial';
        style.innerHTML = `
            @media print {
                body * { visibility: hidden; }
                #trialModal, #trialModal * { visibility: visible; }
                #trialModal { position: absolute; left: 0; top: 0; width: 100%; height: auto; background: none; }
                .no-print { display: none !important; }
            }
        `;
        document.head.appendChild(style);
    }

    modal.style.display = 'block';
}

// تشغيل المراقب
const triObserver = new MutationObserver(() => injectTrialButton());
triObserver.observe(document.body, { childList: true, subtree: true });