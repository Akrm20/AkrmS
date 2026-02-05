// دالة لحقن زر التعليمات في تبويب القيود
function injectInstructionButton() {
    const header = document.querySelector('.header-top-row');
    if (header && !document.getElementById('instructions-btn')) {
        const btn = document.createElement('button');
        btn.id = 'instructions-btn';
        btn.innerHTML = '📖 تعليمات القيود';
        btn.style = "background: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 10px; cursor: pointer; margin-left: 10px;";
        
        btn.onclick = showInstructionsModal;
        header.insertBefore(btn, header.firstChild);
    }
}

// دالة عرض نافذة التعليمات
function showInstructionsModal() {
    let modal = document.getElementById('instModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'instModal';
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center; font-family: Tahoma, sans-serif;";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:white; width:90%; max-height:80%; overflow-y:auto; border-radius:8px; padding:15px; direction:rtl; position:relative;">
            <button onclick="document.getElementById('instModal').style.display='none'" style="position:absolute; left:10px; top:10px; border:none; background:#e74c3c; color:white; border-radius:50%; width:25px; height:25px; cursor:pointer;">X</button>
            <h3 style="color:#2c3e50; border-bottom:2px solid #f39c12; padding-bottom:5px;">💡 نماذج القيود المحاسبية</h3>
            
            <div style="font-size:11px; line-height:1.6;">
                <details style="margin-bottom:10px; background:#f9f9f9; padding:5px; border-radius:4px;">
                    <summary style="font-weight:bold; color:#27ae60; cursor:pointer;">🛒 قيد شراء متكامل (نقداً + ضريبة)</summary>
                    <p>إذا اشتريت بضاعة بـ 1000 ريال + 150 ضريبة:</p>
                    <ul style="list-style:none; padding:0;">
                        <li>🟢 <b>من مذكورين:</b></li>
                        <li>- حساب المشتريات (أو المخزون): 1000</li>
                        <li>- حساب ضريبة المدخلات: 150</li>
                        <li>🔴 <b>إلى حساب:</b></li>
                        <li>- حساب الصندوق أو البنك: 1150</li>
                    </ul>
                </details>

                <details style="margin-bottom:10px; background:#f9f9f9; padding:5px; border-radius:4px;">
                    <summary style="font-weight:bold; color:#2980b9; cursor:pointer;">💰 قيد بيع متكامل (آجل + ضريبة)</summary>
                    <p>بيع بضاعة بـ 2000 ريال + 300 ضريبة لعميل:</p>
                    <ul style="list-style:none; padding:0;">
                        <li>🟢 <b>من حساب:</b></li>
                        <li>- حساب العملاء (اسم العميل): 2300</li>
                        <li>🔴 <b>إلى مذكورين:</b></li>
                        <li>- حساب المبيعات: 2000</li>
                        <li>- حساب ضريبة المخرجات: 300</li>
                    </ul>
                </details>

                <details style="margin-bottom:10px; background:#f9f9f9; padding:5px; border-radius:4px;">
                    <summary style="font-weight:bold; color:#e67e22; cursor:pointer;">📉 قيد الإهلاك (نهاية الفترة)</summary>
                    <p>إهلاك آلة بمبلغ 500 ريال:</p>
                    <ul style="list-style:none; padding:0;">
                        <li>🟢 <b>من حساب:</b> مصروف إهلاك الأصول: 500</li>
                        <li>🔴 <b>إلى حساب:</b> مجمع إهلاك الأصول: 500</li>
                    </ul>
                </details>

                <details style="margin-bottom:10px; background:#f9f9f9; padding:5px; border-radius:4px;">
                    <summary style="font-weight:bold; color:#c0392b; cursor:pointer;">🛡️ قيد تكوين مخصص (ديون مشكوك فيها)</summary>
                    <ul style="list-style:none; padding:0;">
                        <li>🟢 <b>من حساب:</b> مصروف ديون مشكوك فيها</li>
                        <li>🔴 <b>إلى حساب:</b> مخصص ديون مشكوك فيها</li>
                    </ul>
                </details>
            </div>
            <p style="text-align:center; color:#7f8c8d; font-size:9px; margin-top:10px;">تذكر دائماً: (المدين 🟢 = أخذ) | (الدائن 🔴 = أعطى)</p>
        </div>
    `;
    modal.style.display = 'flex';
}

// تشغيل المراقب لضمان ظهور الزر عند فتح تبويب القيود
const instObserver = new MutationObserver(() => injectInstructionButton());
instObserver.observe(document.body, { childList: true, subtree: true });