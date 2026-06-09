// ============================================================
// PHYTONATUS — assets/js/main.js
// GSAP · Lenis · Cursor Custom · Shared behaviors
// ============================================================

// ── CDN libs loaded via HTML: GSAP, ScrollTrigger, Lenis ─

document.addEventListener('DOMContentLoaded', () => {

    // ── Preloader ─────────────────────────────────────────
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => { preloader.classList.add('done'); }, 1000);
    }

    // ── Lenis smooth scroll ────────────────────────────────
    let lenis;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({ lerp: 0.075, smooth: true });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        if (typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => { lenis.raf(time * 1000); });
            gsap.ticker.lagSmoothing(0);
        }
    }

    // ── Cursor: enxame de abelhas orbitando o mouse ────────
    // Antes uma abelha "perseguia" o ponteiro e duas minis formavam
    // rastro EMBAIXO dele (ao clicar pareciam empilhadas). Agora um
    // trio ORBITA o cursor — distribuido ao redor, como as abelhas do
    // logo do Emporio do Mel voando em torno da colmeia. Nunca se
    // acumulam embaixo do mouse.
    const cursor = document.getElementById('cursor');
    const cursorDot = document.getElementById('cursor-dot');
    if (cursor) cursor.style.display = 'none';        // desativa a abelha-cursor antiga
    if (cursorDot) cursorDot.style.display = 'none';
    const isTouch = window.matchMedia('(hover: none)').matches || window.innerWidth < 760;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isTouch) {
        let mx = window.innerWidth / 2, my = window.innerHeight / 2;   // alvo (mouse)
        let cxp = mx, cyp = my;                                        // centro do enxame (suavizado)
        window.addEventListener('mousemove', e => {
            mx = e.clientX; my = e.clientY;
        }, { passive: true });

        const swarm = document.createElement('div');
        swarm.className = 'bee-swarm';
        document.body.appendChild(swarm);

        // Trio distribuido a 120deg ao redor do mouse. Cada abelha tem
        // raio/velocidade/fase proprios -> orbita organica, nunca enfileirada.
        const N = reduceMotion ? 1 : 3;
        const bees = [];
        for (let i = 0; i < N; i++) {
            const el = document.createElement('span');
            el.className = 'bee';
            swarm.appendChild(el);
            bees.push({
                el, x: mx, y: my,
                phase: (i / N) * Math.PI * 2,
                rx: 34 + i * 6,
                ry: 26 + i * 5,
                speed: 0.85 + i * 0.13,
                wob: i * 1.7,
            });
        }

        // Ao passar por links/botoes o enxame se aproxima (abelhas "inspecionam").
        let radius = 1, radiusTarget = 1;
        document.querySelectorAll('a, button, [data-hover]').forEach(el => {
            el.addEventListener('mouseenter', () => { radiusTarget = 0.6; });
            el.addEventListener('mouseleave', () => { radiusTarget = 1; });
        });

        let t = 0, last = performance.now();
        (function tick(now) {
            const dt = Math.min((now - last) / 1000, 0.05);   // s (cap p/ abas em 2o plano)
            last = now; t += dt;

            // centro do enxame segue o mouse com inercia (independe de fps)
            const follow = 1 - Math.pow(0.0009, dt);
            cxp += (mx - cxp) * follow;
            cyp += (my - cyp) * follow;
            radius += (radiusTarget - radius) * follow;

            for (let i = 0; i < bees.length; i++) {
                const b = bees[i];
                if (reduceMotion) {
                    // sem orbita: segue o mouse com leve offset lateral
                    b.x += (mx + 15 - b.x) * 0.12;
                    b.y += (my - 13 - b.y) * 0.12;
                    b.el.style.transform = 'translate(-50%,-50%) translate(' + b.x + 'px,' + b.y + 'px)';
                    continue;
                }
                const ang = b.phase + t * b.speed;
                const breath = 1 + Math.sin(t * 1.3 + b.wob) * 0.08;
                const tx = cxp + Math.cos(ang) * b.rx * breath * radius;
                const ty = cyp + Math.sin(ang) * b.ry * breath * radius;
                b.x += (tx - b.x) * 0.25;          // leve inercia de enxame
                b.y += (ty - b.y) * 0.25;
                const tilt = Math.sin(t * 2 + b.wob) * 7;   // wobble +-7deg
                b.el.style.transform =
                    'translate(-50%,-50%) translate(' + b.x + 'px,' + b.y + 'px) rotate(' + tilt + 'deg)';
            }
            requestAnimationFrame(tick);
        })(last);
    }

    // ── Header behaviors ──────────────────────────────────
    const header = document.getElementById('header');
    if (header) {
        const isLightPage = document.body.classList.contains('page-light');
        function updateHeader() {
            const scrolled = window.scrollY > 60;
            if (isLightPage) {
                header.classList.toggle('light', scrolled);
            } else {
                header.classList.toggle('scrolled', scrolled);
            }
        }
        window.addEventListener('scroll', updateHeader, { passive: true });
        updateHeader();
    }

    // ── Mobile menu ────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mobileMenu.classList.toggle('open');
            document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
        });
        mobileMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                hamburger.classList.remove('open');
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // ── GSAP Animations ───────────────────────────────────
    // Fallback: se o GSAP nao carregar (CDN bloqueado/offline), revela todo
    // o conteudo que depende dele em vez de deixar a pagina invisivel.
    if (typeof gsap === 'undefined') {
        document.querySelectorAll('.fade-in').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
        document.querySelectorAll('.clip-reveal').forEach(el => { el.style.clipPath = 'none'; });
        return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // Headline = texto puro e sempre visivel (sem animacao de reveal).


    // Hero footer fade
    const heroFooter = document.querySelector('.hero-footer');
    if (heroFooter) {
        gsap.fromTo(heroFooter,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 1.5 }
        );
    }

    // Hero eyebrow
    const heroEyebrow = document.querySelector('.hero-eyebrow');
    if (heroEyebrow) {
        gsap.fromTo(heroEyebrow,
            { opacity: 0, x: -16 },
            { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', delay: 0.6 }
        );
    }

    // Generic fade-in on scroll
    document.querySelectorAll('.fade-in').forEach(el => {
        gsap.to(el, {
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
            opacity: 1, y: 0, duration: 0.9, ease: 'power3.out'
        });
    });

    // Clip reveal (horizontal)
    document.querySelectorAll('.clip-reveal').forEach(el => {
        gsap.to(el, {
            scrollTrigger: { trigger: el, start: 'top 88%' },
            clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'expo.out'
        });
    });

    // Stagger children
    document.querySelectorAll('[data-stagger]').forEach(parent => {
        const children = parent.children;
        gsap.fromTo(children,
            { opacity: 0, y: 30 },
            {
                scrollTrigger: { trigger: parent, start: 'top 82%' },
                opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
                stagger: parseFloat(parent.dataset.stagger) || 0.1
            }
        );
    });

    // Section eyebrows slide in
    document.querySelectorAll('.section-eyebrow').forEach(el => {
        gsap.fromTo(el,
            { opacity: 0, x: -20 },
            {
                scrollTrigger: { trigger: el, start: 'top 90%' },
                opacity: 1, x: 0, duration: 0.7, ease: 'power3.out'
            }
        );
    });

    // Animated counters
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const decimals = el.dataset.decimals || 0;
        ScrollTrigger.create({
            trigger: el,
            start: 'top 85%',
            once: true,
            onEnter: () => {
                gsap.to({ val: 0 }, {
                    val: target,
                    duration: 1.8,
                    ease: 'power2.out',
                    onUpdate: function () {
                        el.textContent = prefix + parseFloat(this.targets()[0].val).toFixed(decimals) + suffix;
                    }
                });
            }
        });
    });

    // Parallax for brand images
    document.querySelectorAll('[data-parallax]').forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        gsap.to(el, {
            yPercent: speed * 100,
            ease: 'none',
            scrollTrigger: { trigger: el.parentElement, scrub: true }
        });
    });

    // ── Contact form tabs ─────────────────────────────────
    document.querySelectorAll('.dest-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.dest-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const hidden = document.getElementById('dest-hidden');
            if (hidden) hidden.value = tab.dataset.dest;
        });
    });

    // ── Contact form submit ───────────────────────────────
    const BRAND_GREEN = '#009A44';

    function setupFormSubmit(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const btn = form.querySelector('.btn-submit-full');
            const original = btn.textContent;
            btn.textContent = '✓ Mensagem enviada!';
            btn.style.background = BRAND_GREEN;
            btn.style.borderColor = BRAND_GREEN;
            setTimeout(() => {
                btn.textContent = original;
                btn.style.background = '';
                btn.style.borderColor = '';
                form.reset();
            }, 4000);
        });
    }

    setupFormSubmit('contact-form');
    setupFormSubmit('footer-contact-form');
    setupFormSubmit('footer-contact-form-marcas');
    setupFormSubmit('footer-contact-form-clientes');
    setupFormSubmit('footer-contact-form-pl');
    setupFormSubmit('footer-contact-form-contato');


    // ── File attachment ───────────────────────────────────
    const fileInput = document.getElementById('attach');
    const fileLabel = document.getElementById('attach-label');
    if (fileInput && fileLabel) {
        fileInput.addEventListener('change', () => {
            fileLabel.textContent = fileInput.files[0]?.name || 'Anexar arquivo (PDF, imagem, DOC)';
        });
    }

    // ── Smooth anchor scroll ──────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const id = link.getAttribute('href').slice(1);
            const target = document.getElementById(id);
            if (target) {
                e.preventDefault();
                if (lenis) { lenis.scrollTo(target, { offset: -80 }); }
                else { target.scrollIntoView({ behavior: 'smooth' }); }
            }
        });
    });

});
