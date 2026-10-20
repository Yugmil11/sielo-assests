/* Sielo Robotics — ARLO landing page behaviour.
   Usage: SieloSite.mount(rootElement, { base: 'https://host/path/' })
   `base` is prefixed to media/ and seq/ asset paths (defaults to the page's own folder). */
(function (global) {
  'use strict';

  var TOTAL = 300;              // frames in seq/ (s000.jpg … s299.jpg), 30 fps
  var SEG_END = [92, 189, 299]; // each phase ends on a rest pose
  var SEQ_HEIGHT_VH = 300;
  var PLAYBACK_FPS = 30;

  var PEOPLE = [1, 2, 3, 4].map(function () {
    return { name: 'Ambassador Name', role: 'Community Ambassador', meta: 'City, Province', photo: '' };
  });

  var FAQS = [
    ['Will it work with my power chair?', "The arm is built to mount to most major power chair brands and frames, including tilt and recline bases. Send us your chair's make and model and our team will confirm fit before you book a demo."],
    ['Is it right for my needs and condition?', 'Every body and every diagnosis is different, so we start with a conversation, not a spec sheet. During your demo, our team assesses your range of motion, control method, and daily goals to see where the arm helps most.'],
    ['Can it mount to my bed?', 'A bed-mount base is available for use away from your chair, so you can keep the same independence at your bedside. Ask your demo coordinator about adding it to your setup.'],
    ['Does it increase the width of the chair?', "No. The arm mounts and folds within your chair's existing footprint, so it doesn't add width and won't affect how you fit through doorways you already clear."],
    ['Will it still fit into my mobility van?', "Yes. Folded, the arm sits within your chair's standard height and length envelope, so it's designed to travel in the same mobility van setup you use today."]
  ];

  function pad3(i) { return String(i).padStart(3, '0'); }

  function mount(root, opts) {
    opts = opts || {};
    var base = opts.base || '';
    if (base && !/\/$/.test(base)) base += '/';

    // ---- rebase relative asset paths (media/…, seq/…) when hosted elsewhere
    if (base) {
      root.querySelectorAll('[src],[srcset]').forEach(function (el) {
        ['src', 'srcset'].forEach(function (a) {
          var v = el.getAttribute(a);
          if (v && /^(media|seq)\//.test(v)) el.setAttribute(a, base + v);
        });
      });
    }

    var nav = root.querySelector('#sielo-nav');
    var menuBtn = root.querySelector('[data-menu-toggle]');
    var hero = root.querySelector('[data-hero]');
    var seq = root.querySelector('[data-seq]');
    var canvas = root.querySelector('[data-seq-canvas]');
    var seqGrid = root.querySelector('[data-seq-grid]');
    var phases = Array.prototype.slice.call(root.querySelectorAll('[data-phase]'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-dot]'));

    // ---- nav / menu
    var menuOpen = false;
    function setMenu(open) {
      menuOpen = open;
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      applyNav();
    }
    menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
    root.querySelectorAll('[data-menu-link]').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    function applyNav() {
      var scrolled = (global.scrollY || global.pageYOffset) > 40;
      nav.classList.toggle('is-solid', scrolled || menuOpen);
    }

    // ---- people cards
    var peopleWrap = root.querySelector('[data-people]');
    PEOPLE.forEach(function (p) {
      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-reveal', '');
      card.innerHTML =
        '<div class="portrait">' + (p.photo ? '<img src="' + p.photo + '" alt="' + p.name + '">' : 'ambassador portrait') + '</div>' +
        '<div><h3></h3><p class="role"></p><p class="meta"></p></div>';
      card.querySelector('h3').textContent = p.name;
      card.querySelector('.role').textContent = p.role;
      card.querySelector('.meta').textContent = p.meta;
      peopleWrap.appendChild(card);
    });

    // ---- FAQ accordion
    var faqWrap = root.querySelector('[data-faq]');
    var items = FAQS.map(function (qa, i) {
      var item = document.createElement('div');
      item.className = 'item' + (i === 0 ? ' is-open' : '');
      item.innerHTML =
        '<button class="q" type="button" aria-expanded="' + (i === 0) + '"><span></span>' +
        '<span class="chev"><svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M6 9l6 6 6-6" stroke="#192042" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></button>' +
        '<div class="a"><p></p></div>';
      item.querySelector('.q span').textContent = qa[0];
      item.querySelector('.a p').textContent = qa[1];
      item.querySelector('.q').addEventListener('click', function () {
        var open = item.classList.contains('is-open');
        items.forEach(function (it) { it.classList.remove('is-open'); it.querySelector('.q').setAttribute('aria-expanded', 'false'); });
        if (!open) { item.classList.add('is-open'); item.querySelector('.q').setAttribute('aria-expanded', 'true'); }
      });
      faqWrap.appendChild(item);
      return item;
    });

    // ---- reveal on scroll
    if ('IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
      root.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
    } else {
      root.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    }

    // ---- hero video: play, and restart from the top when it scrolls back into view
    if (hero) {
      var play = function () { var p = hero.play(); if (p && p.catch) p.catch(function () {}); };
      play();
      if ('IntersectionObserver' in global) {
        var seen = false;
        new IntersectionObserver(function (es) {
          var e = es[0];
          if (e.isIntersecting) { if (seen) hero.currentTime = 0; play(); seen = true; } else { hero.pause(); }
        }, { threshold: 0.2 }).observe(hero);
      }
    }

    // ---- scroll sequence
    seq.style.height = SEQ_HEIGHT_VH + 'vh';
    var ctx = null, blobs = [], bitmaps = [], decoding = new Set(), bmpH = 1200;
    var cur = 0, tgt = 0, raf = null, lastT = 0, drawnKey = '', phase = 0, compact = null;

    function loadFrames() {
      blobs = new Array(TOTAL).fill(null);
      bitmaps = new Array(TOTAL).fill(null);
      var cursor = 0;
      var next = function () {
        if (cursor >= TOTAL) return;
        var i = cursor++;
        fetch(base + 'seq/s' + pad3(i) + '.jpg').then(function (r) { return r.blob(); }).then(function (b) { blobs[i] = b; })
          .catch(function () {}).then(function () { ensureWindow(); next(); });
      };
      for (var k = 0; k < 8; k++) next();
    }
    function windowRange() {
      var dir = tgt >= cur ? 1 : -1, c = Math.floor(cur), ahead = 36, behind = 8;
      return dir > 0 ? [c - behind, c + ahead] : [c - ahead, c + behind];
    }
    function ensureWindow() {
      var r = windowRange(), lo = r[0], hi = r[1];
      for (var i = 0; i < TOTAL; i++) if (bitmaps[i] && (i < lo - 6 || i > hi + 6)) { bitmaps[i].close(); bitmaps[i] = null; }
      var dir = tgt >= cur ? 1 : -1, c = Math.floor(cur), n = decoding.size;
      for (var d = 0; d <= 36 && n < 4; d++) {
        [c + dir * d, c - dir * d].forEach(function (j) {
          if (j < 0 || j >= TOTAL || j < lo || j > hi || n >= 4) return;
          if (bitmaps[j] || decoding.has(j) || !blobs[j]) return;
          decoding.add(j); n++;
          createImageBitmap(blobs[j], { resizeHeight: bmpH, resizeQuality: 'medium' }).then(function (b) {
            decoding.delete(j);
            var r2 = windowRange();
            if (j < r2[0] - 6 || j > r2[1] + 6) { b.close(); } else { bitmaps[j] = b; if (Math.abs(j - cur) < 1.5) paint(cur, true); }
            ensureWindow();
          }, function () { decoding.delete(j); ensureWindow(); });
        });
      }
    }
    function nearest(i) {
      if (bitmaps[i]) return bitmaps[i];
      for (var d = 1; d < TOTAL; d++) { var a = bitmaps[i - d] || bitmaps[i + d]; if (a) return a; }
      return null;
    }
    function paint(f, force) {
      f = Math.max(0, Math.min(TOTAL - 1, f));
      var i = Math.floor(f), frac = f - i;
      var a = nearest(i);
      if (!a) return;
      var b = frac > 0.02 && bitmaps[i] ? bitmaps[i + 1] : null;
      var key = i + ':' + (b ? Math.round(frac * 32) : 0);
      if (!force && key === drawnKey) return;
      if (!ctx) ctx = canvas.getContext('2d', { alpha: false });
      var cw = canvas.width, ch = canvas.height;
      ctx.globalAlpha = 1;
      ctx.drawImage(a, 0, 0, cw, ch);
      if (b) { ctx.globalAlpha = frac; ctx.drawImage(b, 0, 0, cw, ch); ctx.globalAlpha = 1; }
      drawnKey = key;
    }
    function sizeCanvas() {
      var wrap = canvas.parentElement, W = wrap.clientWidth, Hv = wrap.clientHeight;
      if (!W || !Hv) return;
      var H, top, left, gridTop = 0, gridBottom = 0;
      if (compact) {
        // phones / portrait tablets: footage below the nav, copy in its own band underneath — never overlapping
        var navH = 76, textH = 216, dotsH = 60;
        H = Math.min(Math.max(200, Hv - navH - textH - dotsH), Math.round(W * 4 / 3) - 16);
        top = navH;
        left = Math.round((W - H * 3 / 4) / 2);
        gridTop = top + H + 8; gridBottom = dotsH;
      } else {
        // desktop: 90% of the viewport height, right of centre beside the copy
        H = Math.round(Hv * 0.9); top = Math.round(Hv * 0.05);
        left = Math.round(W * 0.74 - H * 3 / 8);
      }
      var cssW = Math.round(H * 3 / 4);
      if (seqGrid) {
        if (seqGrid.style.top !== gridTop + 'px') seqGrid.style.top = gridTop + 'px';
        if (seqGrid.style.bottom !== gridBottom + 'px') seqGrid.style.bottom = gridBottom + 'px';
      }
      if (canvas.style.left !== left + 'px') canvas.style.left = left + 'px';
      if (canvas.style.top !== top + 'px') canvas.style.top = top + 'px';
      if (canvas.style.height !== H + 'px') canvas.style.height = H + 'px';
      var dpr = Math.min(global.devicePixelRatio || 1, 2, 1200 / H);
      var w = Math.round(cssW * dpr), h = Math.round(H * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; bmpH = Math.min(1440, h); paint(cur, true); }
    }
    function setPhase(p) {
      if (p === phase) return;
      phase = p;
      phases.forEach(function (el, i) {
        el.classList.toggle('is-active', i === p);
        el.classList.toggle('is-past', i < p);
      });
      dots.forEach(function (el, i) { el.classList.toggle('is-active', i === p); });
    }
    function setPhaseTarget(seg) {
      seg = Math.min(seg, SEG_END.length - 1);
      var t = seg < 0 ? 0 : SEG_END[seg];
      if (t === tgt) return;
      // scrolling back up: restart that phase's own clip from its first frame
      if (t < tgt || seg === 0) { cur = seg <= 0 ? 0 : SEG_END[seg - 1]; drawnKey = ''; }
      tgt = t;
      setPhase(Math.max(0, seg));
      if (raf) return;
      lastT = performance.now();
      ensureWindow();
      var step = function (now) {
        var dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        var d = tgt - cur, dir = Math.sign(d);
        var speed = PLAYBACK_FPS * Math.min(1, 0.3 + Math.abs(d) / 8);
        var nc = cur + dir * speed * dt;
        if ((dir > 0 && nc >= tgt) || (dir < 0 && nc <= tgt)) nc = tgt;
        var need = Math.max(0, Math.min(TOTAL - 1, dir > 0 ? Math.ceil(nc) : Math.floor(nc)));
        if (!bitmaps[need]) { ensureWindow(); raf = requestAnimationFrame(step); return; }
        if (Math.floor(nc) !== Math.floor(cur)) ensureWindow();
        cur = nc;
        paint(nc);
        if (nc === tgt) { raf = null; return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    // ---- scroll / resize
    var tick = false;
    function update() {
      var c = global.innerWidth < 900;
      if (c !== compact) { compact = c; root.classList.toggle('is-compact', c); if (menuOpen) setMenu(false); drawnKey = ''; }
      var r = seq.getBoundingClientRect();
      var total = Math.max(1, r.height - global.innerHeight);
      var p = -r.top / total;
      // phase 0 plays as the section pins; later phases trigger at 20% and 40% of the pinned scroll, the rest holds the last pose
      var seg = p < -0.02 ? -1 : p < 0.2 ? 0 : p < 0.4 ? 1 : 2;
      if (r.bottom > -global.innerHeight && r.top < global.innerHeight * 2) { sizeCanvas(); setPhaseTarget(seg); }
      applyNav();
    }
    function onScroll() { if (tick) return; tick = true; requestAnimationFrame(function () { tick = false; update(); }); }
    global.addEventListener('scroll', onScroll, { passive: true, capture: true });
    global.addEventListener('resize', onScroll);

    phases[0].classList.add('is-active');
    dots[0].classList.add('is-active');
    loadFrames();
    update();

    return {
      destroy: function () {
        global.removeEventListener('scroll', onScroll, { capture: true });
        global.removeEventListener('resize', onScroll);
        if (raf) cancelAnimationFrame(raf);
        bitmaps.forEach(function (b) { if (b) b.close(); });
      }
    };
  }

  global.SieloSite = { mount: mount, PEOPLE: PEOPLE, FAQS: FAQS };
})(window);
