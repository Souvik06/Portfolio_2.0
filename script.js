/* ====================== NAV / THEME ====================== */
function toggleMenu() {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");
    if (!menu || !icon) return;
    menu.classList.toggle("open");
    icon.classList.toggle("open");
}

function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    syncThemeIcon();
    try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
}

function syncThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.theme-icon').forEach(el => {
        el.textContent = isDark ? '\u2600\ufe0f' : '\ud83c\udf19';
    });
}

/* Follow the OS colour scheme live, unless the user has picked a theme manually. */
function watchSystemTheme() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
        let saved = null;
        try { saved = localStorage.getItem('theme'); } catch (err) { /* storage unavailable */ }
        if (saved) return; // manual choice wins
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        syncThemeIcon();
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
}

/* ====================== CARD RENDERERS ====================== */
function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
}

function renderPostCard(d) {
    const card = el('div', 'post-card');
    const tag = el('div', 'post-tag ' + d.tagClass);
    tag.textContent = d.tag;
    const title = el('h3', 'post-title');
    title.textContent = d.title;
    const desc = el('p', 'post-desc');
    desc.textContent = d.desc;
    const a = el('a', 'btn ' + d.btn + ' post-link');
    a.href = d.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'View on LinkedIn \u2197';
    card.append(tag, title, desc, a);
    return card;
}

function renderRecCard(d) {
    const card = el('div', 'post-card');
    const tag = el('div', 'post-tag ' + d.tagClass);
    tag.textContent = d.tag;
    const name = el('h3', 'post-title');
    name.textContent = d.name;
    const role = el('p', 'post-role');
    role.textContent = d.role;
    const quote = el('p', 'post-desc');
    quote.textContent = '\u201c' + d.quote + '\u201d';
    card.append(tag, name, role, quote);
    return card;
}

/* ====================== RESPONSIVE INFINITE CAROUSEL ======================
   Shows N cards per view based on viewport width (1 on mobile, 2 on tablet,
   up to 3 on desktop). Seamless infinite loop via head/tail clones.
   ========================================================================= */
