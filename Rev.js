// === Review.js: نظام المراجعة الشامل (مصحح الهيكلية) ===

// دالة مساعدة لجلب الحسابات والقيود معاً
function fetchReviewData(callback) {
    if (!db) return;

    // 1. جلب الحسابات لترجمة الأرقام إلى أسماء
    const txAcc = db.transaction(['accounts'], 'readonly');
    txAcc.objectStore('accounts').getAll().onsuccess = (e1) => {
        const accounts = e1.target.result || [];
        
        // 2. جلب القيود
        const txJour = db.transaction(['journals'], 'readonly');
        txJour.objectStore('journals').getAll().onsuccess = (e2) => {
            const journals = e2.target.result || [];
            callback(accounts, journals);
        };
    };
}

function injectReviewButton() {
    const header = document.querySelector('.header-top-row');
    if (header && !document.getElementById('review-btn')) {
        const btn = document.createElement('button');
        btn.id = 'review-btn';
        btn.innerHTML = '📋 كشف تفصيلي';
        btn.style = "background: #2c3e50; color: #f1c40f; border: 1px solid #f1c40f; padding: 5px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; margin-right: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);";
        
        btn.onclick = openReviewModal;
        header.appendChild(btn);
    }
}

function openReviewModal() {
    fetchReviewData((accounts, journals) => {
        // إنشاء خريطة سريعة للبحث عن أسماء الحسابات بالرقم
        // Map: ID -> Name
        const accMap = {};
        accounts.forEach(a => accMap[a.id] = a.name);

        let modal = document.getElementById('reviewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reviewModal';
            modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(240, 242, 245, 1); z-index:99999; overflow-y:auto; font-family: Tahoma, sans-serif; direction:rtl;";
            document.body.appendChild(modal);
        }

        const safeJournals = Array.isArray(journals) ? journals : [];
        let contentHtml = "";

        if (safeJournals.length === 0) {
            contentHtml = `
                <div style="text-align:center; padding-top:100px; color:#bdc3c7;">
                    <h1 style="font-size:60px; margin:0;">📭</h1>
                    <h3>لا توجد قيود مسجلة</h3>
                </div>`;
        } else {
            // ترتيب القيود: الأحدث أولاً
            const sortedJournals = [...safeJournals].sort((a, b) => new Date(b.date) - new Date(a.date));

            contentHtml = sortedJournals.map(j => {
                // استخدام details بدلاً من entries
                const details = j.details || [];
                
                let totalDeb = 0;
                let totalCred = 0;

                const rows = details.map(d => {
                    // البحث عن اسم الحساب باستخدام المعرف accountId
                    const accName = accMap[d.accountId] || `حساب مجهول (${d.accountId})`;
                    
                    const deb = Number(d.debit || 0);
                    const cred = Number(d.credit || 0);
                    totalDeb += deb;
                    totalCred += cred;

                    return `
                        <tr style="border-bottom: 1px solid #f1f2f6;">
                            <td style="padding: 8px; color: #2c3e50;">${accName}</td>
                            <td style="padding: 8px; text-align: center; color: #27ae60; background: #f9fff9; font-family:monospace; font-size:12px;">${deb > 0 ? deb.toLocaleString() : '-'}</td>
                            <td style="padding: 8px; text-align: center; color: #c0392b; background: #fff5f5; font-family:monospace; font-size:12px;">${cred > 0 ? cred.toLocaleString() : '-'}</td>
                        </tr>
                    `;
                }).join('');

                return `
                    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 25px; border: 1px solid #eee; overflow: hidden;">
                        <div style="background: #fff; padding: 12px 15px; border-bottom: 2px solid #f39c12; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-weight: 900; color: #2c3e50; font-size: 14px;">قيد رقم #${j.id}</span>
                                <span style="display:block; font-size: 11px; color: #7f8c8d; margin-top:2px;">📅 ${j.date}</span>
                            </div>
                            <div style="text-align:left;">
                                <span style="background:#ecf0f1; padding:4px 8px; border-radius:4px; font-size:10px; color:#2c3e50;">${details.length} أطراف</span>
                            </div>
                        </div>
                        
                        <div style="padding: 15px;">
                            <div style="background:#fcfcfc; padding:8px; border-right:3px solid #3498db; margin-bottom:10px; color:#34495e; font-size:12px;">
                                ${j.desc || 'لا يوجد شرح'}
                            </div>

                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead>
                                    <tr style="background: #2c3e50; color: white;">
                                        <th style="padding: 8px; text-align: right; border-radius: 0 4px 0 0;">الحساب</th>
                                        <th style="padding: 8px; width: 80px; text-align: center;">مدين</th>
                                        <th style="padding: 8px; width: 80px; text-align: center; border-radius: 4px 0 0 0;">دائن</th>
                                    </tr>
                                </thead>
                                <tbody>${rows}</tbody>
                                <tfoot>
                                    <tr style="background: #ecf0f1; font-weight: bold;">
                                        <td style="padding: 10px;">الإجمالي</td>
                                        <td style="padding: 10px; text-align: center; color: #27ae60;">${totalDeb.toLocaleString()}</td>
                                        <td style="padding: 10px; text-align: center; color: #c0392b;">${totalCred.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                `;
            }).join('');
        }

        modal.innerHTML = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="position: sticky; top: 0; background: rgba(240, 242, 245, 0.95); padding: 15px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dcdde1; z-index: 100;">
                    <h2 style="margin: 0; color: #2c3e50; font-size: 16px;">🔍 دفتر اليومية التفصيلي</h2>
                    <button onclick="document.getElementById('reviewModal').style.display='none'" style="background: #e74c3c; color: white; border: none; padding: 8px 20px; border-radius: 30px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(231, 76, 60, 0.3);">إغلاق</button>
                </div>
                <div style="padding-top:10px;">${contentHtml}</div>
                <div style="height:50px;"></div>
            </div>
        `;

        modal.style.display = 'block';
    });
}

// تشغيل المراقب
const observer = new MutationObserver(() => injectReviewButton());
observer.observe(document.body, { childList: true, subtree: true });

// تشغيل فوري للتأكد
setTimeout(injectReviewButton, 1000);
