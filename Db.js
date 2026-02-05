// === Db.js: قاعدة البيانات الشاملة (SOCPA + إدارة كاملة) ===

let db;
const DB_NAME = 'MyAccountingDB';
const DB_VERSION = 5; // تم رفع الإصدار للتحديث الإجباري

const request = indexedDB.open(DB_NAME, DB_VERSION);

// 1. التعامل مع الأخطاء والنجاح
request.onerror = function(event) {
    console.error("Database error: " + event.target.errorCode);
    alert("تعذر فتح قاعدة البيانات. حاول مسح بيانات الموقع من المتصفح.");
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log("Database opened successfully");
    
    // تشغيل النظام بعد التأكد من جاهزية القاعدة
    if (typeof startSystem === 'function') {
        setTimeout(startSystem, 500); 
    }
};

// 2. إنشاء الجداول وتعبئة البيانات (مرة واحدة عند التأسيس)
request.onupgradeneeded = function(event) {
    db = event.target.result;
    
    // تنظيف الجداول القديمة لضمان عدم تعارض الهيكل
    if (db.objectStoreNames.contains('accounts')) db.deleteObjectStore('accounts');
    if (db.objectStoreNames.contains('journals')) db.deleteObjectStore('journals');
    if (db.objectStoreNames.contains('report_data')) db.deleteObjectStore('report_data');

    // أ) جدول الحسابات
    const accStore = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
    accStore.createIndex('parentId', 'parentId', { unique: false });
    accStore.createIndex('code', 'code', { unique: true });

    // ب) جدول القيود
    const journalStore = db.createObjectStore('journals', { keyPath: 'id', autoIncrement: true });
    journalStore.createIndex('date', 'date', { unique: false });

    // ج) جدول إعدادات التقارير
    db.createObjectStore('report_data', { keyPath: 'id' });

    // === تعبئة دليل SOCPA القياسي ===
    accStore.transaction.oncomplete = function() {
        const accTrans = db.transaction("accounts", "readwrite").objectStore("accounts");
        
        // الدليل الشجري الكامل (مع المعرفات اليدوية لضمان الربط الصحيح)
        const initialAccounts = [
            // الأصول
            { id: 1, code: '1', name: 'الأصول', type: 'asset', parentId: 0, balance: 0 },
            { id: 2, code: '11', name: 'الأصول المتداولة', type: 'asset', parentId: 1, balance: 0 },
            { id: 3, code: '12', name: 'الأصول غير المتداولة', type: 'asset', parentId: 1, balance: 0 },
            
            { code: '111', name: 'الصندوق (النقدية)', type: 'asset', parentId: 2, balance: 0 },
            { code: '112', name: 'البنوك', type: 'asset', parentId: 2, balance: 0 },
            { code: '113', name: 'المخزون', type: 'asset', parentId: 2, balance: 0 },
            { code: '114', name: 'المدينون (العملاء)', type: 'asset', parentId: 2, balance: 0 },
            { code: '115', name: 'عهد ومصاريف مدفوعة مقدماً', type: 'asset', parentId: 2, balance: 0 },

            { code: '121', name: 'المباني والأراضي', type: 'asset', parentId: 3, balance: 0 },
            { code: '122', name: 'السيارات', type: 'asset', parentId: 3, balance: 0 },
            { code: '123', name: 'الأثاث والمفروشات', type: 'asset', parentId: 3, balance: 0 },
            { code: '124', name: 'أجهزة ومعدات', type: 'asset', parentId: 3, balance: 0 },

            // الخصوم
            { id: 20, code: '2', name: 'الخصوم (الالتزامات)', type: 'liability', parentId: 0, balance: 0 },
            { id: 21, code: '21', name: 'الخصوم المتداولة', type: 'liability', parentId: 20, balance: 0 },
            { id: 22, code: '22', name: 'الخصوم غير المتداولة', type: 'liability', parentId: 20, balance: 0 },
            
            { code: '211', name: 'الموردون', type: 'liability', parentId: 21, balance: 0 },
            { code: '212', name: 'مخصص الزكاة الشرعية', type: 'liability', parentId: 21, balance: 0 },
            { code: '213', name: 'الضريبة المستحقة', type: 'liability', parentId: 21, balance: 0 },
            { code: '214', name: 'مصاريف مستحقة', type: 'liability', parentId: 21, balance: 0 },

            { code: '221', name: 'مخصص مكافأة نهاية الخدمة', type: 'liability', parentId: 22, balance: 0 },
            { code: '222', name: 'قروض طويلة الأجل', type: 'liability', parentId: 22, balance: 0 },

            // حقوق الملكية
            { id: 30, code: '3', name: 'حقوق الملكية', type: 'equity', parentId: 0, balance: 0 },
            { code: '31', name: 'رأس المال', type: 'equity', parentId: 30, balance: 0 },
            { code: '32', name: 'الاحتياطي النظامي', type: 'equity', parentId: 30, balance: 0 },
            { code: '33', name: 'الأرباح المبقاة', type: 'equity', parentId: 30, balance: 0 },
            { code: '34', name: 'جاري الشركاء', type: 'equity', parentId: 30, balance: 0 },

            // الإيرادات
            { id: 40, code: '4', name: 'الإيرادات', type: 'revenue', parentId: 0, balance: 0 },
            { code: '41', name: 'المبيعات', type: 'revenue', parentId: 40, balance: 0 },
            { code: '42', name: 'إيرادات أخرى', type: 'revenue', parentId: 40, balance: 0 },

            // المصروفات
            { id: 50, code: '5', name: 'المصروفات', type: 'expense', parentId: 0, balance: 0 },
            { code: '51', name: 'تكلفة المبيعات', type: 'expense', parentId: 50, balance: 0 },
            { code: '52', name: 'مصاريف البيع والتسويق', type: 'expense', parentId: 50, balance: 0 },
            
            { id: 53, code: '53', name: 'مصاريف إدارية وعمومية', type: 'expense', parentId: 50, balance: 0 },
            { code: '531', name: 'رواتب وأجور', type: 'expense', parentId: 53, balance: 0 },
            { code: '532', name: 'إيجارات', type: 'expense', parentId: 53, balance: 0 },
            { code: '533', name: 'كهرباء ومياه', type: 'expense', parentId: 53, balance: 0 },
            { code: '534', name: 'رسوم حكومية', type: 'expense', parentId: 53, balance: 0 },

            { code: '54', name: 'مصاريف بنكية', type: 'expense', parentId: 50, balance: 0 },
            { code: '58', name: 'مصروف الزكاة', type: 'expense', parentId: 50, balance: 0 }
        ];

        initialAccounts.forEach(acc => {
            accTrans.add(acc);
        });
        
        console.log("SOCPA Chart of Accounts Initialized (Version 5).");
    };
};