function createCarousel(root, items, renderCard) {
    const track = root.querySelector('[data-track]');
    const viewport = root.querySelector('.carousel-viewport');
    const wrapper = root.querySelector('.carousel-wrapper');
    const prevBtn = root.querySelector('.carousel-prev');
    const nextBtn = root.querySelector('.carousel-next');
    const dotsEl = root.querySelector('[data-dots]');
    if (!track || !viewport || !items || !items.length) return null;

    const GAP = 24;          // matches CSS gap (1.5rem)
    const PEEK = 32;         // sliver of the adjacent (inactive) cards shown at each end
    const AUTO_MS = 6000;

    let perView = 1;
    let looping = false;
    let virtual = 0;
    let cardW = 0;
    let transitioning = false;
    let timer = null;

    function calcPerView() {
        // Use the smaller of the layout width and the device's physical screen
        // width. screen.width is stable under pinch-zoom, so zooming out on a
        // phone can't widen past the breakpoints and force extra cards.
        const w = Math.min(window.innerWidth, window.screen.width || window.innerWidth);
        const pv = w <= 600 ? 1 : (w <= 1000 ? 2 : 3);
        return Math.min(pv, items.length);
    }

    function makeClone(d) {
        const c = renderCard(d);
        c.classList.add('c-card');
        c.setAttribute('aria-hidden', 'true');
        c.querySelectorAll('a, button').forEach(n => n.setAttribute('tabindex', '-1'));
        return c;
    }

    function build() {
        perView = calcPerView();
        looping = items.length > perView;
        track.innerHTML = '';

        const real = items.map(d => {
            const c = renderCard(d);
            c.classList.add('c-card');
            return c;
        });

        if (looping) {
            items.slice(-perView).forEach(d => track.appendChild(makeClone(d)));
            real.forEach(c => track.appendChild(c));
            items.slice(0, perView).forEach(d => track.appendChild(makeClone(d)));
            virtual = perView;
        } else {
            real.forEach(c => track.appendChild(c));
            virtual = 0;
        }

        buildDots();
        updateControls();
        layout(false);
    }

    function buildDots() {
        if (!dotsEl) return;
        dotsEl.innerHTML = '';
        if (!looping) { dotsEl.style.display = 'none'; return; }
        dotsEl.style.display = '';
        for (let i = 0; i < items.length; i++) {
            const b = el('button', 'dot' + (i === 0 ? ' active' : ''));
            b.setAttribute('aria-label', 'Go to item ' + (i + 1));
            b.addEventListener('click', () => goTo(i));
            dotsEl.appendChild(b);
        }
    }

    function updateControls() {
        [prevBtn, nextBtn].forEach(b => { if (b) b.style.display = looping ? '' : 'none'; });
    }

    function realIndex() {
        if (!looping) return 0;
        let r = (virtual - perView) % items.length;
        if (r < 0) r += items.length;
        return r;
    }

    function updateDots() {
        if (!dotsEl || !looping) return;
        const ri = realIndex();
        dotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === ri));
    }

    function apply() {
        const peekOffset = (looping && perView > 1) ? (PEEK + GAP) : 0;
        track.style.transform = 'translateX(' + (peekOffset - virtual * (cardW + GAP)) + 'px)';
    }

    function layout(animate) {
        const vw = viewport.offsetWidth;
        const hasPeek = looping && perView > 1;
        cardW = hasPeek
            ? (vw - 2 * PEEK - (perView + 1) * GAP) / perView
            : (vw - GAP * (perView - 1)) / perView;
        track.querySelectorAll('.c-card').forEach(c => { c.style.width = cardW + 'px'; });

        // Fade the inactive card slivers at the left and right ends (multi-card views only).
        const fade = PEEK + GAP;
        const mask = hasPeek
            ? 'linear-gradient(to right, transparent 0, #000 ' + fade + 'px, #000 calc(100% - ' + fade + 'px), transparent 100%)'
            : '';
        viewport.style.webkitMaskImage = mask;
        viewport.style.maskImage = mask;

        if (!animate) track.style.transition = 'none';
        apply();
        if (!animate) {
            requestAnimationFrame(() => requestAnimationFrame(() => { track.style.transition = ''; }));
        }
        updateDots();
    }

    function move(dir) {
        if (!looping || transitioning) return;
        transitioning = true;
        virtual += dir;
        apply();
        updateDots();
    }

    function goTo(i) {
        if (!looping || transitioning) return;
        transitioning = true;
        virtual = perView + i;
        apply();
        updateDots();
        restart();
    }

    track.addEventListener('transitionend', e => {
        if (e.propertyName !== 'transform') return;
        if (looping) {
            if (virtual >= items.length + perView) {
                virtual -= items.length;
                snap();
            } else if (virtual < perView) {
                virtual += items.length;
                snap();
            }
        }
        transitioning = false;
    });

    function snap() {
        track.style.transition = 'none';
        apply();
        requestAnimationFrame(() => requestAnimationFrame(() => { track.style.transition = ''; }));
    }

    function start() { stop(); if (looping) timer = setInterval(() => move(1), AUTO_MS); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { start(); }

    if (prevBtn) prevBtn.addEventListener('click', () => { move(-1); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { move(1); restart(); });
    if (wrapper) {
        wrapper.addEventListener('mouseenter', stop);
        wrapper.addEventListener('mouseleave', start);
    }

    let touchStartX = 0;
    viewport.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    viewport.addEventListener('touchend', e => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) { move(diff > 0 ? 1 : -1); restart(); }
    }, { passive: true });

    build();
    start();

    // Relayout whenever the viewport's width changes for ANY reason
    // (window resize, CSS/layout shifts, late-loading fonts) — not just
    // window 'resize' events. Keeps card widths exact, avoiding peek/overflow.
    let lastVPWidth = viewport.offsetWidth;
    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
            const w = viewport.offsetWidth;
            if (w === lastVPWidth) return;
            lastVPWidth = w;
            const pv = calcPerView();
            if (pv !== perView) { build(); start(); }
            else { track.style.transition = 'none'; layout(false); }
        });
        ro.observe(viewport);
    }

    return {
        onResize() {
            const pv = calcPerView();
            if (pv !== perView) { build(); start(); }
            else { track.style.transition = 'none'; layout(false); }
        }
    };
}

