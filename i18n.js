/* موعدي — English layer (Arabic stays the source; this translates the screen when English is on) */
(function(){
  let lang = null;
  try{ lang = localStorage.getItem('mw-lang'); }catch(e){}
  if(lang !== 'ar' && lang !== 'en') lang = /^ar/i.test(navigator.language || 'ar') ? 'ar' : 'en';
  window.LANG = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  window.setLang = l => { try{ localStorage.setItem('mw-lang', l); }catch(e){} location.reload(); };
  window.L = (ar, en) => lang === 'en' ? en : ar;
})();

const PLACE_EN = {
  'مسقط':'Muscat','ظفار':'Dhofar','مسندم':'Musandam','البريمي':'Al Buraimi','الداخلية':'Ad Dakhiliyah','شمال الباطنة':'North Al Batinah','جنوب الباطنة':'South Al Batinah',
  'جنوب الشرقية':'South Ash Sharqiyah','شمال الشرقية':'North Ash Sharqiyah','الظاهرة':'Ad Dhahirah','الوسطى':'Al Wusta',
  'مطرح':'Muttrah','بوشر':'Bawshar','السيب':'As Seeb','العامرات':'Al Amerat','قريات':'Qurayyat',
  'صلالة':'Salalah','طاقة':'Taqah','مرباط':'Mirbat','رخيوت':'Rakhyut','ثمريت':'Thumrait','ضلكوت':'Dhalkut','المزيونة':'Al Mazyunah','مقشن':'Muqshin','شليم وجزر الحلانيات':'Shalim & Hallaniyat Islands','سدح':'Sadah',
  'خصب':'Khasab','دبا':'Dibba','بخا':'Bukha','مدحاء':'Madha','محضة':'Mahdah','السنينة':'As Sunaynah',
  'نزوى':'Nizwa','بهلاء':'Bahla','منح':'Manah','الحمراء':'Al Hamra','أدم':'Adam','إزكي':'Izki','سمائل':'Samail','بدبد':'Bidbid','الجبل الأخضر':'Jabal Akhdar',
  'صحار':'Sohar','شناص':'Shinas','لوى':'Liwa','صحم':'Saham','الخابورة':'Al Khaburah','السويق':'As Suwayq',
  'الرستاق':'Rustaq','العوابي':'Al Awabi','نخل':'Nakhal','وادي المعاول':'Wadi Al Maawil','بركاء':'Barka','المصنعة':'Al Musannah',
  'صور':'Sur','الكامل والوافي':'Al Kamil Wal Wafi','جعلان بني بو حسن':'Jalan Bani Bu Hassan','جعلان بني بو علي':'Jalan Bani Bu Ali','مصيرة':'Masirah',
  'إبراء':'Ibra','المضيبي':'Al Mudhaibi','بدية':'Bidiyah','القابل':'Al Qabil','وادي بني خالد':'Wadi Bani Khalid','دماء والطائيين':'Dima Wa Al Taiyin',
  'عبري':'Ibri','ينقل':'Yanqul','ضنك':'Dhank','هيماء':'Haima','محوت':'Mahout','الدقم':'Duqm','الجازر':'Al Jazir'
};

