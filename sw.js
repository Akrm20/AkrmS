const CACHE_NAME = 'accounting-app-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',     // قمنا بتغيير اسم In.html إلى index.html (ضروري لـ Github)
    './Db.js',
    './Tree.js',
    './Ju.js',
    './Fin.js',
    './Re.js',
    './Setting.js',
    './xlsx.full.min.js', // تأكد أنك حملت الملف
    './chart.js',         // تأكد أنك حملت الملف
    './manifest.json'
];

// 1. التثبيت: حفظ الملفات في الكاش
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('جاري حفظ ملفات النظام...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. التفعيل: تنظيف الكاش القديم إذا قمت بتحديث الكود مستقبلاً
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

// 3. الجلب: استخدام الكاش عند انقطاع النت
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // إذا وجد الملف في الكاش، ارجعه. وإلا حاول جلبه من النت
            return cachedResponse || fetch(event.request);
        })
    );
});