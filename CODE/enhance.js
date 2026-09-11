/* =====================================================================
   ENHANCE.JS — interaction layer
   Progressive enhancement only: every feature here is additive, and the
   page remains fully readable and usable if this file never loads.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  root.classList.add('fx');
  window.__fxReady = true; // tells the inline head fallback to stand down

  function on(el, evt, fn, opts) {
    if (el) el.addEventListener(evt, fn, opts || false);
  }

  /* raf-throttled scroll dispatcher so we only ever do layout work once
     per frame no matter how many features are listening */
  var scrollTasks = [];
  var ticking = false;

  function onScroll(fn) {
    scrollTasks.push(fn);
  }

  function runScrollTasks() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    for (var i = 0; i < scrollTasks.length; i++) scrollTasks[i](y);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(runScrollTasks);
    }
  }, { passive: true });

  /* -----------------------------------------------------------------
     Skip link
     ----------------------------------------------------------------- */
  (function skipLink() {
    var main = document.querySelector('.crafting-section, .all-projects-section');
    if (!main) return;
    if (!main.id) main.id = 'main-content';
    var a = document.createElement('a');
    a.className = 'skip-link';
    a.href = '#' + main.id;
    a.textContent = 'Skip to content';
    document.body.insertBefore(a, document.body.firstChild);
  })();

  /* -----------------------------------------------------------------
     Scroll progress bar
     ----------------------------------------------------------------- */
  (function scrollProgress() {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);

    onScroll(function (y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(y / max, 1) : 0;
      bar.style.transform = 'scaleX(' + pct + ')';
    });
  })();

  /* -----------------------------------------------------------------
     Cursor glow (desktop pointers only)
     ----------------------------------------------------------------- */
  (function cursorGlow() {
    if (!finePointer || reduceMotion) return;

    var glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    var tx = window.innerWidth / 2;
    var ty = window.innerHeight / 2;
    var cx = tx;
    var cy = ty;
    var running = false;

    function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      glow.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) {
        window.requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    on(document, 'pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      root.classList.add('fx-pointer');
      tx = e.clientX;
      ty = e.clientY;
      if (!running) {
        running = true;
        window.requestAnimationFrame(loop);
      }
    }, { passive: true });

    on(document, 'pointerleave', function () {
      root.classList.remove('fx-pointer');
    });
  })();

  /* -----------------------------------------------------------------
     Back-to-top button with a progress ring
     ----------------------------------------------------------------- */
  (function backToTop() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML =
      '<svg class="to-top__ring" viewBox="0 0 52 52" aria-hidden="true">' +
      '<circle cx="26" cy="26" r="24"></circle></svg>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 19V5M5 12l7-7 7 7"></path></svg>';
    document.body.appendChild(btn);

    var circle = btn.querySelector('circle');
    var len = 2 * Math.PI * 24;
    circle.style.strokeDasharray = len;
    circle.style.strokeDashoffset = len;

    onScroll(function (y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(y / max, 1) : 0;
      circle.style.strokeDashoffset = len - len * pct;
      btn.classList.toggle('is-visible', y > window.innerHeight * 0.8);
    });

    on(btn, 'click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  })();

  /* -----------------------------------------------------------------
     Reveal on scroll
     ----------------------------------------------------------------- */
  (function reveal() {
    // Auto-tag the things worth animating in, without touching the markup
    var auto = [
      ['.section-title-container', ''],
      ['.section-head', ''],
      ['.projects-hero__inner', ''],
      ['.education-hero__inner', ''],
      ['.achievements-hero__inner', ''],
      ['.crafting-line', 'left'],
      ['.crafting-title', 'left'],
      ['.crafting-desc', ''],
      ['.stat-chip', ''],
      ['.stack-card', ''],
      ['.hof__header', ''],
      ['.hof-block__title', 'left'],
      ['.honor-card', ''],
      ['.contact-section .section-head', ''],
      ['.contact-card', 'zoom'],
      ['.footer-cta__text', 'left'],
      ['.footer-cta__actions', 'right'],
      ['.footer-brand', ''],
      ['.footer-column', ''],
      ['.all-projects-hero', ''],
      ['.projects-view-all', '']
    ];

    auto.forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', pair[1]);
      });
    });

    // Stagger items that sit in a row together
    ['.stats-band__inner', '.stack-grid', '.projects-grid', '.all-projects-grid',
     '.education-timeline', '.footer-container', '.honor-wall',
     '.trophy-wall', '.xp-rail'].forEach(function (sel) {
      var parent = document.querySelector(sel);
      if (!parent) return;
      Array.prototype.forEach.call(parent.children, function (child, i) {
        if (child.hasAttribute('data-reveal')) {
          child.style.setProperty('--reveal-delay', Math.min(i * 85, 420) + 'ms');
        }
      });
    });

    var targets = document.querySelectorAll('[data-reveal]');

    if (!('IntersectionObserver' in window) || reduceMotion) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { io.observe(el); });

    /* Backstop. Reveal is the one enhancement that can *hide* content, so
       it must not depend solely on observer callbacks arriving on time.
       Sweep anything already on screen and un-revealed, and reveal it. */
    var pending = Array.prototype.slice.call(targets);

    function sweep() {
      if (!pending.length) return;
      var h = window.innerHeight;
      pending = pending.filter(function (el) {
        if (el.classList.contains('is-in')) return false;
        var r = el.getBoundingClientRect();
        if (r.top < h && r.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
          return false;
        }
        return true;
      });
    }

    window.addEventListener('load', function () { window.setTimeout(sweep, 400); });
    window.setTimeout(sweep, 1500);
    onScroll(sweep);
  })();

  /* -----------------------------------------------------------------
     Navbar: scroll state, auto-hide, scroll spy
     ----------------------------------------------------------------- */
  (function navbar() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.glass-navbar a'));
    if (!links.length) return;

    var sections = links
      .map(function (link) {
        var href = link.getAttribute('href') || '';
        if (href.charAt(0) !== '#' || href.length < 2) return null;
        var el = document.getElementById(href.slice(1));
        return el ? { link: link, el: el } : null;
      })
      .filter(Boolean);

    var lastY = window.pageYOffset;
    var current = null;

    onScroll(function (y) {
      document.body.classList.toggle('nav-scrolled', y > 40);

      // auto-hide only once we're past the hero and moving down
      var goingDown = y > lastY + 4;
      var goingUp = y < lastY - 4;
      if (goingDown && y > 420) document.body.classList.add('nav-hidden');
      else if (goingUp) document.body.classList.remove('nav-hidden');
      lastY = y;

      if (!sections.length) return;

      var probe = y + window.innerHeight * 0.32;
      var active = sections[0];
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].el.offsetTop <= probe) active = sections[i];
      }
      // Bottom of page always lights the last entry
      if (y + window.innerHeight >= document.documentElement.scrollHeight - 80) {
        active = sections[sections.length - 1];
      }

      if (active !== current) {
        links.forEach(function (l) {
          l.classList.remove('active');
          l.removeAttribute('aria-current');
        });
        active.link.classList.add('active');
        active.link.setAttribute('aria-current', 'true');
        current = active;
      }
    });
  })();

  /* -----------------------------------------------------------------
     Mobile drawer: backdrop, scroll lock, aria
     ----------------------------------------------------------------- */
  (function drawer() {
    var nav = document.querySelector('.glass-navbar');
    var icon = document.querySelector('.menu-icon');
    var toggle = document.getElementById('menu-toggle');
    if (!nav || !icon) return;

    // Real hamburger bars in place of the ☰ glyph
    if (!icon.querySelector('.menu-icon__bars')) {
      icon.textContent = '';
      var bars = document.createElement('span');
      bars.className = 'menu-icon__bars';
      icon.appendChild(bars);
    }
    icon.setAttribute('role', 'button');
    icon.setAttribute('tabindex', '0');
    icon.setAttribute('aria-label', 'Open menu');
    icon.setAttribute('aria-expanded', 'false');

    var backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    function close() {
      document.body.classList.remove('menu-open');
      if (toggle) toggle.checked = false;
      icon.setAttribute('aria-expanded', 'false');
      root.classList.remove('nav-locked');
    }

    // Only move focus into the drawer for keyboard users — a touch tap
    // shouldn't leave a focus ring sitting on the first link.
    function open(moveFocus) {
      document.body.classList.add('menu-open');
      if (toggle) toggle.checked = true;
      icon.setAttribute('aria-expanded', 'true');
      root.classList.add('nav-locked');
      if (!moveFocus) return;
      var first = nav.querySelector('a');
      if (first) window.setTimeout(function () { first.focus(); }, 320);
    }

    on(backdrop, 'click', close);
    on(icon, 'keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(true);
      }
    });
    on(icon, 'click', function () { open(false); });
    nav.querySelectorAll('a').forEach(function (a) { on(a, 'click', close); });
    on(document.querySelector('.menu-close'), 'click', close);
    on(document, 'keydown', function (e) { if (e.key === 'Escape') close(); });

    // Leaving mobile width with the drawer open would lock scrolling
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && document.body.classList.contains('menu-open')) close();
    });
  })();

  /* -----------------------------------------------------------------
     Magnetic buttons
     ----------------------------------------------------------------- */
  (function magnetic() {
    if (!finePointer || reduceMotion) return;

    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var strength = 0.28;

      on(el, 'pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * strength;
        var dy = (e.clientY - (r.top + r.height / 2)) * strength;
        var max = 10;
        dx = Math.max(-max, Math.min(max, dx));
        dy = Math.max(-max, Math.min(max, dy));
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });

      on(el, 'pointerleave', function () { el.style.transform = ''; });
      on(el, 'blur', function () { el.style.transform = ''; });
    });
  })();

  /* -----------------------------------------------------------------
     Card spotlight — cards light up where the pointer is
     ----------------------------------------------------------------- */
  (function spotlight() {
    if (!finePointer) return;

    var sel = '.stack-card, .project-card, .xp-card, .education-content, .honor-card';
    document.querySelectorAll(sel).forEach(function (card) {
      on(card, 'pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      }, { passive: true });
    });
  })();

  /* -----------------------------------------------------------------
     Animated counters
     ----------------------------------------------------------------- */
  (function counters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    function format(value, decimals) {
      return decimals > 0
        ? value.toFixed(decimals)
        : Math.round(value).toLocaleString('en-US');
    }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';

      if (reduceMotion) {
        el.textContent = format(target, decimals) + suffix;
        return;
      }

      var duration = 1600;
      var start = null;

      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
        el.textContent = format(target * eased, decimals) + suffix;
        if (p < 1) window.requestAnimationFrame(step);
      }

      window.requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
      nums.forEach(run);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          run(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    nums.forEach(function (el) { io.observe(el); });
  })();

  /* -----------------------------------------------------------------
     Marquee / infinite carousels: stop animating off-screen so phones
     aren't burning battery on invisible work
     ----------------------------------------------------------------- */
  (function pauseOffscreen() {
    if (!('IntersectionObserver' in window)) return;

    var tracks = document.querySelectorAll('.experience-carousel, .stack-marquee');
    if (!tracks.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-paused', !entry.isIntersecting);
        var inner = entry.target.querySelector('.experience-carousel__track, .stack-marquee__track');
        if (inner) inner.style.animationPlayState = entry.isIntersecting ? '' : 'paused';
      });
    }, { threshold: 0 });

    tracks.forEach(function (t) { io.observe(t); });
  })();

  /* -----------------------------------------------------------------
     Contact form: visible sending state
     ----------------------------------------------------------------- */
  (function formState() {
    var form = document.getElementById('contactForm');
    if (!form) return;
    var btn = form.querySelector('.contact-submit-btn');
    if (!btn) return;

    on(form, 'submit', function () {
      btn.classList.add('is-sending');
      // script.js re-enables the button on both success and failure
      var check = window.setInterval(function () {
        if (!btn.disabled) {
          btn.classList.remove('is-sending');
          window.clearInterval(check);
        }
      }, 200);
      window.setTimeout(function () {
        btn.classList.remove('is-sending');
        window.clearInterval(check);
      }, 20000);
    });
  })();

  /* -----------------------------------------------------------------
     Trophy-wall lightbox
     ----------------------------------------------------------------- */
  (function trophyLightbox() {
    var tiles = Array.prototype.slice.call(document.querySelectorAll('[data-trophy-src]'));
    if (!tiles.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Achievement viewer');
    box.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Close">&times;</button>' +
      '<figure class="lightbox__figure">' +
        '<button class="lightbox__btn lightbox__btn--prev" type="button" aria-label="Previous">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>' +
        '</button>' +
        '<img class="lightbox__img" alt="">' +
        '<figcaption class="lightbox__caption"><span class="lightbox__text"></span>' +
          '<span class="lightbox__counter"></span></figcaption>' +
        '<button class="lightbox__btn lightbox__btn--next" type="button" aria-label="Next">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>' +
        '</button>' +
      '</figure>';
    document.body.appendChild(box);

    var img = box.querySelector('.lightbox__img');
    var text = box.querySelector('.lightbox__text');
    var counter = box.querySelector('.lightbox__counter');
    var index = 0;
    var lastFocus = null;

    function show(i) {
      index = (i + tiles.length) % tiles.length;
      var tile = tiles[index];
      img.src = tile.getAttribute('data-trophy-src');
      img.alt = tile.getAttribute('data-trophy-caption') || '';
      text.textContent = tile.getAttribute('data-trophy-caption') || '';
      counter.textContent = (index + 1) + ' / ' + tiles.length;
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add('is-open');
      root.classList.add('nav-locked');
      box.querySelector('.lightbox__close').focus();
    }

    function close() {
      box.classList.remove('is-open');
      root.classList.remove('nav-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    tiles.forEach(function (tile, i) {
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('role', 'button');
      on(tile, 'click', function () { open(i); });
      on(tile, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });

    on(box.querySelector('.lightbox__close'), 'click', close);
    on(box.querySelector('.lightbox__btn--prev'), 'click', function () { show(index - 1); });
    on(box.querySelector('.lightbox__btn--next'), 'click', function () { show(index + 1); });

    // click the dim area (but not the figure) to dismiss
    on(box, 'click', function (e) { if (e.target === box) close(); });

    on(document, 'keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
    });
  })();
})();
