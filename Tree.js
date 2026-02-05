// === Tree.js: دليل الحسابات (مصحح) ===

function startSystem() {
    initTreePage(); 
    loadAndRenderAccounts(); 
    initAddAccountFeature();
}

function initTreePage() {
    const tab2 = document.getElementById('tab2');
    
    // 1. إضافة أدوات البحث والشجرة
    if (!document.getElementById('tree-controls')) {
        const controls = document.createElement('div');
        controls.id = 'tree-controls';
        controls.innerHTML = `
            <div class="search-box">
                <input type="text" id="accSearch" placeholder="🔍 بحث باسم الحساب أو الكود..." onkeyup="filterAccounts(this.value)">
            </div>
            <div id="chart-container"></div>
        `;
        
        // تنظيف وإعادة بناء التبويب
        const oldContainer = document.getElementById('chart-container');
        if(oldContainer) oldContainer.remove();
        
        // الحفاظ على زر الإضافة
        const fab = document.getElementById('addAccBtn');
        
        tab2.innerHTML = '<h3>دليل الحسابات</h3>';
        tab2.appendChild(controls);
        if(fab) tab2.appendChild(fab);
        
        injectTreeStyles();
    }
    
    // 2. إنشاء نافذة كشف الحساب (مع إخفاء إجباري)
    if (!document.getElementById('ledgerModal')) {
        const modal = document.createElement('div');
        modal.id = 'ledgerModal';
        modal.className = 'modal-overlay'; // كلاس التنسيق
        modal.style.display = 'none';      // <--- هام جداً: إخفاء افتراضي
        
        modal.innerHTML = `
            <div class="modal-box" style="height:80vh; display:flex; flex-direction:column;">
                <div class="modal-header-l">
                    <h4 id="ledgerTitle">كشف حساب</h4>
                    <button onclick="closeLedger()" class="close-x">×</button>
                </div>
                <div id="ledgerContent" class="ledger-scroll"></div>
                <div class="ledger-footer">
                    <span>الرصيد الحالي: </span>
                    <b id="ledgerFinalBalance">0.00</b>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

let allAccountsCache = [];

// --- 1. العرض والبحث ---

function loadAndRenderAccounts() {
    dbGetAllAccounts(function(accounts) {
        allAccountsCache = accounts;
        renderTree(accounts);
    });
}

function renderTree(accountsToRender) {
    const container = document.getElementById('chart-container');
    
    if (accountsToRender.length === 0) {
        container.innerHTML = '<p class="no-data">لا توجد حسابات مطابقة</p>';
        return;
    }

    const isSearching = document.getElementById('accSearch') && document.getElementById('accSearch').value.length > 0;

    if (isSearching) {
        let html = '<div class="flat-list">';
        accountsToRender.forEach(acc => {
            html += createAccountItemHTML(acc, false);
        });
        html += '</div>';
        container.innerHTML = html;
    } else {
        const treeHTML = buildAccountTree(accountsToRender, 0); 
        container.innerHTML = treeHTML;
    }
}

function buildAccountTree(accounts, parentId = 0) {
    const children = accounts.filter(acc => acc.parentId === parentId);
    if (children.length === 0) return '';

    children.sort((a, b) => a.code - b.code);

    let html = '';
    children.forEach(acc => {
        const subMenu = buildAccountTree(accounts, acc.id);
        const hasChildren = subMenu !== '';
        
        html += `
            <div class="tree-node">
                ${createAccountItemHTML(acc, hasChildren)}
                ${subMenu}
            </div>
        `;
    });
    return html;
}

function createAccountItemHTML(acc, isParent) {
    const icon = isParent ? '📂' : '📄';
    const styleClass = isParent ? 'acc-parent' : 'acc-leaf';
    
    return `
        <div class="account-row ${styleClass}">
            <div class="acc-info" onclick="openLedger(${acc.id})">
                <span class="acc-code">${acc.code}</span>
                <span class="acc-name">${icon} ${acc.name}</span>
            </div>
            <div class="acc-actions">
                <button onclick="editAccount(${acc.id})" class="act-btn edit">✏️</button>
                <button onclick="deleteAccount(${acc.id})" class="act-btn del">🗑️</button>
            </div>
        </div>
    `;
}

function filterAccounts(query) {
    if (!query) {
        renderTree(allAccountsCache);
        return;
    }
    const lowerQ = query.toLowerCase();
    const filtered = allAccountsCache.filter(a => 
        a.name.toLowerCase().includes(lowerQ) || 
        a.code.toString().includes(lowerQ)
    );
    renderTree(filtered);
}

// --- 2. كشف الحساب (Ledger) ---

function openLedger(accountId) {
    const acc = allAccountsCache.find(a => a.id === accountId);
    if (!acc) return;

    document.getElementById('ledgerTitle').innerText = `كشف حساب: ${acc.name} (${acc.code})`;
    const container = document.getElementById('ledgerContent');
    container.innerHTML = '<p class="loading">جارِ جلب الحركات...</p>';
    
    // إظهار النافذة
    const modal = document.getElementById('ledgerModal');
    modal.style.display = 'flex'; // تفعيل فليكس للمحاذاة

    dbGetAllJournals(function(journals) {
        let html = `
            <table class="ledger-table">
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>البيان</th>
                        <th>مدين</th>
                        <th>دائن</th>
                        <th>رصيد</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let balance = 0;
        const accMovements = [];
        journals.forEach(j => {
            j.details.forEach(det => {
                if (det.accountId == accountId) {
                    accMovements.push({
                        date: j.date,
                        desc: j.description,
                        debit: det.debit,
                        credit: det.credit,
                        jid: j.id
                    });
                }
            });
        });

        if (accMovements.length === 0) {
            container.innerHTML = '<div class="empty-state">لا توجد حركات مسجلة على هذا الحساب</div>';
            document.getElementById('ledgerFinalBalance').innerText = "0.00";
            return;
        }

        accMovements.sort((a, b) => new Date(a.date) - new Date(b.date));

        accMovements.forEach(move => {
            balance += (move.debit - move.credit);
            html += `
                <tr>
                    <td>${move.date}</td>
                    <td><small>#${move.jid}</small> ${move.desc}</td>
                    <td class="num">${move.debit > 0 ? formatMoney(move.debit) : '-'}</td>
                    <td class="num">${move.credit > 0 ? formatMoney(move.credit) : '-'}</td>
                    <td class="num bold" style="color:${balance >= 0 ? 'green' : 'red'}">${formatMoney(Math.abs(balance))} ${balance >= 0 ? 'م' : 'د'}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
        document.getElementById('ledgerFinalBalance').innerText = formatMoney(balance);
        document.getElementById('ledgerFinalBalance').style.color = balance >= 0 ? 'green' : 'red';
    });
}

function closeLedger() {
    document.getElementById('ledgerModal').style.display = 'none';
}

// --- 3. إدارة الحسابات ---

function deleteAccount(id) {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;

    const hasChildren = allAccountsCache.some(a => a.parentId === id);
    if (hasChildren) return alert("لا يمكن حذف حساب رئيسي يحتوي على فروع.");

    dbGetAllJournals(function(journals) {
        let hasJournals = false;
        for (let j of journals) {
            if (j.details.some(d => d.accountId == id)) {
                hasJournals = true;
                break;
            }
        }

        if (hasJournals) return alert("الحساب مستخدم في قيود يومية.");

        const request = indexedDB.open('MyAccountingDB', 4);
        request.onsuccess = function(e) {
            const db = e.target.result;
            const tx = db.transaction(['accounts'], 'readwrite');
            tx.objectStore('accounts').delete(id).onsuccess = function() {
                alert("تم الحذف");
                loadAndRenderAccounts();
            };
        };
    });
}

function editAccount(id) {
    const acc = allAccountsCache.find(a => a.id === id);
    const newName = prompt("تعديل اسم الحساب:", acc.name);
    
    if (newName && newName !== acc.name) {
        const request = indexedDB.open('MyAccountingDB', 4);
        request.onsuccess = function(e) {
            const db = e.target.result;
            const tx = db.transaction(['accounts'], 'readwrite');
            acc.name = newName;
            tx.objectStore('accounts').put(acc).onsuccess = function() {
                loadAndRenderAccounts();
            };
        };
    }
}

// --- 4. واجهة الإضافة (المدمجة) ---
function initAddAccountFeature() {
    // الزر العائم
    const tab2 = document.getElementById('tab2');
    if (tab2 && !document.getElementById('addAccBtn')) {
        const btn = document.createElement('button');
        btn.id = 'addAccBtn';
        btn.className = 'fab-btn';
        btn.innerHTML = '+';
        btn.onclick = openAddAccountModal;
        tab2.appendChild(btn);
    }
    
    // مودال الإضافة
    if (!document.getElementById('addAccountModal')) {
        const div = document.createElement('div');
        div.id = 'addAccountModal';
        div.className = 'modal-overlay';
        div.style.display = 'none'; // إخفاء
        div.innerHTML = `
            <div class="modal-box">
                <h4>إضافة حساب جديد</h4>
                <input type="text" id="newAccountName" class="input-field" placeholder="اسم الحساب">
                <input type="number" id="newAccountCode" class="input-field" placeholder="رقم الحساب">
                <select id="parentAccountSelect" class="input-field"></select>
                <div class="modal-buttons">
                    <button id="btnSaveAcc" class="btn-save">حفظ</button>
                    <button id="btnCancelAcc" class="btn-cancel">إلغاء</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        document.getElementById('btnSaveAcc').onclick = saveNewAccount;
        document.getElementById('btnCancelAcc').onclick = () => document.getElementById('addAccountModal').style.display = 'none';
    }
}

function openAddAccountModal() {
    const modal = document.getElementById('addAccountModal');
    const select = document.getElementById('parentAccountSelect');
    select.innerHTML = '<option value="0">--- رئيسي ---</option>';
    allAccountsCache.sort((a,b) => a.code - b.code);
    allAccountsCache.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.id;
        option.textContent = `${acc.code} - ${acc.name}`;
        select.appendChild(option);
    });
    modal.style.display = 'flex';
}

