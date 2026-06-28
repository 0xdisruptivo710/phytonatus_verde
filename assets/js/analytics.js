// ============================================================
// PHYTONATUS — assets/js/analytics.js
// Camada de eventos GA4 (gtag.js) — tagueamento semântico de ações
// + captura/atribuição de UTMs. Zero dependências.
//
// A tag base (gtag.js, G-FET4J9PY1M) é carregada no <head> de cada
// página. Este arquivo NÃO recria a tag — só dispara eventos de ação
// por cima dela, de forma centralizada, para que a equipe consiga
// "clusterizar por ação" nos relatórios do GA4.
//
// Como usar manualmente em qualquer botão/link:
//   <a ... data-evt="cta_click" data-evt-cta="quero-revender">…</a>
//   -> dispara o evento "cta_click" com o parâmetro { cta: "quero-revender" }
//   Qualquer data-evt-XYZ vira o parâmetro { xyz: valor }.
//
// Para depurar no console do navegador: window.__PHYTO_DEBUG = true
// ============================================================

(function () {
  'use strict';

  // ── nome curto e estável da página (vira parâmetro "page_name") ──
  function pageName() {
    var p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    p = p.replace(/\.html?$/, '');
    return p === '' || p === 'index' ? 'home' : p;
  }
  var PAGE = pageName();

  // ── wrapper seguro do gtag ───────────────────────────────────
  // gtag() já existe (definido no snippet inline do <head>). Se por
  // algum motivo não existir ainda, empilhamos no dataLayer para não
  // perder o evento.
  function track(name, params) {
    var data = { page_name: PAGE };
    if (params) for (var k in params) if (params[k] != null && params[k] !== '') data[k] = params[k];
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, data);
      } else {
        (window.dataLayer = window.dataLayer || []).push(['event', name, data]);
      }
    } catch (_) { /* nunca quebrar a página por causa de analytics */ }
    if (window.__PHYTO_DEBUG) console.log('[phyto-track]', name, data);
  }
  window.phytoTrack = track;

  // ── Atribuição: captura UTMs e click-ids da URL de entrada ───
  // Guarda na sessionStorage para acompanhar o visitante durante toda a
  // sessão (mesmo navegando entre páginas) e anexar a campanha ao lead.
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  var ATTR_STORE = 'phyto_attribution';

  function captureAttribution() {
    try {
      var qs = new URLSearchParams(location.search);
      var found = {};
      var has = false;
      ATTR_KEYS.forEach(function (k) {
        var v = qs.get(k);
        if (v) { found[k] = v.slice(0, 120); has = true; }
      });
      // só sobrescreve se a entrada atual trouxe campanha (first-touch da sessão fica
      // preservado se o usuário navegar internamente sem novos parâmetros).
      if (has) {
        found.landing_page = location.pathname;
        sessionStorage.setItem(ATTR_STORE, JSON.stringify(found));
      }
    } catch (_) {}
  }

  function getAttribution() {
    try { return JSON.parse(sessionStorage.getItem(ATTR_STORE) || '{}') || {}; }
    catch (_) { return {}; }
  }
  window.phytoAttribution = getAttribution;
  captureAttribution();

  // ── helpers ──────────────────────────────────────────────────
  function txt(el) {
    return (el.getAttribute('aria-label') || el.textContent || '')
      .replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  function fileName(href) {
    return (href.split('#')[0].split('?')[0].split('/').pop() || href).slice(0, 80);
  }
  // posição/contexto do elemento na página (cluster por região)
  function posOf(el) {
    if (el.classList.contains('nav-cta-catalog') || el.closest('header, #header, nav.nav, .av-nav')) {
      if (el.closest('#mobile-menu, #mobile-nav, .mobile-menu, .mobile-nav')) return 'menu_mobile';
      return 'nav';
    }
    if (el.closest('#mobile-menu, #mobile-nav, .mobile-menu, .mobile-nav')) return 'menu_mobile';
    if (el.closest('.hero, .av-hero')) return 'hero';
    if (el.closest('footer, .site-footer, .footer-contact-section')) return 'footer';
    return 'corpo';
  }
  // identifica a loja/marketplace a partir do href ou rótulo
  function lojaOf(el) {
    var h = (el.getAttribute('href') || '').toLowerCase();
    var l = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
    if (h.indexOf('amazon') > -1 || l.indexOf('amazon') > -1) return 'amazon';
    if (h.indexOf('mercadolivre') > -1 || h.indexOf('mercadolibre') > -1 || l.indexOf('mercado livre') > -1) return 'mercado_livre';
    if (h.indexOf('loja.phytonatus') > -1 || l.indexOf('phytonatus') > -1) return 'loja_phytonatus';
    if (h.indexOf('shopee') > -1 || l.indexOf('shopee') > -1) return 'shopee';
    return 'outra';
  }

  // ── parâmetros declarados via data-evt-* ─────────────────────
  function dataEvtParams(el) {
    var params = {};
    var ds = el.dataset || {};
    for (var key in ds) {
      // evtCta -> { cta }, evtLoja -> { loja } ; ignora o próprio "evt"
      if (key.length > 3 && key.indexOf('evt') === 0) {
        var pname = key.charAt(3).toLowerCase() + key.slice(4);
        params[pname] = ds[key];
      }
    }
    return params;
  }

  // elementos de UI pura que NÃO geram evento no fallback genérico
  var SKIP_FALLBACK = '#hamburger, .hamburger, #mobile-menu-toggle, .dest-tab, .float-label, [data-noevt], [data-cms-edit]';

  // ── um único listener delegado (captura) para todos os cliques ─
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button, [role="button"], [data-evt]');
    if (!el) return;
    var href = el.getAttribute('href') || '';

    // 1) data-evt explícito tem prioridade máxima
    if (el.dataset && el.dataset.evt) {
      var p = dataEvtParams(el);
      if (!p.label) p.label = txt(el);
      p.posicao = p.posicao || posOf(el);
      track(el.dataset.evt, p);
      return;
    }

    // 2) clusters semânticos por href/classe
    if (/catalogo\.pdf/i.test(href)) {
      track('download_catalogo', { posicao: posOf(el), label: txt(el) });
      return;
    }
    if (/\.pdf($|[?#])/i.test(href)) {
      track('download_material', { arquivo: fileName(href), posicao: posOf(el), label: txt(el) });
      return;
    }
    if (/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(href)) {
      track('click_whatsapp', { posicao: posOf(el), label: txt(el) });
      return;
    }
    if (el.matches('.loja-card, .online-card-new, .m-cta') ||
        /amazon\.|mercadolivre\.|mercadolibre\.|loja\.phytonatus|shopee\./i.test(href)) {
      track('click_loja', { loja: lojaOf(el), posicao: posOf(el), label: txt(el) });
      return;
    }
    if (el.matches('.brand-card')) {
      track('click_marca', { marca: txt(el), posicao: posOf(el) });
      return;
    }
    if (/youtube\.com|youtu\.be/i.test(href)) { track('click_social', { rede: 'youtube', posicao: posOf(el) }); return; }
    if (/instagram\.com/i.test(href))         { track('click_social', { rede: 'instagram', posicao: posOf(el) }); return; }
    if (/facebook\.com|fb\.com/i.test(href))  { track('click_social', { rede: 'facebook', posicao: posOf(el) }); return; }
    if (/^mailto:/i.test(href))               { track('click_email', { posicao: posOf(el), label: txt(el) }); return; }
    if (/^tel:/i.test(href))                  { track('click_telefone', { posicao: posOf(el), label: txt(el) }); return; }

    // 3) fallback genérico — garante que TODO botão/ação seja contado.
    //    Ignora UI pura (menu, abas) e âncoras vazias.
    if (el.matches(SKIP_FALLBACK) || el.closest(SKIP_FALLBACK)) return;
    if (href === '' || href === '#' || /^javascript:/i.test(href)) {
      // botão sem href (ex.: <button>) ainda conta; âncora vazia, não.
      if (el.tagName === 'A') return;
    }
    track('click_botao', {
      label: txt(el),
      destino: href ? fileName(href) : '',
      posicao: posOf(el)
    });
  }, true);

})();