const I18N = {
  'موعدي':'Mawidi','احجز موعدك بضغطة — بدون انتظار':'Book in one tap — no waiting','🚑 طوارئ':'🚑 Emergency','طوارئ':'Emergency',
  'وش تبي تحجز؟':'What would you like to book?','كل الأماكن':'All places','عرض الكل':'Show all','كل الولايات':'All wilayats','المحافظة':'Governorate','الولاية':'Wilayat',
  'حلاق':'Barber','صالون نسائي':'Ladies salon','عيادة أسنان':'Dental clinic','عيادة':'Clinic','تجميل وسبا':'Beauty & spa','غسيل سيارات':'Car wash','ورشة':'Garage','نادي ومدرب':'Gym & trainer','تصوير':'Photography','أخرى':'Other',
  'احجز':'Book','حجوزاتي':'My bookings','لصاحب المحل':'For businesses',
  'ما فيه أماكن هنا للحين':'No places here yet','تعرف محل يستقبل مواعيد؟ قل له يسجّل في موعدي مجاناً من تبويب «لصاحب المحل».':'Know a place that takes appointments? Tell them to join Mawidi for free from the “For businesses” tab.',
  'حالة طارئة؟':'Emergency?','اتصل على رقم الطوارئ في عُمان مباشرة — الاتصال مجاني.':'Call Oman’s emergency number directly — the call is free.','📞 اتصل 9999':'📞 Call 9999',
  '📍 أرسل موقعي لأهلي (واتساب)':'📍 Send my location to family (WhatsApp)','إغلاق':'Close',
  'موعدي تطبيق خاص وغير تابع لأي جهة حكومية، وما يرسل إسعاف بنفسه.':'Mawidi is a private app, not affiliated with any government entity, and does not dispatch ambulances itself.',
  'الموقع مو متاح في جهازك':'Location is not available on this device','جاري تحديد موقعك…':'Finding your location…','ما قدرنا نحدد موقعك — فعّل خدمات الموقع':'Couldn’t get your location — turn on Location Services',
  'رجوع':'Back','مشاركة 🔗':'Share 🔗','💬 واتساب':'💬 WhatsApp','📞 اتصال':'📞 Call','الخدمات':'Services','اختر اليوم':'Choose a day','اختر الوقت':'Choose a time',
  'ما فيه أيام دوام':'No working days','🚩 الإبلاغ عن هذا المكان':'🚩 Report this place','محجوز':'Booked','ما فيه أوقات فاضية في هذا اليوم':'No free times on this day',
  'تأكيد الحجز':'Confirm booking','اسمك':'Your name','رقم الهاتف':'Phone number','احجز الموعد ✓':'Book appointment ✓','جارٍ الحجز…':'Booking…','تم الحجز!':'Booked!',
  'رقم الحجز:':'Booking no.:','💬 أرسل تأكيد للمحل':'💬 Send confirmation to the business','المكان غير متاح':'This place is unavailable','تم نسخ الرابط':'Link copied',
  'وش المشكلة؟ (اختياري)':'What’s the problem? (optional)','شكراً، وصل البلاغ':'Thanks, report received','اكتب اسمك':'Enter your name','اكتب رقم هاتف صحيح':'Enter a valid phone number',
  'مؤكد':'Confirmed','تم':'Done','ملغي':'Cancelled','لم يحضر':'No-show','ما عندك حجوزات':'You have no bookings','احجز موعدك من الرئيسية، ويطلع هنا.':'Book from the home tab and it will show up here.',
  'القادمة':'Upcoming','السابقة':'Past','ما عندك مواعيد قادمة':'No upcoming appointments','💬 المحل':'💬 Business','إلغاء الحجز':'Cancel booking','متأكد تبي تلغي الحجز؟':'Cancel this booking?','تم إلغاء الحجز':'Booking cancelled',
  '⛔ انتهت الفترة المجانية — محلك مخفي عن الزبائن':'⛔ Free trial ended — your business is hidden from customers','⏸️ الحجز موقوف — فعّله من الإعدادات':'⏸️ Booking is paused — turn it on in Settings',
  '📋 الحجوزات':'📋 Bookings','⚙️ الإعدادات':'⚙️ Settings','🔗 شارك رابط الحجز مع زبائنك':'🔗 Share your booking link with customers',
  'اليوم':'Today','هالأسبوع':'This week','هالشهر':'This month','ما حضروا':'No-shows','🔔 تذكير':'🔔 Remind','✓ حضر':'✓ Came','ما حضر':'No-show','إلغاء':'Cancel','↩︎ رجّعه':'↩︎ Restore',
  'شارك رابط الحجز مع زبائنك.':'Share your booking link with customers.','هذا يوم إجازة.':'This is a day off.',
  'اسم المحل':'Business name','النوع':'Type','المنطقة / العنوان':'Area / address','مثال: المعبيلة الجنوبية':'e.g. South Al Mabelah','نبذة':'About','أيام الدوام':'Working days','من':'From','إلى':'To',
  'مدة الموعد':'Appointment length','كم زبون في نفس الوقت':'Customers at the same time','الخدمات والأسعار':'Services & prices','+ إضافة خدمة':'+ Add service','استقبال الحجوزات مفعّل':'Accepting bookings',
  'حفظ':'Save','تسجيل الخروج':'Log out','حذف حساب المحل نهائياً':'Delete business account permanently','اسم الخدمة':'Service name','السعر ر.ع':'Price OMR',
  'اختر يوم دوام واحد على الأقل':'Choose at least one working day','تم الحفظ ✓':'Saved ✓','حذف المحل وكل حجوزاته نهائياً؟ ما تقدر ترجعه.':'Delete the business and all its bookings? This can’t be undone.','تم حذف الحساب':'Account deleted',
  'سجّل محلك':'Register your business','دخول المحل':'Business login','الزبائن يحجزون بأنفسهم 24 ساعة':'Customers book themselves 24/7','تذكير بالواتساب قبل الموعد بضغطة':'One-tap WhatsApp reminders',
  'تعرف عدد الحجوزات واللي ما حضروا':'Track bookings and no-shows','أول 30 يوم مجاناً':'First 30 days free','مثال: صالون الأناقة':'e.g. Elegance Salon','المنطقة':'Area','اختياري':'Optional',
  'رقم هاتف المحل (واتساب)':'Business phone (WhatsApp)','اختر رمز سري (4 إلى 8 أرقام)':'Choose a PIN (4–8 digits)','الرمز السري':'PIN','سجّل المحل — مجاناً':'Register — free','دخول':'Log in',
  'عندك حساب؟ ادخل':'Have an account? Log in','محلك جديد؟ سجّل مجاناً':'New business? Register free',
  'بتسجيلك توافق إن اسم المحل ورقمه وموقعه يظهرون للزبائن عشان يحجزون ويتواصلون معك.':'By registering you agree that your business name, number and location are shown to customers so they can book and contact you.',
  'الرمز من 4 إلى 8 أرقام':'The PIN must be 4–8 digits','اكتب اسم المحل':'Enter the business name','تم التسجيل 🎉 حدّد أوقات الدوام والخدمات':'Registered 🎉 Now set your hours and services','أهلاً بك 👋':'Welcome 👋',
  'ما فيه اتصال بالإنترنت، حاول مرة ثانية':'No internet connection, please try again','الخدمة قيد التجهيز، جرّب بعد شوي 🙏':'The service is being set up, try again shortly 🙏','صار خطأ، حاول مرة ثانية':'Something went wrong, please try again',
  'رقم الهاتف أو الرمز غير صحيح':'Wrong phone number or PIN','هذا الرقم مسجّل، ادخل بحسابك':'This number is already registered — please log in','هذا الوقت انحجز، اختر وقت ثاني':'This time was just taken, choose another',
  'الرمز لازم يكون من 4 إلى 8 أرقام':'The PIN must be 4–8 digits','المحل غير متاح':'This business is unavailable','الوقت غير متاح':'This time is unavailable','اليوم غير متاح':'This day is unavailable',
  'حالة غير صحيحة':'Invalid status','عندك حجزين في نفس اليوم':'You already have two bookings on this day','وقت الإغلاق لازم يكون بعد وقت الفتح':'Closing time must be after opening time',
  'اشترك':'Subscribe','عربي':'عربي','English':'English'
};
const I18N_RX = [
  [/^🎁 الفترة المجانية: باقي (\d+) يوم$/, (m, n) => `🎁 Free trial: ${n} day${n == 1 ? '' : 's'} left`],
  [/^✅ اشتراكك فعّال لين (.+)$/, (m, d) => `✅ Subscription active until ${d}`],
  [/^ما فيه حجوزات في (.+)$/, (m, d) => `No bookings on ${d}`],
  [/^(\d+) دقيقة$/, (m, n) => `${n} min`],
  [/^(.+) ر\.ع$/, (m, n) => `${n} OMR`]
];
function trCore(s){
  if(I18N[s] != null) return I18N[s];
  if(PLACE_EN[s] != null) return PLACE_EN[s];
  for(const [rx, f] of I18N_RX){ const m = s.match(rx); if(m) return f(...m); }
  return null;
}
function trText(raw){
  const s = raw.trim(); if(!s || !/[؀-ۿ]/.test(s)) return null;
  let r = trCore(s); if(r != null) return raw.replace(s, r);
  // strip leading/trailing symbols (emoji, arrows) and try the core
  const m = s.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}).]*)$/u);
  if(m && m[2] && m[2] !== s){ r = trCore(m[2]); if(r != null) return raw.replace(s, m[1] + r + m[3].replace(/‹/g, '›')); }
  // split on separators and translate the parts
  for(const sep of [' — ', ' · ', '، ', ' – ']){
    if(s.includes(sep)){ const parts = s.split(sep).map(p => trText(p) ?? p); return raw.replace(s, parts.join(sep === '، ' ? ', ' : sep)); }
  }
  return null;
}
function trNode(n){
  if(n.nodeType === 3){ const t = trText(n.nodeValue); if(t != null && t !== n.nodeValue) n.nodeValue = t; return; }
  if(n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.hasAttribute('data-raw')) return;
  for(const a of ['placeholder', 'aria-label', 'title']){ const v = n.getAttribute(a); if(v){ const t = trText(v); if(t != null) n.setAttribute(a, t); } }
  for(const c of n.childNodes) trNode(c);
}
if(window.LANG === 'en'){
  const run = () => {
    trNode(document.body);
    new MutationObserver(ms => { for(const m of ms){ if(m.type === 'characterData') trNode(m.target); else m.addedNodes.forEach(trNode); } })
      .observe(document.body, { childList:true, subtree:true, characterData:true });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
  const oc = window.confirm.bind(window), op = window.prompt.bind(window);
  window.confirm = m => oc(trText(m) ?? m); window.prompt = (m, d) => op(trText(m) ?? m, d);
}