/* ====================== INIT ====================== */
const PD = window.PORTFOLIO_DATA || {};
const carousels = [];

/* Set a section's eyebrow (.section__text__p1) and title (.title) from data. */
function setHeader(sectionId, d) {
    const sec = document.getElementById(sectionId);
    if (!sec || !d) return;
    const eyebrow = sec.querySelector('.section__text__p1');
    const title = sec.querySelector('.title');
    if (eyebrow && d.eyebrow != null) eyebrow.textContent = d.eyebrow;
    if (title && d.title != null) title.textContent = d.title;
}

/* Section renderers. Content is first-party authored data, so innerHTML is safe. */
function renderAbout() {
    const d = PD.about;
    const mount = document.querySelector('[data-about]');
    if (!d || !mount) return;
    setHeader('about', d);
    const cards = d.cards.map(c => `
        <div class="details-container">
          <img src="./assets/${c.icon}" alt="${c.alt}" class="icon" loading="eager" decoding="async" />
          <h3>${c.title}</h3>
          <p>${c.lines.join('<br />')}</p>
        </div>`).join('');
    mount.innerHTML = `
        <div class="about-containers">${cards}</div>
        <div class="text-container"><p>${d.text}</p></div>`;
}

function renderExperience() {
    const d = PD.experience;
    const mount = document.querySelector('[data-experience]');
    if (!d || !mount) return;
    setHeader('experience', d);
    mount.innerHTML = d.jobs.map(j => `
        <div class="timeline-item">
          <div class="timeline-marker"><div class="timeline-dot"></div></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <div>
                <h2 class="timeline-role">${j.role}</h2>
                <h3 class="timeline-company">${j.company}</h3>
              </div>
              <span class="timeline-period">${j.period}</span>
            </div>
            ${j.progression ? `<p class="timeline-progression">${j.progression}</p>` : ''}
            <ul class="timeline-bullets">${j.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
          </div>
        </div>`).join('');
}

function renderSkills() {
    const d = PD.skills;
    const mount = document.querySelector('[data-skills]');
    if (!d || !mount) return;
    setHeader('skills', d);
    mount.innerHTML = d.categories.map(cat => `
        <div class="skill-category">
          <h3 class="skill-category-title">
            <span class="skill-category-icon">${cat.icon || ''}</span>
            <span class="skill-category-name">${cat.title}</span>
            <span class="skill-count">${cat.badges.length}</span>
          </h3>
          <div class="skill-badges">${cat.badges.map(b => `<span class="badge badge-${b.v}">${b.t}</span>`).join('')}</div>
        </div>`).join('');
}

function renderCertifications() {
    const d = PD.certifications;
    const mount = document.querySelector('[data-certifications]');
    if (!d || !mount) return;
    setHeader('certifications', d);
    mount.innerHTML = d.items.map(c => `
        <div class="cert-card">
          <div class="cert-badge">${c.badge}</div>
          <h3>${c.title}</h3>
          <p>${c.sub}</p>
        </div>`).join('');
}

function renderServices() {
    const d = PD.services;
    const mount = document.querySelector('[data-services]');
    if (!d || !mount) return;
    setHeader('services', d);
    mount.innerHTML = d.items.map(s => `
        <div class="service-card">
          <div class="service-icon">${s.icon}</div>
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
        </div>`).join('');
}

