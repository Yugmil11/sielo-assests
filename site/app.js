/* Sielo Robotics — ARLO landing page behaviour.
   Usage: SieloSite.mount(rootElement, { base: 'https://host/path/' })
   `base` is prefixed to media/ and seq/ asset paths (defaults to the page's own folder). */
(function (global) {
  'use strict';

  var TOTAL = 300;              // frames in seq/ (s000.jpg … s299.jpg), 30 fps
  var SEG_END = [92, 189, 299]; // each phase ends on a rest pose
  var SEQ_HEIGHT_VH = 300;
  var PLAYBACK_FPS = 30;

  // Width that decides the compact (phone) layouts. Inside Wix the site can be narrower than the
  // browser window (Wix's mobile layout is a 320px column), so use the smaller of the two.
  function layoutWidth(root) {
    var w = root && root.getBoundingClientRect ? root.getBoundingClientRect().width : 0;
    return w > 0 ? Math.min(w, global.innerWidth) : global.innerWidth;
  }

  var TESTIMONIALS = [
    { quote: "If I were to have access to a robotic arm on a day to day basis, it would be life changing. Minutely simple tasks like reaching for things that are even ever so slightly out of reach at my finger tips are equally as inaccessible to me as something a mile away. To think that I could be given the power to change that, and do more complex tasks such as turn on a light or feed myself, is mind blowing.", name: 'Hollis Peirce', meta: 'Head of Accessibility & Partnerships, Sielo', role: true, img: 'media/person-hollis.jpg' },
    { quote: "I have Cerebral Palsy Spastic Quadriplegic Generalized Dystonia. Not every door has an accessible button on it, or the button is too high for me to reach, and not every store is accessible so I have to wait outside. I only have one cooperative arm, so I can't do a lot of things independently, but I would love to. I think the robot arm is awesome and I think it will help me to do a lot more things independently, and it's so easy to use.", name: 'Charlotte Breau', meta: 'Early Design Contributor', role: true, img: 'media/person-charlotte.jpg' },
    { quote: "I was diagnosed with Severe Arthrogryposis Multiplex Congenita (AMC), and I deal with challenges pretty much most days of my life. Sometimes I've been to places that aren't accessible, like I can't get up on the sidewalk somewhere or they don't have a button to open the door. I find ARLO very easy to use. It will be very helpful for me and give me the independence I need to do the simplest things. It will give me the best quality of life!", name: 'Sienna Beaudoin', meta: 'Early Design Contributor', role: true, img: 'media/person-sienna.jpg' },
    { quote: "Being able to grab objects myself gives me a whole new level of freedom that I wouldn't normally have. Something as simple as dropping an item in a grocery store and not being able to reach it can turn a two-second moment into a whole situation where I have to find someone to help me pick it up. Having this type of technology means I can be more independent, make my own choices, and just get on with my day without constantly having to rely on someone else.", name: 'Izzy Sicoli', meta: 'Early Design Contributor', role: true, img: 'media/person-izzy.jpg' },
    { quote: "Having an assistive device like this would be life changing. I immediately started thinking about all of the things I would be able to do, and the list hasn't stopped growing. Being able to do simple tasks like picking up a dropped object or closing the door behind me is an essential part of life that this arm gives me the ability and freedom to do independently. Not to mention that Sielo Robotics actually is developing everything with people that have lived experience of needing this technology, so I know that it's designed with understanding not guess work.", name: 'Sydney Hodgson', meta: 'Ottawa, Ontario', img: 'media/person-sydney.jpg' },
    { quote: "It's important to make advances in robotics accessible and affordable for people with disabilities. Sielo is a trailblazer when it comes to these values to improve the lives of disabled people with robotics innovations.", name: 'Chris Binkowski', meta: 'Ottawa, Ontario', img: 'media/person-chris.jpg' },
    { quote: "As someone born with Cerebral Palsy, I have never possessed the coordination to feed myself a snack or even a full meal. Having the robotic arm to assist me with this daily task would mean I can finally choose the first and the last bite I get to eat every single time. Also with this assistance, I can go out to dinner with whoever I choose to and I don't have to ask the person if they are comfortable assisting me.", name: 'Tammy Culhane', meta: 'Community member', img: 'media/person-tammy.jpg', pos: '50% 30%' }
  ];

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

    // ---- testimonial carousel: 3 copies of the list, we live in the middle copy and silently
    // recentre after each snap so it loops forever in both directions
    var rail = root.querySelector('[data-rail]');
    var railDots = root.querySelector('[data-rail-dots]');
    var N = TESTIMONIALS.length, tIdx = 0, railT = null;
    [0, 1, 2].forEach(function (copy) {
      TESTIMONIALS.forEach(function (t) {
        var fig = document.createElement('figure');
        if (copy !== 1) fig.setAttribute('aria-hidden', 'true');
        var bq = document.createElement('blockquote'); bq.textContent = t.quote;
        var cap = document.createElement('figcaption');
        var av;
        if (t.img) { av = document.createElement('img'); av.src = base + t.img; av.alt = t.name; av.loading = 'lazy'; av.style.objectPosition = t.pos || '50% 22%'; }
        else { av = document.createElement('span'); av.className = 'initial'; av.textContent = t.name.charAt(0); }
        var who = document.createElement('div'); who.style.minWidth = '0';
        var nm = document.createElement('p'); nm.className = 'name'; nm.textContent = t.name;
        var mt = document.createElement('p'); mt.className = 'meta' + (t.role ? ' role' : ''); mt.textContent = t.meta;
        who.appendChild(nm); who.appendChild(mt); cap.appendChild(av); cap.appendChild(who);
        fig.appendChild(bq); fig.appendChild(cap); rail.appendChild(fig);
      });
    });
    var dotEls = TESTIMONIALS.map(function (t, i) {
      var d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Testimonial ' + (i + 1));
      d.addEventListener('click', function () { railGo(i); });
      railDots.appendChild(d); return d;
    });
    function mod(n) { return ((n % N) + N) % N; }
    function railStep() { var f = rail.firstElementChild; return f ? f.getBoundingClientRect().width + 24 : 1; }
    function setDot(i) { tIdx = i; dotEls.forEach(function (d, k) { d.classList.toggle('is-active', k === i); }); }
    function railGo(i) {
      var step = railStep(), pos = Math.round(rail.scrollLeft / step) + (i - tIdx);
      rail.scrollTo({ left: pos * step, behavior: 'smooth' });
      setDot(mod(i));
    }
    function railCentre() {
      var step = railStep(), pos = Math.round(rail.scrollLeft / step);
      if (pos < N || pos >= 2 * N) {
        var prev = rail.style.scrollSnapType; rail.style.scrollSnapType = 'none';
        rail.scrollLeft = (N + mod(pos)) * step;
        rail.style.scrollSnapType = prev;
      }
    }
    rail.addEventListener('scroll', function () {
      var i = mod(Math.round(rail.scrollLeft / railStep()));
      if (i !== tIdx) setDot(i);
      clearTimeout(railT); railT = setTimeout(railCentre, 120);
    }, { passive: true });
    root.querySelector('[data-rail-prev]').addEventListener('click', function () { railGo(tIdx - 1); });
    root.querySelector('[data-rail-next]').addEventListener('click', function () { railGo(tIdx + 1); });
    setDot(0);
    requestAnimationFrame(function () { rail.scrollLeft = N * railStep(); });

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
    var cur = 0, tgt = 0, raf = null, lastT = 0, drawnKey = '', phase = 0, compact = null, navCompact = null, navActive = null;
    var navLinks = Array.prototype.slice.call(root.querySelectorAll('[data-nav]'));

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
      var lw = layoutWidth(root);
      var c = lw < 900;
      if (c !== compact) { compact = c; root.classList.toggle('is-compact', c); drawnKey = ''; requestAnimationFrame(function () { rail.scrollLeft = (N + tIdx) * railStep(); }); }
      var nc2 = lw < 1000;
      if (nc2 !== navCompact) { navCompact = nc2; root.classList.toggle('is-navcompact', nc2); if (menuOpen) setMenu(false); }
      // highlight the nav item for the section under the top third of the screen
      var line = global.innerHeight * 0.35;
      var topOf = function (id) { var el = root.querySelector('#' + id); return el ? el.getBoundingClientRect().top : Infinity; };
      var act = topOf('faq') < line ? 'faq' : topOf('people') < line ? 'people' : 'home';
      if (act !== navActive) { navActive = act; navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === act); }); }
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


  // ================= Contact Us / Get Involved forms =================
  // Where submissions go. Paste a Formspree (or similar) endpoint, e.g. 'https://formspree.io/f/abcdwxyz'.
  // While empty, the form validates and shows the thank-you message but nothing is sent anywhere.
  var FORM_ENDPOINTS = { contact: '', involved: '' };

  var FORM_DEFS = {
    contact: {
      fields: [
        { id: 'firstName', label: 'First name', req: true, type: 'text', ac: 'given-name' },
        { id: 'lastName', label: 'Last name', req: true, type: 'text', ac: 'family-name' },
        { id: 'email', label: 'Email address', req: true, type: 'email', ac: 'email' },
        { id: 'phone', label: 'Phone number', req: false, type: 'tel', ac: 'tel' },
        { id: 'org', label: 'Organization', req: false, type: 'text', ac: 'organization', span: 2 },
        { id: 'subject', label: 'Subject', req: true, type: 'text', ac: 'off', span: 2 }
      ],
      options: null
    },
    involved: {
      fields: [
        { id: 'firstName', label: 'First name', req: true, type: 'text', ac: 'given-name' },
        { id: 'lastName', label: 'Last name', req: true, type: 'text', ac: 'family-name' },
        { id: 'email', label: 'Email address', req: true, type: 'email', ac: 'email' },
        { id: 'phone', label: 'Phone number', req: false, type: 'tel', ac: 'tel' },
        { id: 'city', label: 'City and country', req: true, type: 'text', ac: 'address-level2' },
        { id: 'org', label: 'Organization', req: false, type: 'text', ac: 'organization' }
      ],
      options: [
        { id: 'beta', label: 'Becoming a beta tester' },
        { id: 'preorder', label: 'Being one of the first 50 customers to preorder ARLO', note: 'This form registers your interest; it does not reserve a unit or require payment.' },
        { id: 'newsletter', label: 'Receiving monthly updates from Sielo Robotics' },
        { id: 'other', label: 'Something else' }
      ]
    }
  };

  function mountForm(root, opts) {
    opts = opts || {};
    var base = opts.base || '';
    if (base && !/\/$/.test(base)) base += '/';
    if (base) {
      root.querySelectorAll('[src]').forEach(function (el) {
        var v = el.getAttribute('src'); if (v && /^media\//.test(v)) el.setAttribute('src', base + v);
      });
    }
    var kind = root.getAttribute('data-form-page');
    var def = FORM_DEFS[kind];
    var endpoint = opts.endpoint || FORM_ENDPOINTS[kind];
    var form = root.querySelector('[data-form]');
    var card = root.querySelector('[data-card]');
    var sent = root.querySelector('[data-sent]');
    var formErr = root.querySelector('[data-form-error]');
    var wrap = root.querySelector('[data-fields]');

    // fields
    def.fields.forEach(function (f) {
      var lab = document.createElement('label');
      lab.className = 'field' + (f.span === 2 ? ' span2' : '');
      lab.innerHTML = '<span class="lbl"></span><input>';
      var l = lab.querySelector('.lbl');
      l.textContent = f.label;
      if (f.req) { var s = document.createElement('span'); s.className = 'req'; s.textContent = '*'; l.appendChild(s); }
      else { var o = document.createElement('span'); o.className = 'opt'; o.textContent = ' — optional'; l.appendChild(o); }
      var inp = lab.querySelector('input');
      inp.type = f.type; inp.name = f.id; inp.autocomplete = f.ac;
      inp.setAttribute('aria-required', f.req ? 'true' : 'false');
      if (f.req) { inp.setAttribute('data-required', ''); inp.setAttribute('data-label', f.label.toLowerCase()); }
      wrap.appendChild(lab);
    });

    // interest options, pre-checked from ?interest=preorder,beta,newsletter (or #preorder)
    if (def.options) {
      var q = new URLSearchParams(global.location.search).get('interest') || global.location.hash.replace('#', '');
      var map = { preorder: 'preorder', 'pre-order': 'preorder', beta: 'beta', newsletter: 'newsletter', mailing: 'newsletter' };
      var pre = {};
      (q || '').split(',').forEach(function (k) { var id = map[k.trim().toLowerCase()]; if (id) pre[id] = true; });
      if (opts.interest) String(opts.interest).split(',').forEach(function (k) { var id = map[k.trim().toLowerCase()]; if (id) pre[id] = true; });
      var optWrap = root.querySelector('[data-options]');
      def.options.forEach(function (o) {
        var lab = document.createElement('label'); lab.className = 'option';
        lab.innerHTML = '<input type="checkbox"><span class="txt"><span class="t"></span></span>';
        var cb = lab.querySelector('input'); cb.name = o.id; cb.checked = !!pre[o.id];
        lab.querySelector('.t').textContent = o.label;
        if (o.note) { var n = document.createElement('span'); n.className = 'n'; n.textContent = o.note; lab.querySelector('.txt').appendChild(n); }
        var sync = function () { lab.classList.toggle('is-on', cb.checked); };
        cb.addEventListener('change', sync); sync();
        optWrap.appendChild(lab);
      });
    }

    // clear a field's error as soon as the person types
    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.getAttribute('aria-invalid') === 'true') {
        el.setAttribute('aria-invalid', 'false');
        var m = el.parentElement.querySelector('.err'); if (m) m.remove();
      }
    });

    function showError(el, msg) {
      el.setAttribute('aria-invalid', 'true');
      var m = el.parentElement.querySelector('.err');
      if (!m) { m = document.createElement('span'); m.className = 'err'; m.setAttribute('role', 'alert'); el.parentElement.appendChild(m); }
      m.textContent = msg;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      formErr.hidden = true;
      var first = null;
      form.querySelectorAll('[data-required]').forEach(function (el) {
        if (!el.value.trim()) { showError(el, 'Please enter your ' + el.getAttribute('data-label') + '.'); first = first || el; }
      });
      var em = form.querySelector('[name=email]');
      if (em && em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { showError(em, 'Please enter a valid email address.'); first = first || em; }
      if (kind === 'contact') {
        var msg = form.querySelector('[name=message]');
        if (msg.getAttribute('aria-invalid') === 'true' && msg.value.trim() === '') { /* already flagged */ }
        if (!msg.value.trim()) { showError(msg, 'Please enter a message.'); first = first || msg; }
        var sub = form.querySelector('[name=subject]');
        if (sub && !sub.value.trim()) { showError(sub, 'Please enter a subject.'); }
      }
      if (first) { first.focus(); return; }

      // One flat record, same shape for every destination (Wix CMS row, Formspree email)
      var val = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      var on = function (n) { var el = form.querySelector('[name="' + n + '"]'); return !!(el && el.checked); };
      var rec = {
        form: kind === 'contact' ? 'Contact Us' : 'Get Involved',
        firstName: val('firstName'), lastName: val('lastName'), email: val('email'), phone: val('phone'),
        organization: val('org'), newsletter: on('newsletter')
      };
      if (kind === 'contact') { rec.subject = val('subject'); rec.message = val('message'); }
      else {
        rec.city = val('city'); rec.notes = val('notes');
        rec.interests = def.options.filter(function (o) { return on(o.id); }).map(function (o) { return o.label; }).join('; ');
      }

      var send;
      if (typeof opts.submit === 'function') send = opts.submit;            // Wix: handled by Velo page code
      else if (endpoint) send = function (r) {                               // Formspree or similar
        var body = Object.assign({ _subject: (kind === 'contact' ? 'Website contact: ' + r.subject : 'Get Involved: ' + r.firstName + ' ' + r.lastName) }, r);
        return fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) })
          .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); });
      };
      else send = function () { return Promise.reject(new Error('not-connected')); };

      var btn = form.querySelector('.submit'); btn.disabled = true;
      Promise.resolve().then(function () { return send(rec); }).then(function () {
        form.hidden = true; sent.hidden = false;
        global.scrollTo({ top: card.getBoundingClientRect().top + global.scrollY - 110, behavior: 'smooth' });
      }).catch(function (err) {
        btn.disabled = false;
        formErr.textContent = err && err.message === 'not-connected'
          ? "This form isn't accepting submissions yet, so your message was not sent."
          : "Sorry, your message didn't go through. Please try again in a moment.";
        formErr.hidden = false;
      });
    });

    // layout switch below 760px
    var fc = null;
    function onResize() { var c = layoutWidth(root) < 760; if (c !== fc) { fc = c; root.classList.toggle('is-formcompact', c); } }
    global.addEventListener('resize', onResize); onResize();
  }

  global.SieloSite = { mount: mount, mountForm: mountForm, TESTIMONIALS: TESTIMONIALS, FAQS: FAQS };
})(window);
