/* =====================================================================
   APP.JS — motion and behaviour for the one-page site.

   Everything is an enhancement. The CSS only hides things while
   html.js is set, and the inline head script removes that class if
   this file never starts — so with JS off or broken, the page simply
   shows all of its content. Under prefers-reduced-motion, content
   appears immediately and nothing parallaxes.
   ===================================================================== */
(function () {
  'use strict';

  window.__ready = true; // tells the inline head fallback to stand down

  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* -----------------------------------------------------------------
     Text splitting — done first, so hidden start states exist before
     anything is revealed.
     ----------------------------------------------------------------- */

  // Hero name: one span per letter, numbered across both lines so the
  // stagger runs continuously from "A" of Aditya to "o" of Ahirrao.
  (function splitChars() {
    var n = 0;
    $$('[data-chars]').forEach(function (el) {
      var text = el.textContent;
      el.textContent = '';
      for (var i = 0; i < text.length; i++) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = text[i];
        s.style.setProperty('--i', n++);
        el.appendChild(s);
      }
    });
  })();

  // Headings: each word rises out of its own mask. Words are split on
  // ordinary spaces only, so &nbsp; keeps a pair together on one line.
  function splitWords(el, cls, inner) {
    var words = el.textContent.split(' ').filter(Boolean);
    el.textContent = '';
    words.forEach(function (w, i) {
      var outer = document.createElement('span');
      outer.className = cls;
      if (inner) {
        var x = document.createElement('i');
        x.textContent = w;
        outer.appendChild(x);
        outer.style.setProperty('--i', i);
      } else {
        outer.textContent = w;
      }
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return el.querySelectorAll('.' + cls);
  }

  $$('[data-split]').forEach(function (el) { splitWords(el, 'w', true); });

  var statement = $('[data-words]');
  var stWords = statement ? Array.prototype.slice.call(splitWords(statement, 'sw', false)) : [];

  /* -----------------------------------------------------------------
     Intro — counts to 100, then the curtain lifts as the hero arrives.
     Plays once per visit (the head script decides).
     ----------------------------------------------------------------- */
  function startSite() {
    // Two frames so the hidden start state is painted before it animates,
    // with a timer behind it in case frames are being throttled.
    var done = false;
    function go() { if (!done) { done = true; body.classList.add('is-loaded'); } }
    requestAnimationFrame(function () { requestAnimationFrame(go); });
    setTimeout(go, 150);
  }

  (function intro() {
    if (!root.classList.contains('has-intro')) { startSite(); return; }

    var intro = $('.intro');
    var num = $('#introNum');
    var bar = $('#introBar');
    var t0 = null;
    var duration = 1300;

    var finished = false;

    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // The counter is drawn on animation frames, but finishing is on a
    // timer: if frames are throttled (a background tab, a busy device)
    // the visitor is never left waiting behind the curtain.
    function step(ts) {
      if (finished) return;
      if (t0 === null) t0 = ts;
      var p = ease(Math.min((ts - t0) / duration, 1));
      num.textContent = Math.round(p * 100);
      bar.style.transform = 'scaleX(' + p + ')';
      if (p < 1) requestAnimationFrame(step);
    }

    function finish() {
      if (finished) return;
      finished = true;
      num.textContent = '100';
      bar.style.transform = 'scaleX(1)';
      setTimeout(function () {
        intro.classList.add('is-done');
        try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
        // the hero starts animating while the curtain is still lifting
        setTimeout(startSite, 280);
        setTimeout(function () { root.classList.remove('has-intro'); }, 1100);
      }, 220);
    }

    requestAnimationFrame(step);
    setTimeout(finish, duration + 60);
  })();

  /* -----------------------------------------------------------------
     Role ticker in the hero eyebrow
     ----------------------------------------------------------------- */
  (function ticker() {
    var items = $$('.ticker__item');
    if (items.length < 2 || reduce) return;
    var now = 0;

    setInterval(function () {
      if (document.hidden) return;
      var cur = items[now];
      now = (now + 1) % items.length;
      var nxt = items[now];

      cur.classList.remove('is-on');
      cur.classList.add('is-off');
      nxt.classList.remove('is-off');
      nxt.classList.add('is-on');

      // once it has left, park the old one below, ready to come back up
      setTimeout(function () {
        if (!cur.classList.contains('is-on')) {
          cur.style.transition = 'none';
          cur.classList.remove('is-off');
          void cur.offsetWidth;
          cur.style.transition = '';
        }
      }, 950);
    }, 2600);
  })();

  /* -----------------------------------------------------------------
     Navbar — scroll-spy, scrolled state, mobile menu
     ----------------------------------------------------------------- */
  var bar = $('#topbar');
  var nav = $('.tnav', bar);
  var navLinks = $$('a[data-spy]', nav);
  var sheetLinks = $$('#sheet a[data-spy]');

  function setCurrent(id) {
    navLinks.concat(sheetLinks).forEach(function (a) {
      var on = a.getAttribute('data-spy') === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  var spySections = navLinks.map(function (a) { return document.getElementById(a.getAttribute('data-spy')); }).filter(Boolean);
  var lastSpy = 'home';
  function spy() {
    var line = window.innerHeight * 0.42;
    var id = spySections[0] ? spySections[0].id : 'home';
    spySections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) id = s.id; });
    // the last section may never reach the line on tall screens
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 4) {
      id = spySections[spySections.length - 1].id;
    }
    if (id !== lastSpy) { lastSpy = id; setCurrent(id); }
  }

  (function menu() {
    var btn = $('.menu-btn', bar);
    var sheet = $('#sheet', bar);
    if (!btn || !sheet) return;
    function setOpen(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      sheet.classList.toggle('open', open);
    }
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', function (e) { if (!bar.contains(e.target)) setOpen(false); });
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900) setOpen(false); });
  })();

  /* -----------------------------------------------------------------
     Hero — scroll parallax (--hs) and pointer parallax (--px, --py).
     The portrait, the light behind it and the name each move a
     different amount, which is what gives the hero its depth.
     ----------------------------------------------------------------- */
  var hero = $('.hero');

  function heroScroll(y) {
    if (!hero || reduce) return;
    var h = hero.offsetHeight || 1;
    if (y > h * 1.2) return;                 // off screen: stop writing
    hero.style.setProperty('--hs', clamp(y / h, 0, 1).toFixed(4));
  }

  (function pointerParallax() {
    if (!hero || !finePointer || reduce) return;
    var tx = 0, ty = 0, x = 0, y = 0, raf = null;

    function frame() {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      hero.style.setProperty('--px', x.toFixed(4));
      hero.style.setProperty('--py', y.toFixed(4));
      raf = (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) ? requestAnimationFrame(frame) : null;
    }
    function run() { if (!raf) raf = requestAnimationFrame(frame); }

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
      ty = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
      run();
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; run(); });
  })();

  /* -----------------------------------------------------------------
     About statement — words light up one by one as it scrolls past
     ----------------------------------------------------------------- */
  var litCount = -1;
  function lightWords() {
    if (!stWords.length) return;
    if (reduce) { if (litCount !== stWords.length) { stWords.forEach(function (w) { w.classList.add('lit'); }); litCount = stWords.length; } return; }
    var r = statement.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.32), 0, 1);
    var n = Math.round(p * stWords.length);
    if (n === litCount) return;
    litCount = n;
    stWords.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
  }

  /* -----------------------------------------------------------------
     One scroll loop for everything scroll-linked
     ----------------------------------------------------------------- */
  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset;
    bar.classList.toggle('is-scrolled', y > 10);
    heroScroll(y);
    lightWords();
    spy();
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(onScroll); });
  onScroll();

  /* -----------------------------------------------------------------
     Reveal on scroll. Elements that arrive together are staggered so a
     row of items settles in sequence rather than all at once.
     ----------------------------------------------------------------- */
  (function reveal() {
    var els = $$('.reveal, .reveal-img, [data-split]');
    if (!els.length) return;

    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (!el.hasAttribute('data-split') && !el.classList.contains('reveal-img')) {
          el.style.transitionDelay = Math.min(batch, 5) * 90 + 'ms';
        }
        batch++;
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    els.forEach(function (el) { io.observe(el); });
  })();

  /* -----------------------------------------------------------------
     Counters
     ----------------------------------------------------------------- */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    function fmt(v, d) { return d > 0 ? v.toFixed(d) : Math.round(v).toLocaleString('en-US'); }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var dec = parseInt(el.getAttribute('data-decimals'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduce) { el.textContent = fmt(target, dec) + suffix; return; }
      var t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / 1800, 1);
        var e = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt(target * e, dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  })();

  /* -----------------------------------------------------------------
     Magnetic buttons — they lean a little toward the pointer
     ----------------------------------------------------------------- */
  (function magnetic() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach(function (el) {
      el.style.transition = (el.style.transition ? el.style.transition + ', ' : '') + 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.32;
        el.style.transform = 'translate(' + clamp(dx, -10, 10) + 'px,' + clamp(dy, -8, 8) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  })();

  /* -----------------------------------------------------------------
     Achievements lightbox
     ----------------------------------------------------------------- */
  (function lightbox() {
    var items = $$('[data-zoom]');
    if (!items.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Image preview');
    box.innerHTML = '<button type="button" aria-label="Close preview">&times;</button><figure><img alt=""><p></p></figure>';
    document.body.appendChild(box);

    var img = $('img', box), cap = $('p', box), closeBtn = $('button', box), last = null;

    function open(el) {
      last = document.activeElement;
      img.src = el.getAttribute('data-zoom');
      img.alt = el.getAttribute('data-caption') || '';
      cap.textContent = el.getAttribute('data-caption') || '';
      box.classList.add('open');
      closeBtn.focus();
    }
    function close() {
      box.classList.remove('open');
      if (last && last.focus) last.focus();
    }

    items.forEach(function (el) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.addEventListener('click', function () { open(el); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); }
      });
    });
    box.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
  })();

  /* -----------------------------------------------------------------
     Contact form (EmailJS — same service and template as before)
     ----------------------------------------------------------------- */
  (function contactForm() {
    var form = $('#contactForm');
    if (!form) return;
    var status = $('#formStatus');
    var btn = $('button[type="submit"]', form);
    var label = $('span', btn);
    var original = label.textContent;

    if (typeof emailjs !== 'undefined') emailjs.init('tNoh2RcQKithv_QJG');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var missing = $$('[required]', form).filter(function (f) { return !f.value.trim(); });
      if (missing.length) {
        status.className = 'form__status err';
        status.textContent = 'Please fill in ' + missing.map(function (f) { return f.labels[0].textContent.toLowerCase(); }).join(', ') + '.';
        missing[0].focus();
        return;
      }
      if (typeof emailjs === 'undefined') {
        status.className = 'form__status err';
        status.textContent = 'The mail service did not load. Please email me directly instead.';
        return;
      }

      btn.disabled = true;
      label.textContent = 'Sending…';
      status.className = 'form__status';
      status.textContent = '';

      emailjs.sendForm('service_o2idb4e', 'template_1gpm1wq', form).then(function () {
        status.className = 'form__status ok';
        status.textContent = 'Message sent. I’ll get back to you soon.';
        form.reset();
        btn.disabled = false;
        label.textContent = original;
      }, function () {
        status.className = 'form__status err';
        status.textContent = 'Could not send that. Please try again or email me directly.';
        btn.disabled = false;
        label.textContent = original;
      });
    });
  })();

  /* -----------------------------------------------------------------
     Latest posts rails. Content comes from posts-data.js, generated by
     tools/fetch-posts.js.
     ----------------------------------------------------------------- */
  (function posts() {
    var rails = $$('.rail');
    if (!rails.length) return;
    var DATA = window.SOCIAL_POSTS || [];
    var LABEL = { linkedin: 'LinkedIn', instagram: 'Instagram' };

    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text) n.textContent = text;
      return n;
    }

    function card(p) {
      var a = el('a', 'post');
      a.href = p.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      var media = el('div', 'post__media');
      if (p.image) {
        var im = el('img');
        im.src = p.image;
        im.alt = '';
        im.loading = 'lazy';
        im.decoding = 'async';
        media.appendChild(im);
      }
      a.appendChild(media);
      var b = el('div', 'post__body');
      b.appendChild(el('span', 'post__chip', LABEL[p.platform]));
      b.appendChild(el('h4', null, p.headline));
      if (p.text) b.appendChild(el('p', null, p.text));
      b.appendChild(el('span', 'post__cta', 'View post →'));
      a.appendChild(b);
      return a;
    }

    function empty(platform, profile) {
      var a = el('a', 'post post--empty');
      a.href = profile;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.appendChild(el('h4', null, 'See the latest on ' + LABEL[platform]));
      a.appendChild(el('p', null, 'Posts show up here once they are added. The profile itself is always current.'));
      a.appendChild(el('span', 'post__cta', 'Open profile →'));
      return a;
    }

    rails.forEach(function (rail) {
      var platform = rail.getAttribute('data-platform');
      var track = $('.rail__track', rail);
      var mine = DATA.filter(function (p) { return p.platform === platform; });
      if (mine.length) mine.forEach(function (p) { track.appendChild(card(p)); });
      else track.appendChild(empty(platform, rail.getAttribute('data-profile')));

      var prev = $('.prev', rail), next = $('.next', rail);
      function step(dir) {
        var first = $('.post', track);
        var by = first ? first.offsetWidth + 16 : track.clientWidth * 0.8;
        track.scrollBy({ left: dir * by, behavior: reduce ? 'auto' : 'smooth' });
      }
      function sync() {
        var max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
        rail.classList.toggle('is-static', max <= 0);
      }
      prev.addEventListener('click', function () { step(-1); });
      next.addEventListener('click', function () { step(1); });
      track.addEventListener('scroll', function () { requestAnimationFrame(sync); }, { passive: true });
      window.addEventListener('resize', sync);
      sync();
    });
  })();
  /* -----------------------------------------------------------------
     Ask my portfolio — posts to /api/ask and renders the cited answer.
     Each answer part may cite source chunks; those become [n] marks
     that match the numbered source list under the answer.
     ----------------------------------------------------------------- */
  (function ask() {
    var form = $('#askForm');
    if (!form) return;
    var input = $('#askInput');
    var log = $('#askLog');
    var chips = $$('#askChips button');
    var history = [];
    var busy = false;

    function node(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text) n.textContent = text;
      return n;
    }
    function setBusy(on) {
      busy = on;
      form.querySelector('button').disabled = on;
      chips.forEach(function (b) { b.disabled = on; });
    }
    function scrollDown() { log.scrollTop = log.scrollHeight; }

    function render(li, data) {
      li.classList.remove('is-wait');
      li.textContent = '';
      var used = [];                       // source indexes in order of first citation
      var plain = '';
      (data.parts || []).forEach(function (p) {
        li.appendChild(document.createTextNode(p.text));
        plain += p.text;
        (p.cites || []).forEach(function (i) {
          var n = used.indexOf(i);
          if (n === -1) { used.push(i); n = used.length - 1; }
          var sup = node('sup', null, String(n + 1));
          sup.title = data.sources[i] || '';
          li.appendChild(sup);
        });
      });
      if (used.length) {
        var list = node('ul', 'ask__src');
        list.setAttribute('aria-label', 'Sources');
        used.forEach(function (i, n) {
          var item = node('li');
          item.appendChild(node('b', null, '[' + (n + 1) + ']'));
          item.appendChild(document.createTextNode(data.sources[i] || ''));
          list.appendChild(item);
        });
        li.appendChild(list);
      }
      return plain;
    }

    function send(question) {
      question = question.trim();
      if (!question || busy) return;
      setBusy(true);
      log.appendChild(node('li', 'ask__q', question));
      var answer = node('li', 'ask__a is-wait');
      log.appendChild(answer);
      scrollDown();

      fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question, history: history })
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) {
            if (!r.ok) throw new Error(data.error || 'The assistant could not answer right now.');
            return data;
          });
        })
        .then(function (data) {
          var text = render(answer, data);
          history.push({ role: 'user', content: question }, { role: 'assistant', content: text });
          history = history.slice(-6);
        })
        .catch(function (err) {
          answer.classList.remove('is-wait');
          answer.classList.add('is-error');
          answer.textContent = location.protocol === 'file:'
            ? 'The assistant runs on the deployed site; it is not available when the page is opened as a local file.'
            : err.message;
        })
        .then(function () { setBusy(false); scrollDown(); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      send(input.value);
      input.value = '';
    });
    chips.forEach(function (b) {
      b.addEventListener('click', function () { send(b.textContent); });
    });
  })();
})();