function renderSocials() {
    const data = PD.socials;
    const mount = document.getElementById('socials-container');
    if (!data || !mount) return;
    mount.innerHTML = '';
    data.forEach(s => {
        const img = el('img', 'icon');
        img.src = './assets/' + s.icon;
        img.alt = s.alt;
        img.loading = 'eager';
        img.decoding = 'async';
        img.addEventListener('click', () => { window.location.href = s.href; });
        mount.appendChild(img);
    });
}

function renderProfile() {
    const d = PD.profile;
    const sec = document.getElementById('profile');
    if (!d || !sec) return;
    const set = (sel, val) => { const n = sec.querySelector(sel); if (n) n.textContent = val; };
    set('.section__text__p1', d.greeting);
    set('.title', d.name);
    set('.section__text__p2', d.role);
    set('.section__text__p3', d.tagline);

    const stats = sec.querySelector('.hero-stats');
    if (stats) stats.innerHTML = d.stats.map(s => `<div class="stat-chip"><span>${s.value}</span>${s.label}</div>`).join('');

    const btns = sec.querySelector('.btn-container');
    if (btns) {
        btns.innerHTML = '';
        d.buttons.forEach(b => {
            const btn = el('button', 'btn ' + b.style);
            btn.textContent = b.text;
            btn.addEventListener('click', () => {
                if (b.action === 'open') window.open(b.href);
                else window.location.href = b.href;
            });
            btns.appendChild(btn);
        });
    }
}

function renderContact() {
    const d = PD.contact;
    const mount = document.querySelector('[data-contact]');
    if (!d || !mount) return;
    setHeader('contact', d);
    mount.innerHTML = d.items.map(c => `
        <div class="contact-info-container">
          <img src="./assets/${c.icon}" alt="${c.alt}" class="icon contact-icon" loading="lazy" decoding="async" />
          <p><a href="${c.href}">${c.text}</a></p>
        </div>`).join('');
}

function renderNavigation() {
    const d = PD.site;
    if (!d) return;
    document.querySelectorAll('.logo').forEach(l => { l.textContent = d.brand; });

    const links = d.nav.map(n => `<li><a href="${n.href}">${n.label}</a></li>`).join('');
    const desktop = document.querySelector('#desktop-nav .nav-links');
    if (desktop) desktop.innerHTML = links;
    const footer = document.querySelector('footer .nav-links');
    if (footer) footer.innerHTML = links;

    const ham = document.querySelector('#hamburger-nav .menu-links');
    if (ham) {
        ham.innerHTML = links;
        ham.querySelectorAll('a').forEach(a => a.addEventListener('click', toggleMenu));
    }

    const cp = document.querySelector('.footer-copyright');
    if (cp) cp.textContent = d.copyright.replace('{year}', new Date().getFullYear());
}

/* ================= CONTACT FORM (Netlify Forms + W3Forms) =================
   The form submits to BOTH backends so it works no matter where it's hosted:
     • Netlify Forms  — captured automatically when the site is deployed on
       Netlify (the POST to "/" is intercepted by Netlify's infra). On other
       hosts that POST just 404s and is ignored.
     • W3Forms        — a client-side POST that emails you on ANY host
       (GitHub Pages, Netlify, localhost).

   ACCESS KEY: a W3Forms key is PUBLISHABLE (it ships in this client JS no
   matter what), so it's hardcoded below for simplicity. It is protected by
   the Allowed Domains list in your W3Forms dashboard (add your github.io
   and netlify.app domains), not by secrecy. If you inject
   window.W3FORMS_ACCESS_KEY at build time, that overrides the hardcoded value.
   ======================================================================== */
