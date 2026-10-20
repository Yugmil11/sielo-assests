/* Sielo ARLO website as a Wix Custom Element.
   In Wix: Add → Embed Code → Custom Element → "Server URL":
     https://yugmil11.github.io/sielo-assests/site/wix-element.js
   Tag name: sielo-arlo-site
   The element renders the whole landing page in normal document flow (no iframe),
   loading markup, styles, images, video and the frame sequence from BASE. */
(function () {
  'use strict';
  // Assets are served from the same folder as this script (falls back to the GitHub Pages copy).
  var BASE = (document.currentScript && document.currentScript.src)
    ? new URL('.', document.currentScript.src).href
    : 'https://yugmil11.github.io/sielo-assests/site/';
  var TAG = 'sielo-arlo-site';
  var VERSION = '20261020b'; // bump on every deploy so Wix and browsers fetch fresh files
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
    connectedCallback() {
      if (this.__mounted) return;
      this.__mounted = true;
      var el = this;
      el.style.display = 'block';
      el.style.width = '100%';

      // Fonts (Montserrat from Google; the Sielo brand font comes from BASE via styles.css)
      addOnce('sielo-font-preconnect', function () { var l = document.createElement('link'); l.rel = 'preconnect'; l.href = 'https://fonts.gstatic.com'; l.crossOrigin = ''; return l; });
      addOnce('sielo-font-montserrat', function () { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'; return l; });

      Promise.all([
        fetch(BASE + 'styles.css?v=' + VERSION).then(function (r) { return r.text(); }),
        fetch(BASE + 'body.html?v=' + VERSION).then(function (r) { return r.text(); }),
        loadScript(BASE + 'app.js?v=' + VERSION)
      ]).then(function (res) {
        var css = res[0].replace(/url\((media\/[^)]+)\)/g, 'url(' + BASE + '$1)');
        // Wix pages keep their own body styles; scope ours to the element and reset the page gutter around it.
        css += '\n' + TAG + '{display:block;width:100%;margin:0;padding:0}' +
               '\n' + TAG + ' .sielo{min-height:100vh}';
        addOnce('sielo-site-styles', function () { var s = document.createElement('style'); s.textContent = css; return s; });
        el.innerHTML = res[1];
        var root = el.querySelector('#sielo-root');
        el.__site = window.SieloSite.mount(root, { base: BASE });
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
