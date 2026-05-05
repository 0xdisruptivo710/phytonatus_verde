// ============================================================
// PHYTONATUS — assets/js/main.js
// GSAP · Lenis · Cursor Custom · Shared behaviors
// ============================================================

// ── CDN libs loaded via HTML: GSAP, ScrollTrigger, Lenis ─

document.addEventListener('DOMContentLoaded', () => {

    // ── Preloader ─────────────────────────────────────────
    const preloader = document.getElementById('preloader');
    const preloaderLine = document.querySelector('.preloader-line');
    if (preloader && preloaderLine) {
        setTimeout(() => { preloaderLine.style.width = '100%'; }, 100);
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

    // ── Custom cursor (abelha) ─────────────────────────────
    const cursor = document.getElementById('cursor');
    const cursorDot = document.getElementById('cursor-dot');
    if (cursorDot) cursorDot.style.display = 'none';
    const isTouch = window.matchMedia('(hover: none)').matches || window.innerWidth < 760;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch && cursor) cursor.style.display = 'none';

    if (cursor && !isTouch) {
        let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        let lastTrailX = cx, lastTrailY = cy;
        let trailLayer = null;
        if (!reduceMotion) {
            trailLayer = document.createElement('div');
            trailLayer.className = 'cursor-trail-layer';
            document.body.appendChild(trailLayer);
        }

        window.addEventListener('mousemove', e => {
            cx = e.clientX; cy = e.clientY;
            if (!trailLayer) return;
            const dx = cx - lastTrailX, dy = cy - lastTrailY;
            if (dx * dx + dy * dy > 400) {
                spawnTrailDot(cx, cy);
                lastTrailX = cx; lastTrailY = cy;
            }
        }, { passive: true });

        function spawnTrailDot(x, y) {
            const dot = document.createElement('span');
            dot.className = 'cursor-trail-dot';
            dot.style.left = x + 'px';
            dot.style.top = y + 'px';
            trailLayer.appendChild(dot);
            requestAnimationFrame(() => dot.classList.add('fade'));
            setTimeout(() => dot.remove(), 900);
        }

        (function animateCursor() {
            const rect = cursor.getBoundingClientRect();
            const curX = rect.left + rect.width / 2;
            const curY = rect.top + rect.height / 2;
            const x = curX + (cx - curX) * 0.18;
            const y = curY + (cy - curY) * 0.18;
            cursor.style.left = x + 'px';
            cursor.style.top  = y + 'px';
            requestAnimationFrame(animateCursor);
        })();
        document.querySelectorAll('a, button, [data-hover]').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
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
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero title reveal (line by line)
    const heroLines = document.querySelectorAll('.hero-title .reveal-inner');
    if (heroLines.length) {
        // Esconde imediatamente (antes do paint) e anima após preloader
        gsap.set(heroLines, { yPercent: 110, rotate: 1 });
        gsap.to(heroLines, {
            yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out',
            stagger: 0.12, delay: 1.0
        });
    }


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