function initContactForm() {
    const ACCESS_KEY = (typeof window !== 'undefined' && window.W3FORMS_ACCESS_KEY) ||
        'w3f_fa884b878c29b474e409d2daeb91e2096d6ff13ccc8b1675';
    const form = document.getElementById('contactForm');
    if (!form) return;

    const statusEl = document.getElementById('formStatus');
    const submitBtn = form.querySelector('button[type="submit"]');
    const defaultBtnText = submitBtn ? submitBtn.textContent : '';

    function setStatus(message, type) {
        if (!statusEl) return;
        statusEl.textContent = message || '';
        statusEl.className = 'form-status' + (type ? ' ' + type : '');
        statusEl.style.display = message ? 'block' : 'none';
    }

    function setLoading(loading) {
        if (!submitBtn) return;
        submitBtn.disabled = loading;
        submitBtn.textContent = loading ? 'Sending\u2026' : defaultBtnText;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        setStatus('', '');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!ACCESS_KEY || ACCESS_KEY.indexOf('__') === 0) {
            setStatus("Contact form isn't configured yet \u2014 the W3Forms access key is missing.", 'error');
            return;
        }

        setLoading(true);
        setStatus('Sending your message\u2026', 'pending');

        // 1) Netlify Forms — captured only when hosted on Netlify; harmless 404 elsewhere.
        const netlifyPost = fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(new FormData(form)).toString()
        }).then(r => r.ok).catch(() => false);

        // 2) W3Forms — emails on any host.
        const w3Data = new FormData(form);
        w3Data.set('access_key', ACCESS_KEY);
        const name = (w3Data.get('name') || '').toString().trim();
        w3Data.set('subject', 'New portfolio enquiry from ' + (name || 'a visitor'));
        w3Data.set('from_name', 'Souvik Portfolio \u2014 Contact Form');
        const w3Post = fetch('https://api.w3forms.com/submit', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: w3Data
        })
            .then(response => response.json().then(json => ({ ok: response.ok, json })))
            .catch(() => ({ ok: false, json: null }));

        Promise.all([netlifyPost, w3Post])
            .then(([netlifyOk, w3]) => {
                const w3Ok = w3.ok && w3.json && w3.json.success;
                if (w3Ok || netlifyOk) {
                    setStatus("Thanks! Your message has been sent \u2014 I'll get back to you soon.", 'success');
                    form.reset();
                } else {
                    setStatus((w3.json && (w3.json.error || w3.json.message)) || 'Something went wrong. Please try again or email me directly at souvik.chat2011@gmail.com.', 'error');
                }
            })
            .finally(() => setLoading(false));
    });
}

function initCarousels() {
    const map = {
        posts: { data: PD.posts, render: renderPostCard, sectionId: 'posts' },
        recs: { data: PD.recommendations, render: renderRecCard, sectionId: 'testimonials' }
    };
    document.querySelectorAll('[data-carousel]').forEach(root => {
        const cfg = map[root.dataset.carousel];
        if (!cfg || !cfg.data) return;
        setHeader(cfg.sectionId, cfg.data);
        const inst = createCarousel(root, cfg.data.items, cfg.render);
        if (inst) carousels.push(inst);
    });
}

let resizeRAF = null;
window.addEventListener('resize', () => {
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(() => carousels.forEach(c => c.onResize()));
});

window.addEventListener('DOMContentLoaded', () => {
    syncThemeIcon();
    watchSystemTheme();
    renderNavigation();
    renderProfile();
    renderAbout();
    renderExperience();
    renderSkills();
    renderCertifications();
    renderServices();
    renderSocials();
    renderContact();
    initContactForm();
    initCarousels();
});

/* ====================== FROSTED NAV ON SCROLL ====================== */
let scrollTicking = false;
window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
        const scrolled = window.scrollY > 20;
        const desktopNav = document.getElementById('desktop-nav');
        const hamburgerNav = document.getElementById('hamburger-nav');
        if (desktopNav) desktopNav.classList.toggle('scrolled', scrolled);
        if (hamburgerNav) hamburgerNav.classList.toggle('scrolled', scrolled);
        scrollTicking = false;
    });
}, { passive: true });