function saveNewAccount() {
    const name = document.getElementById('newAccountName').value;
    const code = document.getElementById('newAccountCode').value;
    const parentId = parseInt(document.getElementById('parentAccountSelect').value);

    if (!name || !code) return alert("البيانات ناقصة");
    if (allAccountsCache.some(a => a.code == code)) return alert("الكود مكرر");

    dbAddAccount({ name, code, parentId }, () => {
        alert("تم الحفظ");
        document.getElementById('addAccountModal').style.display = 'none';
        document.getElementById('newAccountName').value = '';
        document.getElementById('newAccountCode').value = '';
        loadAndRenderAccounts();
    }, (e) => alert("خطأ في الحفظ"));
}

// --- 5. التنسيقات (محدثة لتشمل النافذة) ---

function injectTreeStyles() {
    if (document.getElementById('tree-css')) return;
    const s = document.createElement('style');
    s.id = 'tree-css';
    s.innerHTML = `
        .search-box { padding: 10px; background: #fff; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 10; }
        .search-box input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 20px; font-size: 11px; text-align: center; background: #f9f9f9; outline: none; }
        .search-box input:focus { border-color: #3498db; background: #fff; }

        .account-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 4px; border-bottom: 1px solid #f0f0f0; transition: 0.2s; }
        .account-row:hover { background: #fdfdfd; }
        
        .acc-info { flex-grow: 1; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .acc-code { background: #eee; color: #555; padding: 2px 5px; border-radius: 4px; font-size: 9px; font-family: monospace; }
        .acc-name { font-size: 11px; color: #333; }
        .acc-parent .acc-name { font-weight: bold; color: #2c3e50; }
        .tree-node { margin-right: 12px; border-right: 1px dashed #e0e0e0; }

        .acc-actions { display: flex; gap: 5px; }
        .act-btn { border: none; background: none; font-size: 12px; cursor: pointer; opacity: 0.5; padding: 2px; }

        /* تنسيقات النافذة المنبثقة (Modal Styles) - مضافة هنا لضمان عملها */
        .modal-overlay { 
            display: none; /* إخفاء افتراضي */
            position: fixed; 
            top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0,0,0,0.5); 
            z-index: 9999; /* رقم عالي جداً ليظهر فوق الكل */
            align-items: center; 
            justify-content: center; 
        }
        
        .modal-box { 
            background: white; 
            width: 90%; 
            max-width: 400px; 
            border-radius: 8px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); 
            overflow: hidden;
        }

        .modal-header-l { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; background: #f8f9fa; }
        .modal-header-l h4 { margin: 0; font-size: 12px; color: #2c3e50; }
        .close-x { border: none; background: none; font-size: 20px; color: #999; cursor: pointer; }
        
        .ledger-scroll { flex-grow: 1; overflow-y: auto; padding: 10px; background: #fff; }
        
        .ledger-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .ledger-table th { background: #2c3e50; color: white; padding: 6px; text-align: center; position: sticky; top: 0; }
        .ledger-table td { border-bottom: 1px solid #eee; padding: 6px 4px; }
        .ledger-table td.num { text-align: left; direction: ltr; font-family: monospace; }
        .ledger-table td.bold { font-weight: bold; }
        
        .ledger-footer { padding: 10px; background: #ecf0f1; border-top: 1px solid #bdc3c7; display: flex; justify-content: space-between; font-size: 12px; color: #2c3e50; }
        .empty-state { text-align: center; color: #999; margin-top: 50px; font-size: 11px; }
    `;
    document.head.appendChild(s);
}
 