// ============================================================
// دوال إدارة البيانات (CRUD Operations) - الجزء المفقود سابقاً
// ============================================================

// --- 1. دوال الحسابات (Accounts) ---

function dbGetAllAccounts(callback) {
    if (!db) return;
    const tx = db.transaction(['accounts'], 'readonly');
    const store = tx.objectStore('accounts');
    const req = store.getAll();
    req.onsuccess = (e) => callback(e.target.result);
    req.onerror = (e) => console.error("Error getting accounts:", e);
}

function dbAddAccount(data, onSuccess, onError) {
    if (!db) return;
    const tx = db.transaction(['accounts'], 'readwrite');
    const req = tx.objectStore('accounts').add(data);
    req.onsuccess = onSuccess;
    req.onerror = onError;
}

// الدالة المفقودة التي قد يحتاجها التعديل
function dbUpdateAccount(data, onSuccess, onError) {
    if (!db) return;
    const tx = db.transaction(['accounts'], 'readwrite');
    const req = tx.objectStore('accounts').put(data); // Put تستخدم للتعديل إذا كان الـ ID موجوداً
    req.onsuccess = onSuccess;
    req.onerror = onError;
}

function dbDeleteAccount(id, onSuccess, onError) {
    if (!db) return;
    const tx = db.transaction(['accounts'], 'readwrite');
    const req = tx.objectStore('accounts').delete(id);
    req.onsuccess = onSuccess;
    req.onerror = onError;
}

// --- 2. دوال القيود (Journals) - ضرورية لعمل تبويب القيود ---

function dbGetAllJournals(callback) {
    if (!db) return;
    const tx = db.transaction(['journals'], 'readonly');
    const req = tx.objectStore('journals').getAll();
    req.onsuccess = (e) => callback(e.target.result || []);
}

function dbAddJournal(data, onSuccess, onError) {
    if (!db) return;
    const tx = db.transaction(['journals'], 'readwrite');
    const req = tx.objectStore('journals').add(data);
    req.onsuccess = onSuccess;
    req.onerror = onError;
}

// هذه الدالة كانت مفقودة وتسبب عدم عمل زر التعديل
function dbUpdateJournal(data, onSuccess, onError) {
    if (!db) return;
    const tx = db.transaction(['journals'], 'readwrite');
    // تأكد من أن data تحتوي على id
    const req = tx.objectStore('journals').put(data);
    req.onsuccess = onSuccess;
    req.onerror = onError;
}

// هذه الدالة كانت مفقودة وتسبب عدم عمل زر الحذف
function dbDeleteJournal(id, onSuccess, onError) {
    if (!db) return;
    const tx = db.transaction(['journals'], 'readwrite');
    const req = tx.objectStore('journals').delete(id);
    req.onsuccess = onSuccess;
    req.onerror = onError;
}

// --- 3. دوال التقارير (Reports) ---

function dbGetReportData(callback) {
    if (!db) return;
    const tx = db.transaction(['report_data'], 'readonly');
    tx.objectStore('report_data').getAll().onsuccess = function(event) {
        const dataMap = {};
        event.target.result.forEach(item => {
            dataMap[item.id] = item.value;
        });
        callback(dataMap);
    };
}

function dbSaveReportData(id, value) {
    if (!db) return;
    const tx = db.transaction(['report_data'], 'readwrite');
    tx.objectStore('report_data').put({ id: id, value: value });
}

// دالة تنسيق المبالغ المالية - تضاف لتعمل في كافة أجزاء النظام
function formatMoney(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return "0.00";
    }
    return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
