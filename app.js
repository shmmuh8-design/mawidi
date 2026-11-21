/* موعدي — حجز المواعيد في عُمان */
const SB = window.MW_SB;
const OWNER_WA = '96894005400';
const CATS = [
  ['barber','حلاق','💈','#3d7bfd','#1a3fa8'], ['salon','صالون نسائي','💅','#ff6fae','#b8246c'], ['dental','عيادة أسنان','🦷','#38c6d9','#11798a'],
  ['clinic','عيادة','🩺','#3fcf8e','#13804f'], ['beauty','تجميل وسبا','💆','#b57bff','#6a2fc2'], ['carwash','غسيل سيارات','🚗','#4fb4ff','#1b5fa8'],
  ['garage','ورشة','🔧','#ffa94d','#c2580f'], ['gym','نادي ومدرب','🏋️','#ff6b6b','#b3261e'], ['photo','تصوير','📸','#ffd43b','#c28a00'], ['other','أخرى','✨','#8fa3bf','#475a75']];
const CAT = Object.fromEntries(CATS.map(c => [c[0], c]));
const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MON = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const LS = { get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }, set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
const normPhone = p => { p = String(p || '').replace(/\D/g, '').replace(/^00/, ''); return /^[79]\d{7}$/.test(p) ? '968' + p : p; };
const localPhone = p => String(p || '').replace(/^968/, '');
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dayName = s => { const d = new Date(s + 'T12:00:00'); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
const t12 = t => { const [h, m] = t.split(':').map(Number); return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' ص' : ' م'); };
const ico = (cat, cls = '') => { const c = CAT[cat] || CAT.other; return `<span class="i3d ${cls}" style="--a:${c[3]};--b:${c[4]}"><span>${c[2]}</span></span>`; };
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2400); }

async function rpc(fn, args){
  let r;
  try{ r = await fetch(SB.url + '/rest/v1/rpc/' + fn, { method:'POST', headers:{ apikey:SB.key, 'Content-Type':'application/json' }, body:JSON.stringify(args || {}) }); }
  catch(e){ throw new Error('ما فيه اتصال بالإنترنت، حاول مرة ثانية'); }
  const tx = await r.text(); let j = null; try{ j = tx ? JSON.parse(tx) : null; }catch(e){}
  if(!r.ok) throw new Error((j && j.message) || 'صار خطأ، حاول مرة ثانية');
  return j;
}

/* ---------- state ---------- */
const S = Object.assign({ gov:'مسقط', wilayat:'', cat:'' }, LS.get('mw-s', {}));
const ME = LS.get('mw-me', { name:'', phone:'' });
let codes = LS.get('mw-codes', []);
let OWN = LS.get('mw-own', null); // {phone, code}
let view = 'home', biz = null, pickDay = '', pickT = '', ownDay = ymd(new Date()), ownTab = 'day', ownData = null;
const saveS = () => LS.set('mw-s', S);

/* ---------- shell ---------- */
function setView(v){ view = v; window.scrollTo(0, 0); render(); }
function render(){
  $$('#nav [data-v]').forEach(b => b.setAttribute('aria-current', String(b.dataset.v === view || (view === 'biz' && b.dataset.v === 'home'))));
  ({ home:renderHome, biz:renderBiz, mine:renderMine, own:renderOwn })[view]();
}
$$('#nav [data-v]').forEach(b => b.onclick = () => setView(b.dataset.v));

