// === Ju.js: واجهة القيود الاحترافية (Full Screen Modal) ===

let accountsCache = [];
let leafAccountsCache = [];

function initJournalFeature() {
    injectJournalStyles();
    
    // تحميل الحسابات وتصنيفها
    dbGetAllAccounts((accs) => {
        accountsCache = accs;
        const parentIds = new Set(accs.map(a => a.parentId));
        leafAccountsCache = accs.filter(a => !parentIds.has(a.id));
        leafAccountsCache.sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
        renderJournalList();
    });
}

// 1. الشاشة الرئيسية (القائمة)
function renderJournalList() {
    const tab3 = document.getElementById('tab3');
    
    tab3.innerHTML = `
        <div class="journal-header-sticky">
            <div class="header-top-row">
                <h3>دفتر القيود</h3>
                <button onclick="openJournalModal()" class="floating-add-btn">+</button>
            </div>
            <input type="text" id="jSearch" class="search-input" placeholder="🔍 ابحث برقم القيد، المبلغ، أو الحساب..." onkeyup="filterJournals(this.value)">
        </div>

        <div id="journals-container" class="journal-list-area">
            <div class="loading-spinner">جاري تحميل القيود...</div>
        </div>
    `;

    dbGetAllJournals((journals) => {
        const container = document.getElementById('journals-container');
        container.innerHTML = '';

        if (journals.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>لا توجد قيود.</p><small>اضغط (+) لإضافة قيد جديد</small></div>`;
            return;
        }

        journals.sort((a, b) => new Date(b.date) - new Date(a.date));

        journals.forEach(j => {
            const total = j.details.reduce((sum, d) => sum + Number(d.debit), 0);
            const accNames = j.details.slice(0, 2).map(d => {
                const acc = accountsCache.find(a => a.id == d.accountId);
                return acc ? acc.name : '?';
            }).join('، ');

            const card = document.createElement('div');
            card.className = 'journal-card';
            card.onclick = (e) => { if(e.target.tagName !== 'BUTTON') openJournalModal(j.id); };

            card.innerHTML = `
                <div class="card-side-color"></div>
                <div class="card-content">
                    <div class="card-header">
                        <span class="card-id">#${j.id}</span>
                        <span class="card-date">${j.date}</span>
                    </div>
                    <div class="card-desc">${j.desc || 'بدون بيان'}</div>
                    <div class="card-accs">${accNames} ${j.details.length > 2 ? `(+${j.details.length - 2})` : ''}</div>
                </div>
                <div class="card-amount">
                    <span>${formatMoney(total)}</span>
                    <button onclick="deleteJournalEntry(${j.id}, event)" class="card-del-btn">🗑️</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// 2. النافذة المنبثقة (Modal) - التصميم الجديد
function openJournalModal(journalId = null) {
    let modal = document.getElementById('fullScreenModal');
    if (!modal) {
        createFullScreenModal();
        modal = document.getElementById('fullScreenModal');
    }

    // تهيئة الحقول
    document.getElementById('jDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('jDesc').value = '';
    document.getElementById('rowsContainer').innerHTML = '';
    document.getElementById('currentJournalId').value = '';
    document.getElementById('modalTitle').innerText = 'قيد يومية جديد';

    // إعادة تعيين المجاميع
    updateTotals();

    if (journalId) {
        document.getElementById('modalTitle').innerText = `تعديل القيد #${journalId}`;
        document.getElementById('currentJournalId').value = journalId;
        
        dbGetAllJournals((journals) => {
            const journal = journals.find(j => j.id == journalId);
            if (journal) {
                document.getElementById('jDate').value = journal.date;
                document.getElementById('jDesc').value = journal.desc;
                journal.details.forEach(det => addRow(det));
                updateTotals();
            }
        });
    } else {
        // إضافة صفين افتراضياً
        addRow();
        addRow();
    }

    modal.style.display = 'flex'; // إظهار النافذة
}

function closeJournalModal() {
    document.getElementById('fullScreenModal').style.display = 'none';
}

// إضافة صف جديد (بتصميم البطاقة)
function addRow(data = null) {
    const container = document.getElementById('rowsContainer');
    const row = document.createElement('div');
    row.className = 'entry-row-card'; 
    
    // بناء خيارات الحساب
    let options = `<option value="">اختر الحساب...</option>`;
    leafAccountsCache.forEach(acc => {
        const selected = (data && data.accountId == acc.id) ? 'selected' : '';
        options += `<option value="${acc.id}" ${selected}>${acc.code} - ${acc.name}</option>`;
    });

    row.innerHTML = `
        <div class="row-header">
            <select class="acc-select-lg">${options}</select>
            <button class="row-del-btn" onclick="this.closest('.entry-row-card').remove(); updateTotals();">✕</button>
        </div>
        <div class="row-inputs">
            <div class="input-box deb-box">
                <label>مدين</label>
                <input type="number" class="num-input deb-in" value="${data ? data.debit : ''}" oninput="updateTotals()" placeholder="0">
            </div>
            <div class="input-box cred-box">
                <label>دائن</label>
                <input type="number" class="num-input cred-in" value="${data ? data.credit : ''}" oninput="updateTotals()" placeholder="0">
            </div>
        </div>
    `;

    container.appendChild(row);
    
    // تمرير الشاشة للأسفل لرؤية الصف الجديد
    if(!data) {
        setTimeout(() => {
            const body = document.querySelector('.modal-body');
            body.scrollTop = body.scrollHeight;
        }, 50);
    }
}

function updateTotals() {
    let tDeb = 0, tCred = 0;

    document.querySelectorAll('.deb-in').forEach(i => tDeb += Number(i.value));
    document.querySelectorAll('.cred-in').forEach(i => tCred += Number(i.value));

    document.getElementById('dispDeb').innerText = formatMoney(tDeb);
    document.getElementById('dispCred').innerText = formatMoney(tCred);

    const diff = tDeb - tCred;
    const diffEl = document.getElementById('dispDiff');
    const saveBtn = document.getElementById('saveBtn');

    // منطق التوازن
    if (Math.abs(diff) < 0.01 && tDeb > 0) {
        diffEl.style.color = '#2ecc71';
        diffEl.innerHTML = '✔ 0.00';
        saveBtn.disabled = false;
        saveBtn.classList.remove('disabled');
    } else {
        diffEl.style.color = '#e74c3c';
        diffEl.innerHTML = formatMoney(Math.abs(diff));
        saveBtn.disabled = true;
        saveBtn.classList.add('disabled');
    }
}

function saveJournal() {
    const id = document.getElementById('currentJournalId').value;
    const date = document.getElementById('jDate').value;
    const desc = document.getElementById('jDesc').value;
    
    if (!date || !desc) { alert("يجب إدخال التاريخ وشرح القيد"); return; }

    const details = [];
    const rows = document.querySelectorAll('.entry-row-card');
    
    for (let row of rows) {
        const accId = row.querySelector('.acc-select-lg').value;
        const debit = Number(row.querySelector('.deb-in').value) || 0;
        const credit = Number(row.querySelector('.cred-in').value) || 0;

        if (!accId && debit === 0 && credit === 0) continue; 
        if (!accId) { alert("يجب اختيار الحساب لجميع الأطراف"); return; }
        // منع وجود مدين ودائن في نفس السطر (اختياري، لكن يفضل في المحاسبة)
        if (debit > 0 && credit > 0) { alert("لا يمكن أن يكون الحساب مديناً ودائناً في نفس الوقت"); return; }

        details.push({ accountId: Number(accId), debit: debit, credit: credit });
    }

    if (details.length < 2) { alert("القيد يتطلب طرفين على الأقل"); return; }

    const journalData = { date: date, desc: desc, details: details };

    if (id) {
        journalData.id = Number(id);
        dbUpdateJournal(journalData, () => { closeJournalModal(); renderJournalList(); }, (e) => alert("خطأ"));
    } else {
        dbAddJournal(journalData, () => { closeJournalModal(); renderJournalList(); }, (e) => alert("خطأ"));
    }
}

function deleteJournalEntry(id, event) {
    if (event) event.stopPropagation();
    if (confirm("هل أنت متأكد من الحذف؟")) {
        dbDeleteJournal(id, () => renderJournalList(), (e) => alert("فشل الحذف"));
    }
}

function filterJournals(query) {
    const term = query.toLowerCase();
    document.querySelectorAll('.journal-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
    });
}

// إنشاء هيكل النافذة
function createFullScreenModal() {
    const div = document.createElement('div');
    div.id = 'fullScreenModal';
    div.className = 'fs-modal';
    div.style.display = 'none';
    
    div.innerHTML = `
        <div class="modal-header">
            <button onclick="closeJournalModal()" class="btn-cancel">إلغاء</button>
            <h3 id="modalTitle">قيد جديد</h3>
            <button id="saveBtn" onclick="saveJournal()" disabled class="btn-save disabled">حفظ</button>
        </div>

        <div class="modal-body">
            <input type="hidden" id="currentJournalId">
            
            <div class="meta-section">
                <div class="input-group">
                    <label>التاريخ</label>
                    <input type="date" id="jDate" class="std-input">
                </div>
                <div class="input-group">
                    <label>الشرح (البيان)</label>
                    <textarea id="jDesc" class="std-input" rows="2" placeholder="اكتب شرحاً وافياً للقيد..."></textarea>
                </div>
            </div>

            <div class="rows-label">أطراف القيد:</div>
            <div id="rowsContainer"></div>

            <button onclick="addRow()" class="big-add-btn">+ إضافة طرف آخر</button>
            
            <div style="height: 100px;"></div>
        </div>

        <div class="modal-footer">
            <div class="stat-item">
                <span class="lbl">إجمالي مدين</span>
                <span class="val deb-color" id="dispDeb">0.00</span>
            </div>
            <div class="stat-item">
                <span class="lbl">إجمالي دائن</span>
                <span class="val cred-color" id="dispCred">0.00</span>
            </div>
            <div class="stat-item diff">
                <span class="lbl">الفرق</span>
                <span class="val" id="dispDiff" style="color:red">0.00</span>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// التنسيقات (CSS)
function injectJournalStyles() {
    if (document.getElementById('ju-css')) return;
    const s = document.createElement('style');
    s.id = 'ju-css';
    s.innerHTML = `
        /* --- القائمة الرئيسية --- */
        .journal-header-sticky { position: sticky; top: 0; background: #f4f4f4; padding: 15px; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .header-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .floating-add-btn { 
            width: 35px; height: 35px; background: #2c3e50; color: white; border: none; 
            border-radius: 50%; font-size: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer;
        }
        .search-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 12px; box-sizing: border-box; }
        .journal-list-area { padding: 10px; padding-bottom: 80px; }

        /* --- بطاقة القيد في القائمة --- */
        .journal-card { 
            background: white; border-radius: 8px; margin-bottom: 10px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; overflow: hidden; cursor: pointer; position: relative;
        }
        .card-side-color { width: 5px; background: #3498db; }
        .card-content { flex: 1; padding: 10px; }
        .card-header { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: #888; }
        .card-desc { font-weight: bold; color: #2c3e50; font-size: 12px; margin-bottom: 3px; }
        .card-accs { font-size: 10px; color: #7f8c8d; }
        .card-amount { 
            padding: 10px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; 
            background: #fbfbfb; border-left: 1px solid #f0f0f0; min-width: 70px;
        }
        .card-amount span { font-weight: bold; color: #27ae60; font-size: 11px; }
        .card-del-btn { background: none; border: none; font-size: 14px; margin-top: 5px; color: #e74c3c; }

        /* --- النافذة المنبثقة (Full Screen Modal) --- */
        .fs-modal { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: #f4f6f8; z-index: 2000; display: flex; flex-direction: column; 
        }

        /* 1. الهيدر */
        .modal-header { 
            height: 50px; background: white; border-bottom: 1px solid #ddd; display: flex; 
            justify-content: space-between; align-items: center; padding: 0 15px; flex-shrink: 0;
        }
        .modal-header h3 { margin: 0; font-size: 14px; color: #2c3e50; }
        .btn-cancel { background: none; border: none; color: #e74c3c; font-size: 13px; font-weight: bold; }
        .btn-save { background: #27ae60; color: white; border: none; padding: 6px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .btn-save.disabled { background: #ccc; cursor: not-allowed; }

        /* 2. الجسم */
        .modal-body { flex: 1; overflow-y: auto; padding: 15px; }
        
        .meta-section { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .input-group { margin-bottom: 10px; }
        .input-group label { display: block; font-size: 10px; color: #7f8c8d; margin-bottom: 4px; }
        .std-input { width: 100%; padding: 8px; border: 1px solid #eee; border-radius: 4px; font-size: 12px; box-sizing: border-box; background: #fcfcfc; font-family: inherit; }

        .rows-label { font-size: 11px; font-weight: bold; color: #555; margin-bottom: 8px; }

        /* بطاقة الصف (Row Card) */
        .entry-row-card { 
            background: white; border-radius: 8px; padding: 12px; margin-bottom: 10px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #eee;
        }
        .row-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .acc-select-lg { 
            width: 88%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; 
            font-size: 11px; font-weight: bold; color: #2c3e50; background: #fff;
        }
        .row-del-btn { width: 25px; height: 25px; background: #ffebeb; color: red; border: none; border-radius: 50%; font-weight: bold; }

        .row-inputs { display: flex; gap: 10px; }
        .input-box { flex: 1; }
        .input-box label { display: block; font-size: 9px; margin-bottom: 2px; text-align: center; }
        .deb-box label { color: #27ae60; }
        .cred-box label { color: #c0392b; }
        
        .num-input { 
            width: 100%; padding: 10px; border: 1px solid #eee; border-radius: 4px; 
            text-align: center; font-size: 13px; font-weight: bold; box-sizing: border-box; 
            /* حجم مناسب للإصبع */
        }
        .deb-in:focus { border-color: #27ae60; background: #f0fff4; }
        .cred-in:focus { border-color: #c0392b; background: #fff5f5; }

        .big-add-btn { 
            width: 100%; padding: 12px; background: white; border: 2px dashed #3498db; 
            color: #3498db; font-weight: bold; border-radius: 8px; cursor: pointer; margin-top: 5px;
        }

        /* 3. الفوتر (Sticky Footer) */
        .modal-footer { 
            height: 50px; background: #fff; border-top: 1px solid #ccc; display: flex; 
            justify-content: space-between; align-items: center; padding: 0 15px; flex-shrink: 0;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
        }
        .stat-item { display: flex; flex-direction: column; align-items: center; font-size: 9px; color: #7f8c8d; }
        .stat-item .val { font-size: 11px; font-weight: bold; font-family: monospace; margin-top: 2px; }
        .deb-color { color: #27ae60; }
        .cred-color { color: #c0392b; }
        .stat-item.diff .val { font-size: 12px; }
    `;
    document.head.appendChild(s);
}
