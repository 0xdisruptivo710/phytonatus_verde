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

    // ── Custom cursor (abelha) ─────────────────────────────
    const cursor = document.getElementById('cursor');
    const cursorDot = document.getElementById('cursor-dot');
    if (cursorDot) cursorDot.style.display = 'none';
    const isTouch = window.matchMedia('(hover: none)').matches || window.innerWidth < 760;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch && cursor) cursor.style.display = 'none';

    if (cursor && !isTouch) {
        let cx = window.innerWidth / 2, cy = window.innerHeight / 2;

        // ── 2 abelhas mini fixas que seguem a grande (enxame) ──────────
        // Cada mini persegue a posicao da abelha "da frente" (a grande p/ a 1a,
        // a 1a mini p/ a 2a) com lerp suave + um leve offset lateral, criando
        // um trio espalhado que voa junto.
        const minis = [];
        if (!reduceMotion) {
            const layer = document.createElement('div');
            layer.className = 'cursor-trail-layer';
            document.body.appendChild(layer);
            // offX/offY: deslocamento lateral (uma puxa pra um lado, outra pro outro)
            // ease: quanto menor, mais "atrasada" a mini fica em relacao a da frente
            const cfg = [
                { offX: -16, offY: 14, ease: 0.14 },
                { offX:  18, offY: 20, ease: 0.10 },
            ];
            cfg.forEach(c => {
                const el = document.createElement('span');
                el.className = 'cursor-trail-dot';
                layer.appendChild(el);
                minis.push({ el, x: cx, y: cy, offX: c.offX, offY: c.offY, ease: c.ease });
            });
        }

        window.addEventListener('mousemove', e => {
            cx = e.clientX; cy = e.clientY;
        }, { passive: true });

        let bigX = cx, bigY = cy;
        (function animateCursor() {
            // abelha grande segue o mouse
            const rect = cursor.getBoundingClientRect();
            const curX = rect.left + rect.width / 2;
            const curY = rect.top + rect.height / 2;
            bigX = curX + (cx - curX) * 0.18;
            bigY = curY + (cy - curY) * 0.18;
            cursor.style.left = bigX + 'px';
            cursor.style.top  = bigY + 'px';

            // minis seguem em cadeia: a 1a persegue a grande, a 2a persegue a 1a
            let leadX = bigX, leadY = bigY;
            for (let i = 0; i < minis.length; i++) {
                const m = minis[i];
                const tx = leadX + m.offX, ty = leadY + m.offY;
                m.x += (tx - m.x) * m.ease;
                m.y += (ty - m.y) * m.ease;
                m.el.style.left = m.x + 'px';
                m.el.style.top  = m.y + 'px';
                leadX = m.x; leadY = m.y;
            }
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
