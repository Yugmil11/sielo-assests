/* Sielo ARLO website as a Wix Custom Element.
   In Wix: Add → Embed Code → Custom Element → "Server URL":
     https://yugmil11.github.io/sielo-assests/site/wix-element.js
   Tag name: sielo-arlo-site
   Attributes (Wix: Custom Element → Set Attributes):
     page          home (default) | contact | involved
     contact-url   Wix page path for Contact Us     (default /contact)
     involved-url  Wix page path for Get Involved   (default /get-involved)
     home-url      Wix page path for the home page  (default /)
     terms-url     Wix page path for Terms of Use   (default /terms-of-use)
     privacy-url   Wix page path for Privacy Policy (default /english-privacy-policy)
   The element renders the page in normal document flow (no iframe), loading markup,
   styles, images, video and the frame sequence from BASE.

   Form submissions (page="contact" / page="involved"): the element fires a "sielo-submit"
   event with { id, record }. Wix page code (Velo) saves the record and answers by setting the
   element's "submit-result" attribute to "<id>:ok" or "<id>:error". No answer in 20 s = error,
   so a visitor is never told "thanks" for a message that wasn't saved. */
(function () {
  'use strict';
  var BASE = (document.currentScript && document.currentScript.src)
    ? new URL('.', document.currentScript.src).href
    : 'https://yugmil11.github.io/sielo-assests/site/';
  var TAG = 'sielo-arlo-site';
  var VERSION = '20261029a'; // bumped on every deploy so Wix and browsers fetch fresh files
  var BODIES = { home: 'body.html', contact: 'contact-body.html', involved: 'involved-body.html' };
  if (window.customElements.get(TAG)) return;

  function addOnce(id, make) {
    if (document.getElementById(id)) return;
    var el = make(); el.id = id; document.head.appendChild(el);
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.SieloSite) return res();
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  class SieloArloSite extends HTMLElement {
    static get observedAttributes() { return ['submit-result']; }
    attributeChangedCallback(name, oldV, v) {
      if (name !== 'submit-result' || !v) return;
      var parts = String(v).split(':'), id = parts[0], ok = parts[1] === 'ok';
      var p = this.__pending && this.__pending[id];
      if (!p) return;
      delete this.__pending[id]; clearTimeout(p.timer);
      if (ok) p.resolve(); else p.reject(new Error('wix-error'));
    }
    submitToWix(record) {
      var el = this;
      el.__pending = el.__pending || {};
      var id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { delete el.__pending[id]; reject(new Error('wix-timeout')); }, 20000);
        el.__pending[id] = { resolve: resolve, reject: reject, timer: timer };
        el.dispatchEvent(new CustomEvent('sielo-submit', { detail: { id: id, record: record } }));
      });
    }
    connectedCallback() {
      if (this.__mounted) return;
      this.__mounted = true;
      var el = this;
      var page = (el.getAttribute('page') || 'home').toLowerCase();
      if (!BODIES[page]) page = 'home';
      var urls = {
        'index.html': el.getAttribute('home-url') || '/',
        'contact.html': el.getAttribute('contact-url') || '/contact',
        'get-involved.html': el.getAttribute('involved-url') || '/get-involved'
      };
      el.style.display = 'block';
      el.style.width = '100%';

      addOnce('sielo-font-preconnect', function () { var l = document.createElement('link'); l.rel = 'preconnect'; l.href = 'https://fonts.gstatic.com'; l.crossOrigin = ''; return l; });
      addOnce('sielo-font-montserrat', function () { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'; return l; });

      Promise.all([
        fetch(BASE + 'styles.css?v=' + VERSION).then(function (r) { return r.text(); }),
        fetch(BASE + BODIES[page] + '?v=' + VERSION).then(function (r) { return r.text(); }),
        loadScript(BASE + 'app.js?v=' + VERSION)
      ]).then(function (res) {
        var css = res[0].replace(/url\((media\/[^)]+)\)/g, 'url(' + BASE + '$1)');
        // Wix wraps the element in a flex/grid box that feeds its own height back into the element,
        // which runs away to the browser's max height; size the element by its content only.
        css += '\n' + TAG + '{display:block;margin:0;padding:0;width:100%!important;max-width:100%!important;' +
               'height:auto!important;min-height:0!important;max-height:none!important;flex:none!important;align-self:flex-start!important}' +
               '\n' + TAG + ' .sielo{min-height:100vh}' +
               // Wix's mobile layout gives the element's wrapper a fixed desktop width (1200px) inside a
               // 320px column; make the wrapper follow the column instead.
               '\ndiv:has(> ' + TAG + '){width:100%!important;min-width:0!important;max-width:100%!important}' +
               // Wix's section layout pulls the grid up by (content - editor height); keep the page at the top.
               '\n[data-mesh-id]:has(> div > ' + TAG + '){margin-top:0!important}';
        addOnce('sielo-site-styles', function () { var s = document.createElement('style'); s.textContent = css; return s; });
        el.innerHTML = res[1];
        // point the site's own page links at the matching Wix pages (keeps ?interest=… and #section)
        var legal = {
          '#terms': el.getAttribute('terms-url') || '/terms-of-use',
          '#privacy': el.getAttribute('privacy-url') || '/english-privacy-policy'
        };
        el.querySelectorAll('a[href]').forEach(function (a) {
          var href = a.getAttribute('href');
          if (legal[href]) { a.setAttribute('href', legal[href]); return; }
          var m = href.match(/^(index\.html|contact\.html|get-involved\.html)(.*)$/);
          if (!m) return;
          var target = urls[m[1]], rest = m[2] || '';
          a.setAttribute('href', (target === '/' && rest.charAt(0) === '#') ? '/' + rest : target + rest);
        });
        var root = el.querySelector('#sielo-root');
        el.__site = page === 'home'
          ? window.SieloSite.mount(root, { base: BASE })
          : window.SieloSite.mountForm(root, { base: BASE, submit: el.submitToWix.bind(el) });
      }).catch(function (err) {
        el.innerHTML = '<p style="font-family:sans-serif;padding:24px">Sielo site failed to load: ' + err.message + '</p>';
      });
    }
    disconnectedCallback() {
      if (this.__site && this.__site.destroy) this.__site.destroy();
      this.__mounted = false;
    }
  }
  window.customElements.define(TAG, SieloArloSite);
})();
