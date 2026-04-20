// Shared chrome injectors for wireframes
window.WF = (function(){
  const LOGO = `<a href="index.html" class="logo-mark" style="text-decoration:none;color:inherit">
    <svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg${Math.random().toString(36).slice(2,7)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5A4608"/><stop offset=".5" stop-color="#C9A84C"/><stop offset="1" stop-color="#E8C97A"/></linearGradient></defs><g fill="none" stroke="#C9A84C" stroke-width="1.5" stroke-linecap="round"><path d="M8 32 L20 8 L32 32 Z"/><path d="M14 28 L20 18 L26 28"/><circle cx="20" cy="22" r="2" fill="#C9A84C" stroke="none"/></g></svg>
    <span class="logo-text gold-text">זירת האדריכלות</span>
  </a>`;

  function btn(label, variant='primary', size='', attrs=''){
    return `<button class="twist-btn twist-${variant} ${size}" ${attrs}><span class="twist-halo"></span><span class="twist-blob"></span><span class="label">${label}</span></button>`;
  }
  function linkBtn(label, href, variant='primary', size=''){
    return `<a class="twist-btn twist-${variant} ${size}" href="${href}"><span class="twist-halo"></span><span class="twist-blob"></span><span class="label">${label}</span></a>`;
  }

  function artboardHeader(opts){
    const {title, subtitle='', meta='', backHref='index.html', backLabel='← חזרה לאינדקס', flow=''} = opts;
    return `<header class="artboard-header">
      <div>
        <a href="${backHref}" class="back">${backLabel}</a>
        ${flow?`<div class="eyebrow" style="margin-top:14px">${flow}</div>`:''}
        <h1>${title}</h1>
        ${subtitle?`<p class="muted mt-2" style="max-width:640px">${subtitle}</p>`:''}
      </div>
      <div class="meta">${meta}</div>
    </header>`;
  }

  function designerSidebar(active){
    const items = [
      {key:'dashboard', label:'דשבורד', icon:'◇', href:'designer-dashboard.html'},
      {key:'leads', label:'לידים חדשים', icon:'✉', href:'designer-leads.html', badge:3},
      {key:'projects', label:'הפרויקטים שלי', icon:'▤', href:'designer-dashboard.html'},
      {key:'profile', label:'כרטיס הביקור', icon:'◉', href:'designer-dashboard.html'},
      {key:'calendar', label:'יומן פגישות', icon:'▦', href:'designer-dashboard.html'},
    ];
    const items2 = [
      {key:'subscription', label:'מנוי ותשלומים', icon:'✦', href:'designer-subscription.html'},
      {key:'community', label:'קהילה', icon:'◈', href:'designer-dashboard.html'},
      {key:'learn', label:'מרכז למידה', icon:'◐', href:'designer-dashboard.html'},
      {key:'settings', label:'הגדרות', icon:'⚙', href:'designer-dashboard.html'},
    ];
    const renderItem = (it)=>`<a class="nav-item ${it.key===active?'active':''}" href="${it.href}"><span style="font-size:16px;color:var(--gold)">${it.icon}</span><span>${it.label}</span>${it.badge?`<span style="margin-right:auto;background:var(--gold);color:#1a1410;font-size:11px;padding:1px 8px;border-radius:9999px;font-weight:600">${it.badge}</span>`:''}</a>`;
    return `<aside class="sidebar">
      <div class="sidebar-brand">
        <svg width="32" height="32" viewBox="0 0 40 40"><g fill="none" stroke="#E8C97A" stroke-width="1.5" stroke-linecap="round"><path d="M8 32 L20 8 L32 32 Z"/><path d="M14 28 L20 18 L26 28"/><circle cx="20" cy="22" r="2" fill="#E8C97A" stroke="none"/></g></svg>
        <span class="logo-text font-bellefair">זירת האדריכלות</span>
      </div>
      ${items.map(renderItem).join('')}
      <div class="nav-section-label">החשבון שלי</div>
      ${items2.map(renderItem).join('')}
      <div style="margin-top:auto;padding:14px;border-top:1px solid rgba(201,168,76,.2);display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#5A4608);display:flex;align-items:center;justify-content:center;color:#1a1410;font-weight:600">ש</div>
        <div><div style="font-size:13px;color:var(--gold-light)">שרון לוי</div><div style="font-size:11px;color:rgba(232,201,122,.6)">חשבון Premium</div></div>
      </div>
    </aside>`;
  }

  function adminSidebar(active){
    const items=[
      {key:'overview',label:'סקירה כללית',icon:'◇',href:'admin-dashboard.html'},
      {key:'users',label:'משתמשים',icon:'◉',href:'admin-users.html'},
      {key:'designers',label:'מעצבות',icon:'✦',href:'admin-users.html'},
      {key:'subs',label:'מנויים',icon:'▤',href:'admin-dashboard.html'},
      {key:'content',label:'תוכן ואלבומים',icon:'▦',href:'admin-dashboard.html'},
      {key:'leads',label:'לידים ותיווך',icon:'✉',href:'admin-dashboard.html'},
      {key:'reports',label:'דוחות',icon:'◈',href:'admin-dashboard.html'},
      {key:'settings',label:'הגדרות מערכת',icon:'⚙',href:'admin-dashboard.html'},
    ];
    const renderItem=(it)=>`<a class="nav-item ${it.key===active?'active':''}" href="${it.href}"><span style="font-size:16px;color:var(--gold)">${it.icon}</span><span>${it.label}</span></a>`;
    return `<aside class="sidebar">
      <div class="sidebar-brand">
        <svg width="32" height="32" viewBox="0 0 40 40"><g fill="none" stroke="#E8C97A" stroke-width="1.5" stroke-linecap="round"><path d="M8 32 L20 8 L32 32 Z"/><path d="M14 28 L20 18 L26 28"/><circle cx="20" cy="22" r="2" fill="#E8C97A" stroke="none"/></g></svg>
        <div><div class="logo-text font-bellefair">זירת האדריכלות</div><div style="font-size:10px;color:rgba(201,168,76,.6);letter-spacing:.25em;text-transform:uppercase">Admin</div></div>
      </div>
      ${items.map(renderItem).join('')}
    </aside>`;
  }

  function publicNav(active=''){
    const links=[
      {k:'designers',l:'מאגר המעצבות',h:'public-directory.html'},
      {k:'how',l:'איך זה עובד',h:'public-how.html'},
      {k:'join',l:'הצטרפות מעצבות',h:'public-join.html'},
      {k:'blog',l:'מגזין',h:'public-blog.html'},
      {k:'contact',l:'צור קשר',h:'public-contact.html'},
    ];
    return `<nav class="public-nav">
      ${LOGO}
      <div class="links">${links.map(l=>`<a href="${l.h}" style="${l.k===active?'color:var(--gold-deep);font-weight:500':''}">${l.l}</a>`).join('')}</div>
      <div style="display:flex;gap:10px;align-items:center">
        <a href="auth-login.html" style="font-size:14px;text-decoration:none;color:var(--ink)">כניסה</a>
        ${linkBtn('הצטרפות','auth-signup.html','primary','sm')}
      </div>
    </nav>`;
  }

  function topbar(opts={}){
    const {search='חפש/י פרויקטים, לקוחות, פגישות…', user='שרון לוי'} = opts;
    return `<header class="topbar">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="font-size:12px;color:var(--gold-dim);letter-spacing:.2em;text-transform:uppercase">${opts.crumb||'דשבורד'}</div>
      </div>
      <div class="topbar-search"><input class="inp" placeholder="${search}" style="height:42px;padding:8px 16px"></div>
      <div style="display:flex;align-items:center;gap:14px">
        <button style="background:transparent;border:1px solid var(--border);padding:8px 14px;border-radius:12px;font-size:13px;color:var(--ink-muted);cursor:pointer">🔔 התראות <span style="background:var(--gold);color:#1a1410;font-size:10px;padding:1px 6px;border-radius:9999px;margin-right:4px">5</span></button>
        <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#5A4608);display:flex;align-items:center;justify-content:center;color:#1a1410;font-weight:600">${user[0]}</div>
      </div>
    </header>`;
  }

  return {LOGO, btn, linkBtn, artboardHeader, designerSidebar, adminSidebar, publicNav, topbar};
})();