/* ---------- home ---------- */
function govOptions(sel){ return Object.keys(GOV).map(g => `<option ${g === sel ? 'selected' : ''}>${g}</option>`).join(''); }
function wilOptions(gov, sel, any){ return (any ? `<option value="">كل الولايات</option>` : '') + (GOV[gov] || []).map(w => `<option ${w === sel ? 'selected' : ''}>${w}</option>`).join(''); }
async function renderHome(){
  $('#app').innerHTML = `
    <header class="hero">
      <div class="brand">${'<span class="logo3d"><span>📅</span></span>'}<div><h1>موعدي</h1><small>احجز موعدك بضغطة — بدون انتظار</small></div></div>
      <div class="where"><select id="gov" aria-label="المحافظة">${govOptions(S.gov)}</select><select id="wil" aria-label="الولاية">${wilOptions(S.gov, S.wilayat, true)}</select></div>
    </header>
    <h2 class="sec-h">وش تبي تحجز؟</h2>
    <div class="cats">${CATS.map(c => `<button class="cat ${S.cat === c[0] ? 'on' : ''}" data-cat="${c[0]}">${ico(c[0])}<b>${c[1]}</b></button>`).join('')}</div>
    <div class="row-h"><h2 class="sec-h">${S.cat ? CAT[S.cat][1] : 'كل الأماكن'} ${S.wilayat ? '— ' + esc(S.wilayat) : '— ' + esc(S.gov)}</h2>${S.cat ? '<button class="link" id="allCats">عرض الكل</button>' : ''}</div>
    <div id="list"><div class="sk"></div><div class="sk"></div></div>`;
  $('#gov').onchange = e => { S.gov = e.target.value; S.wilayat = ''; saveS(); renderHome(); };
  $('#wil').onchange = e => { S.wilayat = e.target.value; saveS(); renderHome(); };
  $$('[data-cat]').forEach(b => b.onclick = () => { S.cat = S.cat === b.dataset.cat ? '' : b.dataset.cat; saveS(); renderHome(); });
  $('#allCats') && ($('#allCats').onclick = () => { S.cat = ''; saveS(); renderHome(); });
  try{
    const list = await rpc('mw_list', { p_cat:S.cat, p_gov:S.gov, p_wilayat:S.wilayat });
    if(view !== 'home') return;
    $('#list').innerHTML = list.length ? list.map(b => `<button class="bcard" data-id="${b.id}">${ico(b.cat, 'md')}<span class="bc-t"><b>${esc(b.name)}</b><small>📍 ${esc(b.wilayat)}${b.area ? ' · ' + esc(b.area) : ''}</small><small>🕘 ${t12(b.open)} – ${t12(b.close)}</small></span><span class="go">احجز ‹</span></button>`).join('')
      : `<div class="empty"><span class="e3d">🗓️</span><b>ما فيه أماكن هنا للحين</b>تعرف محل يستقبل مواعيد؟ قل له يسجّل في موعدي مجاناً من تبويب «لصاحب المحل».</div>`;
    $$('.bcard').forEach(b => b.onclick = () => openBiz(b.dataset.id, list.find(x => x.id === b.dataset.id)));
  }catch(e){ $('#list').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

/* ---------- business page (customer) ---------- */
async function openBiz(id, pre){
  biz = pre || null; pickDay = ''; pickT = ''; setView('biz');
  if(!biz){ try{ biz = await rpc('mw_get', { p_id:id }); }catch(e){} if(!biz){ toast('المكان غير متاح'); setView('home'); return; } render(); }
}
function nextDays(b, n){ const out = [], d = new Date(); for(let k = 0; k < 31 && out.length < n; k++){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k); if(b.days.includes(x.getDay())) out.push(x); } return out; }
async function renderBiz(){
  const b = biz; if(!b){ $('#app').innerHTML = '<div class="sk"></div>'; return; }
  const ds = nextDays(b, 14); if(!pickDay && ds.length) pickDay = ymd(ds[0]);
  const c = CAT[b.cat] || CAT.other;
  $('#app').innerHTML = `
    <div class="top"><button class="back" id="back">‹ رجوع</button><button class="link" id="share">مشاركة 🔗</button></div>
    <section class="bhead" style="--a:${c[3]};--b:${c[4]}">${ico(b.cat, 'lg')}<div><h1>${esc(b.name)}</h1><small>${c[1]} · 📍 ${esc(b.wilayat)}${b.area ? '، ' + esc(b.area) : ''}</small></div></section>
    ${b.about ? `<p class="about">${esc(b.about)}</p>` : ''}
    <div class="acts"><a class="btn ghost" href="https://wa.me/${b.phone}" target="_blank" rel="noopener">💬 واتساب</a><a class="btn ghost" href="tel:+${b.phone}">📞 اتصال</a></div>
    ${b.services.length ? `<h2 class="sec-h">الخدمات</h2><div class="svcs">${b.services.map((s, k) => `<button class="svc" data-s="${k}"><b>${esc(s.n)}</b>${s.p ? `<small>${(+s.p).toFixed(3).replace(/\.?0+$/, '')} ر.ع</small>` : ''}</button>`).join('')}</div>` : ''}
    <h2 class="sec-h">اختر اليوم</h2>
    <div class="days">${ds.map(d => `<button class="day ${ymd(d) === pickDay ? 'on' : ''}" data-d="${ymd(d)}"><small>${DAYS[d.getDay()]}</small><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></button>`).join('') || '<div class="empty">ما فيه أيام دوام</div>'}</div>
    <h2 class="sec-h">اختر الوقت</h2>
    <div id="slots" class="slots"><div class="sk"></div></div>
    <div id="form"></div>
    <button class="link rep" id="rep">🚩 الإبلاغ عن هذا المكان</button>`;
  $('#back').onclick = () => setView('home');
  $('#share').onclick = () => { const u = location.origin + location.pathname + '?b=' + b.id; const t = 'احجز موعدك في ' + b.name + ' عن طريق موعدي:\n' + u; if(navigator.share) navigator.share({ text:t }).catch(() => {}); else { navigator.clipboard?.writeText(u); toast('تم نسخ الرابط'); } };
  $('#rep').onclick = async () => { const r = prompt('وش المشكلة؟ (اختياري)'); if(r === null) return; try{ await rpc('mw_report', { p_id:b.id, p_reason:r }); toast('شكراً، وصل البلاغ'); }catch(e){ toast(e.message); } };
  $$('.svc').forEach(x => x.onclick = () => { $$('.svc').forEach(y => y.classList.toggle('on', y === x && !x.classList.contains('on'))); });
  $$('.day').forEach(x => x.onclick = () => { pickDay = x.dataset.d; pickT = ''; $$('.day').forEach(y => y.classList.toggle('on', y === x)); loadSlots(); });
  loadSlots();
}
async function loadSlots(){
  const el = $('#slots'); el.innerHTML = '<div class="sk"></div>'; $('#form').innerHTML = '';
  if(!pickDay){ el.innerHTML = ''; return; }
  try{
    const sl = await rpc('mw_slots', { p_id:biz.id, p_day:pickDay });
    el.innerHTML = sl.length ? sl.map(s => `<button class="slot" ${s.left > 0 ? '' : 'disabled'} data-t="${s.t}">${t12(s.t)}${s.left > 0 ? '' : '<small>محجوز</small>'}</button>`).join('') : '<div class="empty">ما فيه أوقات فاضية في هذا اليوم</div>';
    $$('.slot:not([disabled])').forEach(x => x.onclick = () => { pickT = x.dataset.t; $$('.slot').forEach(y => y.classList.toggle('on', y === x)); showForm(); });
  }catch(e){ el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function showForm(){
  const svSel = $('.svc.on'), sv = svSel ? biz.services[+svSel.dataset.s].n : '';
  $('#form').innerHTML = `<div class="card form">
    <h3>تأكيد الحجز</h3><p class="sum">📅 ${dayName(pickDay)} · 🕘 ${t12(pickT)}${sv ? ' · ' + esc(sv) : ''}</p>
    <label>اسمك<input id="fName" value="${esc(ME.name)}" autocomplete="name" maxlength="40"></label>
    <label>رقم الهاتف<input id="fPhone" type="tel" inputmode="tel" value="${esc(localPhone(ME.phone))}" placeholder="9XXXXXXX" dir="ltr"></label>
    <button class="btn" id="fGo">احجز الموعد ✓</button></div>`;
  $('#form').scrollIntoView({ behavior:'smooth', block:'center' });
  $('#fGo').onclick = async () => {
    const name = $('#fName').value.trim(), phone = normPhone($('#fPhone').value);
    if(name.length < 2) return toast('اكتب اسمك'); if(!/^\d{8,15}$/.test(phone)) return toast('اكتب رقم هاتف صحيح');
    const btn = $('#fGo'); btn.disabled = true; btn.textContent = 'جارٍ الحجز…';
    try{
      const r = await rpc('mw_book', { p_id:biz.id, p_day:pickDay, p_t:pickT, p_name:name, p_phone:phone, p_service:sv });
      ME.name = name; ME.phone = phone; LS.set('mw-me', ME);
      codes = [r.code, ...codes.filter(c => c !== r.code)].slice(0, 40); LS.set('mw-codes', codes);
      $('#form').innerHTML = `<div class="card done"><span class="e3d">✅</span><h3>تم الحجز!</h3><p>${esc(biz.name)}<br>${dayName(pickDay)} · ${t12(pickT)}</p><p class="code">رقم الحجز: <b dir="ltr">${r.code}</b></p>
        <a class="btn" target="_blank" rel="noopener" href="https://wa.me/${biz.phone}?text=${encodeURIComponent('السلام عليكم، حجزت موعد عن طريق موعدي\n' + dayName(pickDay) + ' الساعة ' + t12(pickT) + (sv ? '\nالخدمة: ' + sv : '') + '\nالاسم: ' + name + '\nرقم الحجز: ' + r.code)}">💬 أرسل تأكيد للمحل</a>
        <button class="btn ghost" id="toMine">حجوزاتي</button></div>`;
      $('#toMine').onclick = () => setView('mine');
      loadSlotsSilently();
    }catch(e){ toast(e.message); btn.disabled = false; btn.textContent = 'احجز الموعد ✓'; loadSlotsSilently(); }
  };
}
async function loadSlotsSilently(){ try{ const sl = await rpc('mw_slots', { p_id:biz.id, p_day:pickDay }); $$('.slot').forEach(x => { const s = sl.find(y => y.t === x.dataset.t); if(s && s.left <= 0){ x.disabled = true; x.classList.remove('on'); } }); }catch(e){} }

/* ---------- my bookings ---------- */
const ST = { booked:['مؤكد','ok'], done:['تم','done'], cancelled:['ملغي','x'], noshow:['لم يحضر','x'] };
async function renderMine(){
  $('#app').innerHTML = `<div class="ptitle"><h1>حجوزاتي</h1></div><div id="mine"><div class="sk"></div></div>`;
  if(!codes.length){ $('#mine').innerHTML = `<div class="empty"><span class="e3d">📭</span><b>ما عندك حجوزات</b>احجز موعدك من الرئيسية، ويطلع هنا.</div>`; return; }
  try{
    const list = await rpc('mw_my', { p_codes:codes }), now = ymd(new Date());
    const up = list.filter(k => k.day >= now && k.status === 'booked'), old = list.filter(k => !(k.day >= now && k.status === 'booked')).reverse();
    const row = k => `<div class="card bk">${ico(k.biz.cat, 'md')}<div class="bk-t"><b>${esc(k.biz.name)}</b><small>📅 ${dayName(k.day)} · 🕘 ${t12(k.t)}</small>${k.service ? `<small>✂️ ${esc(k.service)}</small>` : ''}<small>رقم الحجز: <span dir="ltr">${k.code}</span></small></div><span class="st ${ST[k.status][1]}">${ST[k.status][0]}</span>
      ${k.status === 'booked' && k.day >= now ? `<div class="bk-a"><a class="btn ghost sm" href="https://wa.me/${k.biz.phone}" target="_blank" rel="noopener">💬 المحل</a><button class="btn ghost sm red" data-cx="${k.code}">إلغاء الحجز</button></div>` : ''}</div>`;
    $('#mine').innerHTML = (up.length ? `<h2 class="sec-h">القادمة</h2>${up.map(row).join('')}` : '<div class="empty">ما عندك مواعيد قادمة</div>') + (old.length ? `<h2 class="sec-h">السابقة</h2>${old.slice(0, 20).map(row).join('')}` : '');
    $$('[data-cx]').forEach(b => b.onclick = async () => { if(!confirm('متأكد تبي تلغي الحجز؟')) return; try{ await rpc('mw_cancel', { p_code:b.dataset.cx }); toast('تم إلغاء الحجز'); renderMine(); }catch(e){ toast(e.message); } });
  }catch(e){ $('#mine').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

/* ---------- business owner ---------- */
async function renderOwn(){
  if(!OWN) return renderOwnAuth('login');
  try{ ownData = await rpc('mw_biz_me', { p_phone:OWN.phone, p_code:OWN.code }); }
  catch(e){ toast(e.message); OWN = null; LS.set('mw-own', null); return renderOwnAuth('login'); }
  const b = ownData, today = ymd(new Date()), until = b.paid_until && b.paid_until > b.trial_until ? b.paid_until : b.trial_until;
  const left = Math.ceil((new Date(until + 'T23:59:59') - new Date()) / 864e5);
  $('#app').innerHTML = `
    <div class="ptitle"><div><small>لصاحب المحل</small><h1>${esc(b.name)}</h1></div>${ico(b.cat, 'md')}</div>
    <div class="plan ${left <= 5 ? 'warn' : ''}">${b.paid_until && b.paid_until >= today ? `✅ اشتراكك فعّال لين ${until}` : left > 0 ? `🎁 الفترة المجانية: باقي ${left} يوم` : '⛔ انتهت الفترة المجانية — محلك مخفي عن الزبائن'}
      <a href="https://wa.me/${OWNER_WA}?text=${encodeURIComponent('السلام عليكم، أبي أشترك في موعدي لمحل: ' + b.name + ' (' + localPhone(b.phone) + ')')}" target="_blank" rel="noopener">اشترك ‹</a></div>
    ${!b.active ? '<div class="plan warn">⏸️ الحجز موقوف — فعّله من الإعدادات</div>' : ''}
    <div class="seg">${[['day','📋 الحجوزات'],['set','⚙️ الإعدادات']].map(([k, n]) => `<button data-ot="${k}" class="${ownTab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div id="ownBody"></div>`;
  $$('[data-ot]').forEach(x => x.onclick = () => { ownTab = x.dataset.ot; renderOwn(); });
  ownTab === 'day' ? ownBookings() : ownSettings();
}
async function ownBookings(){
  const b = ownData, ds = []; for(let k = -1; k < 14; k++){ const x = new Date(); x.setDate(x.getDate() + k); ds.push(x); }
  $('#ownBody').innerHTML = `<div class="stats" id="stats"></div>
    <div class="days">${ds.map(d => `<button class="day ${ymd(d) === ownDay ? 'on' : ''} ${b.days.includes(d.getDay()) ? '' : 'off'}" data-d="${ymd(d)}"><small>${DAYS[d.getDay()]}</small><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></button>`).join('')}</div>
    <div id="ownList"><div class="sk"></div></div>
    <button class="btn ghost" id="shareMe">🔗 شارك رابط الحجز مع زبائنك</button>`;
  $$('#ownBody .day').forEach(x => x.onclick = () => { ownDay = x.dataset.d; ownBookings(); });
  $('#shareMe').onclick = () => { const u = location.origin + location.pathname + '?b=' + b.id, t = 'احجز موعدك في ' + b.name + ' بسهولة:\n' + u; if(navigator.share) navigator.share({ text:t }).catch(() => {}); else { navigator.clipboard?.writeText(t); toast('تم نسخ الرابط'); } };
  rpc('mw_biz_stats', { p_phone:OWN.phone, p_code:OWN.code }).then(s => { $('#stats').innerHTML = [['اليوم', s.today], ['هالأسبوع', s.week], ['هالشهر', s.month], ['ما حضروا', s.noshow]].map(([n, v]) => `<div><b>${v}</b><small>${n}</small></div>`).join(''); }).catch(() => {});
  try{
    const list = await rpc('mw_biz_day', { p_phone:OWN.phone, p_code:OWN.code, p_day:ownDay });
    $('#ownList').innerHTML = list.length ? list.map(k => `<div class="card ob ${k.status}"><div class="ob-t"><b>${t12(k.t)}</b><span class="st ${ST[k.status][1]}">${ST[k.status][0]}</span></div>
      <div class="ob-n">${esc(k.name)}${k.service ? ' · ' + esc(k.service) : ''}<small dir="ltr">+${k.phone}</small></div>
      <div class="bk-a"><a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/${k.phone}?text=${encodeURIComponent('السلام عليكم ' + k.name + '، تذكير بموعدك في ' + b.name + '\n' + dayName(ownDay) + ' الساعة ' + t12(k.t) + '\nننتظرك 🌹')}">🔔 تذكير</a><a class="btn ghost sm" href="tel:+${k.phone}">📞</a>
      ${k.status === 'booked' ? `<button class="btn ghost sm" data-set="done" data-id="${k.id}">✓ حضر</button><button class="btn ghost sm" data-set="noshow" data-id="${k.id}">ما حضر</button><button class="btn ghost sm red" data-set="cancelled" data-id="${k.id}">إلغاء</button>` : `<button class="btn ghost sm" data-set="booked" data-id="${k.id}">↩︎ رجّعه</button>`}</div></div>`).join('')
      : `<div class="empty"><span class="e3d">☕</span><b>ما فيه حجوزات في ${dayName(ownDay)}</b>${b.days.includes(new Date(ownDay + 'T12:00').getDay()) ? 'شارك رابط الحجز مع زبائنك.' : 'هذا يوم إجازة.'}</div>`;
    $$('[data-set]').forEach(x => x.onclick = async () => { try{ await rpc('mw_biz_set', { p_phone:OWN.phone, p_code:OWN.code, p_id:+x.dataset.id, p_status:x.dataset.set }); ownBookings(); }catch(e){ toast(e.message); } });
  }catch(e){ $('#ownList').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function ownSettings(){
  const b = ownData, svc = [...b.services];
  const times = []; for(let h = 0; h < 24; h++) for(const m of ['00','30']) times.push(String(h).padStart(2, '0') + ':' + m);
  const tSel = (id, v) => `<select id="${id}">${times.map(t => `<option value="${t}" ${t === v ? 'selected' : ''}>${t12(t)}</option>`).join('')}</select>`;
  $('#ownBody').innerHTML = `<div class="card form">
    <label>اسم المحل<input id="sName" value="${esc(b.name)}" maxlength="60"></label>
    <label>النوع<select id="sCat">${CATS.map(c => `<option value="${c[0]}" ${c[0] === b.cat ? 'selected' : ''}>${c[2]} ${c[1]}</option>`).join('')}</select></label>
    <div class="two"><label>المحافظة<select id="sGov">${govOptions(b.gov)}</select></label><label>الولاية<select id="sWil">${wilOptions(b.gov, b.wilayat)}</select></label></div>
    <label>المنطقة / العنوان<input id="sArea" value="${esc(b.area)}" maxlength="60" placeholder="مثال: المعبيلة الجنوبية"></label>
    <label>نبذة<textarea id="sAbout" maxlength="200" rows="2">${esc(b.about)}</textarea></label>
    <h3>أيام الدوام</h3><div class="dchips">${DAYS.map((d, k) => `<button type="button" class="dch ${b.days.includes(k) ? 'on' : ''}" data-k="${k}">${d}</button>`).join('')}</div>
    <div class="two"><label>من${tSel('sOpen', b.open)}</label><label>إلى${tSel('sClose', b.close)}</label></div>
    <div class="two"><label>مدة الموعد<select id="sSlot">${[10,15,20,30,45,60,90,120].map(m => `<option value="${m}" ${m === b.slot ? 'selected' : ''}>${m} دقيقة</option>`).join('')}</select></label>
      <label>كم زبون في نفس الوقت<select id="sCap">${[1,2,3,4,5,6,8,10].map(m => `<option ${m === b.cap ? 'selected' : ''}>${m}</option>`).join('')}</select></label></div>
    <h3>الخدمات والأسعار</h3><div id="svcs"></div><button type="button" class="link" id="addSvc">+ إضافة خدمة</button>
    <label class="sw"><input type="checkbox" id="sActive" ${b.active ? 'checked' : ''}> استقبال الحجوزات مفعّل</label>
    <button class="btn" id="sSave">حفظ</button></div>
    <div class="card form"><button class="btn ghost" id="logout">تسجيل الخروج</button><button class="btn ghost red" id="delAcc">حذف حساب المحل نهائياً</button></div>`;
  const drawSvc = () => { $('#svcs').innerHTML = svc.map((s, k) => `<div class="svrow"><input data-k="${k}" data-f="n" value="${esc(s.n)}" placeholder="اسم الخدمة"><input data-k="${k}" data-f="p" value="${s.p || ''}" type="number" step="any" inputmode="decimal" placeholder="السعر ر.ع"><button type="button" data-del="${k}">✕</button></div>`).join('');
    $$('#svcs input').forEach(i => i.oninput = () => { svc[+i.dataset.k][i.dataset.f] = i.dataset.f === 'p' ? +i.value || 0 : i.value; });
    $$('[data-del]').forEach(x => x.onclick = () => { svc.splice(+x.dataset.del, 1); drawSvc(); }); };
  drawSvc();
  $('#addSvc').onclick = () => { if(svc.length >= 30) return; svc.push({ n:'', p:0 }); drawSvc(); };
  $('#sGov').onchange = e => { $('#sWil').innerHTML = wilOptions(e.target.value, ''); };
  $$('.dch').forEach(x => x.onclick = () => x.classList.toggle('on'));
  $('#sSave').onclick = async () => {
    const days = [...$$('.dch.on')].map(x => +x.dataset.k); if(!days.length) return toast('اختر يوم دوام واحد على الأقل');
    try{
      ownData = await rpc('mw_biz_save', { p_phone:OWN.phone, p_code:OWN.code, p:{ name:$('#sName').value, cat:$('#sCat').value, gov:$('#sGov').value, wilayat:$('#sWil').value, area:$('#sArea').value, about:$('#sAbout').value,
        days, open:$('#sOpen').value, close:$('#sClose').value, slot:+$('#sSlot').value, cap:+$('#sCap').value, services:svc.filter(s => s.n.trim()), active:$('#sActive').checked } });
      toast('تم الحفظ ✓'); renderOwn();
    }catch(e){ toast(e.message); }
  };
  $('#logout').onclick = () => { OWN = null; LS.set('mw-own', null); renderOwn(); };
  $('#delAcc').onclick = async () => { if(!confirm('حذف المحل وكل حجوزاته نهائياً؟ ما تقدر ترجعه.')) return; try{ await rpc('mw_biz_delete', { p_phone:OWN.phone, p_code:OWN.code }); OWN = null; LS.set('mw-own', null); toast('تم حذف الحساب'); renderOwn(); }catch(e){ toast(e.message); } };
}
function renderOwnAuth(mode){
  const reg = mode === 'reg';
  $('#app').innerHTML = `<div class="ptitle"><div><small>لصاحب المحل</small><h1>${reg ? 'سجّل محلك' : 'دخول المحل'}</h1></div></div>
    ${reg ? `<div class="pitch">${[['📅','الزبائن يحجزون بأنفسهم 24 ساعة'],['🔔','تذكير بالواتساب قبل الموعد بضغطة'],['📊','تعرف عدد الحجوزات واللي ما حضروا'],['🎁','أول 30 يوم مجاناً']].map(([i, t]) => `<div><span class="e3d sm">${i}</span>${t}</div>`).join('')}</div>` : ''}
    <div class="card form">
      ${reg ? `<label>اسم المحل<input id="rName" maxlength="60" placeholder="مثال: صالون الأناقة"></label>
        <label>النوع<select id="rCat">${CATS.map(c => `<option value="${c[0]}">${c[2]} ${c[1]}</option>`).join('')}</select></label>
        <div class="two"><label>المحافظة<select id="rGov">${govOptions(S.gov)}</select></label><label>الولاية<select id="rWil">${wilOptions(S.gov, '')}</select></label></div>
        <label>المنطقة<input id="rArea" maxlength="60" placeholder="اختياري"></label>` : ''}
      <label>رقم هاتف المحل (واتساب)<input id="aPhone" type="tel" inputmode="tel" dir="ltr" placeholder="9XXXXXXX"></label>
      <label>${reg ? 'اختر رمز سري (4 إلى 8 أرقام)' : 'الرمز السري'}<input id="aCode" type="password" inputmode="numeric" dir="ltr" maxlength="8"></label>
      <button class="btn" id="aGo">${reg ? 'سجّل المحل — مجاناً' : 'دخول'}</button>
      <button class="link" id="aSwitch">${reg ? 'عندك حساب؟ ادخل' : 'محلك جديد؟ سجّل مجاناً'}</button></div>
    ${reg ? '<p class="fine">بتسجيلك توافق إن اسم المحل ورقمه وموقعه يظهرون للزبائن عشان يحجزون ويتواصلون معك.</p>' : ''}`;
  $('#aSwitch').onclick = () => renderOwnAuth(reg ? 'login' : 'reg');
  reg && ($('#rGov').onchange = e => { $('#rWil').innerHTML = wilOptions(e.target.value, ''); });
  $('#aGo').onclick = async () => {
    const phone = normPhone($('#aPhone').value), code = $('#aCode').value.trim();
    if(!/^\d{8,15}$/.test(phone)) return toast('اكتب رقم هاتف صحيح'); if(!/^\d{4,8}$/.test(code)) return toast('الرمز من 4 إلى 8 أرقام');
    try{
      if(reg){ const name = $('#rName').value.trim(); if(name.length < 2) return toast('اكتب اسم المحل');
        await rpc('mw_biz_new', { p:{ name, cat:$('#rCat').value, gov:$('#rGov').value, wilayat:$('#rWil').value, area:$('#rArea').value, phone }, p_code:code }); }
      await rpc('mw_biz_me', { p_phone:phone, p_code:code });
      OWN = { phone, code }; LS.set('mw-own', OWN); ownTab = reg ? 'set' : 'day';
      toast(reg ? 'تم التسجيل 🎉 حدّد أوقات الدوام والخدمات' : 'أهلاً بك 👋'); renderOwn();
    }catch(e){ toast(e.message); }
  };
}

/* ---------- start ---------- */
const qb = new URLSearchParams(location.search).get('b');
if(qb) openBiz(qb); else render();
if('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
