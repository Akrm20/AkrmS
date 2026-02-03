// === Db.js: قاعدة البيانات (آمن ومحدث) ===

let db;
const DB_NAME = 'MyAccountingDB';
const DB_VERSION = 3; 

const request = indexedDB.open(DB_NAME, DB_VERSION);

// 1. إنشاء الجداول
request.onupgradeneeded = function(event) {
    db = event.target.result;
    
    if (db.objectStoreNames.contains('accounts')) db.deleteObjectStore('accounts');
    if (db.objectStoreNames.contains('journals')) db.deleteObjectStore('journals');
    if (db.objectStoreNames.contains('report_data')) db.deleteObjectStore('report_data');

    // أ) الحسابات
    const accStore = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
    accStore.createIndex('parentId', 'parentId', { unique: false });
    accStore.createIndex('code', 'code', { unique: true });

    // ب) القيود
    const journalStore = db.createObjectStore('journals', { keyPath: 'id', autoIncrement: true });
    journalStore.createIndex('date', 'date', { unique: false });

    // ج) التقارير
    db.createObjectStore('report_data', { keyPath: 'id' });

    // تعبئة البيانات (كما هي في الكود السابق..)
    accStore.transaction.oncomplete = function() {
        const trans = db.transaction("accounts", "readwrite").objectStore("accounts");
        const initialAccounts = [
            { id: 1, code: '1', name: 'الأصول', parentId: 0 },
            { id: 2, code: '2', name: 'الخصوم', parentId: 0 },
            { id: 3, code: '3', name: 'حقوق الملكية', parentId: 0 },
            { id: 4, code: '4', name: 'الإيرادات', parentId: 0 },
            { id: 5, code: '5', name: 'المصروفات', parentId: 0 },
            { id: 6, code: '11', name: 'أصول متداولة', parentId: 1 },
            { id: 7, code: '12', name: 'أصول غير متداولة', parentId: 1 },
            { id: 8, code: '111', name: 'النقدية وما في حكمها', parentId: 6 },
            { id: 9, code: '112', name: 'البنوك', parentId: 6 },
            { id: 10, code: '113', name: 'المخزون', parentId: 6 },
            { id: 11, code: '114', name: 'المدينون (العملاء)', parentId: 6 },
            { id: 12, code: '11111', name: 'الصناديق الرئيسية', parentId: 8 }, 
            { id: 13, code: '111111', name: 'حساب الصندوق (ريال)', parentId: 12 }, 
            { id: 14, code: '11211', name: 'حساب البنك التجاري', parentId: 9 },
            { id: 15, code: '11311', name: 'مخزون البضاعة', parentId: 10 }, 
            { id: 16, code: '11411', name: 'حساب العملاء الرئيسي', parentId: 11 }, 
            { id: 17, code: '114111', name: 'العميل فلان', parentId: 16 }, 
            { id: 18, code: '121', name: 'الممتلكات والمعدات', parentId: 7 },
            { id: 19, code: '1211', name: 'المباني', parentId: 18 },
            { id: 20, code: '12111', name: 'المبنى الرئيسي', parentId: 19 }, 
            { id: 21, code: '31', name: 'رأس المال', parentId: 3 },
            { id: 22, code: '31111', name: 'رأس المال المدفوع', parentId: 21 }, 
            { id: 23, code: '32', name: 'الاحتياطيات والأرباح', parentId: 3 },
            { id: 24, code: '32111', name: 'الأرباح المبقاة', parentId: 23 }, 
            { id: 25, code: '41', name: 'المبيعات', parentId: 4 }, 
            { id: 26, code: '51', name: 'تكلفة المبيعات', parentId: 5 },
            { id: 27, code: '511', name: 'تكلفة البضاعة المباعة', parentId: 26 }, 
            { id: 28, code: '52', name: 'مصاريف تشغيلية', parentId: 5 }, 
            { id: 29, code: '21', name: 'خصوم متداولة', parentId: 2 },
            { id: 30, code: '211', name: 'الموردين', parentId: 29 }, 
            { id: 31, code: '212', name: 'الالتزامات الضريبية', parentId: 29 },
            { id: 32, code: '2121', name: 'ضريبة القيمة المضافة', parentId: 31 },
            { id: 33, code: '21211', name: 'ضريبة مخرجات (مبيعات)', parentId: 32 }, 
            { id: 34, code: '21212', name: 'ضريبة مدخلات (مشتريات)', parentId: 32 }, 
            { id: 35, code: '21213', name: 'صافي الضريبة VAT', parentId: 32 } 
        ];
        initialAccounts.forEach(acc => trans.add(acc));
    };
};

// 2. عند جاهزية القاعدة (هنا سنشغل النظام)
request.onsuccess = function(event) {
    db = event.target.result;
    console.log("تم الاتصال وقاعدة البيانات جاهزة.");
    
    // تشغيل الوحدات
    if (typeof startSystem === 'function') startSystem(); // Tree.js
    if (typeof initJournalFeature === 'function') initJournalFeature(); // Ju.js
    if (typeof initFinancialReports === 'function') initFinancialReports(); // Fin.js
    
    // --- هام جداً: تشغيل الشاشة الرئيسية الآن فقط ---
    // هذا يضمن عدم حدوث الخطأ لأن db أصبح معرفاً
    if (typeof showTab === 'function') {
        showTab('tab1', document.querySelector('.tab-btn')); 
    }
};

request.onerror = function(event) {
    console.error("Database Error:", event.target.errorCode);
};

// ==========================================
// دوال الخدمة (API) مع حماية ضد الانهيار
// ==========================================

function dbGetAllAccounts(callback) {
    if (!db) return; // حماية: لو القاعدة مش جاهزة، اخرج بهدوء ولا تظهر خطأ
    const tx = db.transaction(['accounts'], 'readonly');
    tx.objectStore('accounts').getAll().onsuccess = (e) => callback(e.target.result);
}

function dbAddAccount(data, onSuccess, onError) {
    if (!db) return;
    const tx = db.transaction(['accounts'], 'readwrite');
    const req = tx.objectStore('accounts').add(data);
    req.onsuccess = onSuccess;
    req.onerror = onError;
}

function dbGetAllJournals(callback) {
    if (!db) return; // حماية
    const tx = db.transaction(['journals'], 'readonly');
    tx.objectStore('journals').getAll().onsuccess = (e) => callback(e.target.result);
}

function dbAddJournal(data, onSuccess, onError) {
    if (!db) return;
    const tx = db.transaction(['journals'], 'readwrite');
    const req = tx.objectStore('journals').add(data);
    req.onsuccess = onSuccess;
    req.onerror = onError;
}

function dbGetReportData(callback) {
    if (!db) return; // حماية
    const tx = db.transaction(['report_data'], 'readonly');
    tx.objectStore('report_data').getAll().onsuccess = function(event) {
        const dataMap = {};
        event.target.result.forEach(item => {
            dataMap[item.id] = item.value;
        });
        callback(dataMap);
    };
}

function dbSaveReportCell(id, value) {
    if (!db) return;
    const tx = db.transaction(['report_data'], 'readwrite');
    tx.objectStore('report_data').put({ id: id, value: value });
}
