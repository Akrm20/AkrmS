// === Setting.js: الإعدادات + التصدير (Excel + Full Backup) ===

const AppConfig = {
    currency: "ريال سعودي",
    vatRate: 0.15,
    vatEnabled: true,
    fiscalYear: {
        start: new Date().getFullYear() + "-01-01",
        end: new Date().getFullYear() + "-12-31",
        prevStart: (new Date().getFullYear() - 1) + "-01-01",
        prevEnd: (new Date().getFullYear() - 1) + "-12-31"
    },
    policies: [
        "معايير SOCPA", "الجرد المستمر", "أساس الاستحقاق", "عملة العرض: الريال"
    ]
};

// --- دوال مساعدة للتنسيق (تستخدمها كل الملفات) ---
function formatMoney(amount) {
    if (!amount && amount !== 0) return "0.00";
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function unformatMoney(str) {
    if (typeof str === 'number') return str;
    return parseFloat(String(str).replace(/,/g, '')) || 0;
}

// --- واجهة الإعدادات ---
function renderSettingsTab() {
    const tab5 = document.getElementById('tab5');
    tab5.innerHTML = `
        <h3>الإعدادات وإدارة البيانات</h3>
        
        <div class="settings-card">
            <h4>البيانات الأساسية</h4>
            <ul class="policy-list">
                <li>العملة: ${AppConfig.currency}</li>
                <li>نهاية السنة المالية: ${AppConfig.fiscalYear.end}</li>
                ${AppConfig.policies.map(p => `<li>✅ ${p}</li>`).join('')}
            </ul>
        </div>

        <div class="settings-card">
            <h4>📂 التصدير والاستيراد (Excel)</h4>
            <p class="hint-text">للمراجعة والعمل المكتبي</p>
            
            <div class="excel-control-group">
                <label>1. دليل الحسابات:</label>
                <div class="btn-row">
                    <button onclick="exportAccountsToExcel()" class="excel-btn export">تصدير الدليل ⬇️</button>
                    <button onclick="document.getElementById('file-import-acc').click()" class="excel-btn import">استيراد الدليل ⬆️</button>
                    <input type="file" id="file-import-acc" accept=".xlsx, .xls" style="display:none" onchange="importAccountsFromExcel(this)">
                </div>
            </div>

            <hr style="border:0; border-top:1px dashed #eee; margin:10px 0;">

            <div class="excel-control-group">
                <label>2. القيود اليومية:</label>
                <div class="btn-row">
                    <button onclick="exportJournalsToExcel()" class="excel-btn export">تصدير القيود ⬇️</button>
                    <button onclick="document.getElementById('file-import-ju').click()" class="excel-btn import">استيراد القيود ⬆️</button>
                    <input type="file" id="file-import-ju" accept=".xlsx, .xls" style="display:none" onchange="importJournalsFromExcel(this)">
                </div>
            </div>
        </div>

        <div class="settings-card" style="border: 1px solid #3498db;">
            <h4 style="color:#2980b9">💾 النسخ الاحتياطي الكامل (System Image)</h4>
            <p class="hint-text">يحفظ ملفاً واحداً (JSON) يحتوي على كل شيء (حسابات، قيود، تقارير). استخدمه لنقل النظام لجهاز آخر أو للحماية من فقدان البيانات.</p>
            <div class="btn-row">
                <button onclick="backupFullSystem()" class="excel-btn" style="background:#2c3e50">حفظ نسخة كاملة ⬇️</button>
                <button onclick="document.getElementById('file-restore-json').click()" class="excel-btn" style="background:#8e44ad">استعادة نسخة كاملة ⬆️</button>
                <input type="file" id="file-restore-json" accept=".json" style="display:none" onchange="restoreFullSystem(this)">
            </div>
        </div>

        <div class="settings-card" style="background:#ffebee">
            <h4>⚠️ منطقة الخطر</h4>
            <button onclick="resetDatabase()" class="danger-btn">حذف جميع البيانات (تهيئة)</button>
        </div>
    `;

    injectSettingStyles();
}

// ==========================================
// 1. النسخ الاحتياطي الكامل (JSON Backup)
// ==========================================

function backupFullSystem() {
    const backup = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        accounts: [],
        journals: [],
        reportData: []
    };

    dbGetAllAccounts(function(accs) {
        backup.accounts = accs;
        dbGetAllJournals(function(jus) {
            backup.journals = jus;
            dbGetReportData(function(reps) {
                // تحويل كائن التقارير لمصفوفة للحفظ
                for (let key in reps) {
                    backup.reportData.push({ id: key, value: reps[key] });
                }

                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "Accounting_Full_" + new Date().toISOString().slice(0,10) + ".json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            });
        });
    });
}

function restoreFullSystem(input) {
    const file = input.files[0];
    if (!file) return;

    if (!confirm("تحذير هام:\nاستعادة النسخة ستمسح كل البيانات الحالية وتستبدلها بالنسخة.\nهل أنت متأكد تماماً؟")) {
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            if (!backup.accounts || !backup.journals) throw new Error("ملف غير صالح");

            const req = indexedDB.open('MyAccountingDB', 4); // نفس رقم الإصدار
            req.onsuccess = function(ev) {
                const db = ev.target.result;
                const tx = db.transaction(['accounts', 'journals', 'report_data'], 'readwrite');
                
                // مسح كل شيء
                tx.objectStore('accounts').clear();
                tx.objectStore('journals').clear();
                tx.objectStore('report_data').clear();

                // استعادة البيانات
                backup.accounts.forEach(a => tx.objectStore('accounts').add(a));
                backup.journals.forEach(j => tx.objectStore('journals').add(j));
                if (backup.reportData) {
                    backup.reportData.forEach(r => tx.objectStore('report_data').put(r));
                }

                tx.oncomplete = function() {
                    alert("✅ تمت استعادة النظام بنجاح!");
                    location.reload();
                };
            };
        } catch (err) {
            alert("فشل قراءة الملف: " + err.message);
        }
    };
    reader.readAsText(file);
    input.value = "";
}

// ==========================================
// 2. التصدير والاستيراد (Excel SheetJS)
// ==========================================

function exportAccountsToExcel() {
    dbGetAllAccounts(function(accounts) {
        const data = accounts.map(acc => ({
            "Code": acc.code,
            "Name": acc.name,
            "ParentID": acc.parentId,
            "ID": acc.id
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Accounts");
        XLSX.writeFile(wb, "Accounts_Backup.xlsx");
    });
}

function importAccountsFromExcel(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        if (confirm(`تم قراءة ${jsonData.length} حساب. استيراد؟`)) {
            jsonData.forEach(row => {
                const code = row["Code"] || row["code"] || row["كود الحساب"];
                const name = row["Name"] || row["name"] || row["اسم الحساب"];
                const pid = row["ParentID"] || row["parentId"] || 0;
                if (code && name) {
                    dbAddAccount({ code: String(code), name: String(name), parentId: parseInt(pid) }, ()=>{}, ()=>{});
                }
            });
            alert("تم الاستيراد. حدث الصفحة.");
            setTimeout(() => location.reload(), 1000);
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = ""; 
}

function exportJournalsToExcel() {
    dbGetAllJournals(function(journals) {
        const flatData = [];
        journals.forEach(j => {
            j.details.forEach(det => {
                flatData.push({
                    "JournalID": j.id,
                    "Date": j.date,
                    "Description": j.description,
                    "AccountCode": det.accountCode,
                    "Debit": det.debit,
                    "Credit": det.credit
                });
            });
        });
        const ws = XLSX.utils.json_to_sheet(flatData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Journals");
        XLSX.writeFile(wb, "Journals_Backup.xlsx");
    });
}

function importJournalsFromExcel(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        // تجميع حسب ID القيد
        const grouped = {};
        jsonData.forEach(row => {
            const jId = row["JournalID"];
            if (!grouped[jId]) {
                grouped[jId] = {
                    date: row["Date"],
                    description: row["Description"],
                    totalAmount: 0,
                    details: []
                };
            }
            const deb = parseFloat(row["Debit"]) || 0;
            const cred = parseFloat(row["Credit"]) || 0;
            
            // نحتاج البحث عن ID الحساب بناء على الكود
            // هذه الخطوة تتطلب جلب الحسابات. هنا سنقوم بإضافة سريعة:
            // في الواقع العملي، نحتاج لمطابقة الكود. هنا سنعتمد على أن الكود صحيح
            // لكن dbAddJournal تحتاج accountId، لذا سنحاول البحث عنه لاحقاً
            // (للتبسيط: سنفترض أن المستخدم يصدر ويستورد نفس البيانات)
            
            grouped[jId].details.push({
                accountCode: row["AccountCode"], 
                // accountId: ??? (نحتاج بحث) -> سيتم معالجته عند الحفظ أو نتركه فارغاً
                // ملاحظة: النظام يعتمد على accountId. 
                // الحل الأفضل: عدم الاعتماد على استيراد الإكسيل للقيود إلا للضرورة القصوى
                debit: deb,
                credit: cred
            });
            grouped[jId].totalAmount += deb;
        });
        
        // بما أن استيراد القيود معقد (يحتاج مطابقة ID الحسابات)، سننبه المستخدم فقط
        // إذا كنت تريد تفعيله بالكامل، يجب جلب كل الحسابات ومطابقة الأكواد
        
        dbGetAllAccounts(function(accounts) {
             const codeMap = {};
             accounts.forEach(a => codeMap[a.code] = a.id);
             
             let count = 0;
             for (let id in grouped) {
                 const j = grouped[id];
                 // تصحيح accountId
                 j.details.forEach(d => {
                     if (codeMap[d.accountCode]) d.accountId = codeMap[d.accountCode];
                 });
                 
                 // إضافة فقط إذا كانت الحسابات معروفة
                 if (j.details.every(d => d.accountId)) {
                     dbAddJournal(j, ()=>{}, ()=>{});
                     count++;
                 }
             }
             alert(`تم استيراد ${count} قيد بنجاح.`);
             location.reload();
        });
    };
    reader.readAsArrayBuffer(file);
    input.value = "";
}

function resetDatabase() {
    if (confirm("تحذير: هذا سيحذف كل البيانات نهائياً!")) {
        const req = indexedDB.deleteDatabase('MyAccountingDB');
        req.onsuccess = () => {
            alert("تم الحذف. إعادة تحميل...");
            location.reload();
        };
    }
}

function injectSettingStyles() {
    if (document.getElementById('setting-css')) return;
    const s = document.createElement('style');
    s.id = 'setting-css';
    s.innerHTML = `
        .settings-card { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .policy-list { padding-right: 20px; color: #555; font-size: 10px; }
        .policy-list li { margin-bottom: 5px; }
        .excel-control-group { margin-bottom: 10px; }
        .excel-control-group label { display: block; font-weight: bold; margin-bottom: 5px; color: #2c3e50; font-size: 11px; }
        .btn-row { display: flex; gap: 10px; }
        .excel-btn { flex: 1; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-size: 10px; color: white; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .excel-btn.export { background-color: #27ae60; } 
        .excel-btn.import { background-color: #2980b9; }
        .hint-text { font-size: 9px; color: #7f8c8d; margin-top: 5px; margin-bottom: 10px; }
        .danger-btn { width: 100%; background: #c0392b; color: white; border: none; padding: 10px; border-radius: 4px; margin-top: 10px; cursor: pointer; }
    `;
    document.head.appendChild(s);
}
