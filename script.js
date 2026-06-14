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
    renderSocials();
    renderContact();
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
