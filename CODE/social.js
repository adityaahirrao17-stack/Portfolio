/* =====================================================================
   SOCIAL.JS — renders the "Latest Posts" rails

   The post content itself lives in posts-data.js, which is generated.
   To change which posts appear, edit tools/posts.txt and run:

       node tools/fetch-posts.js

   These are real preview cards rather than platform embeds, for two
   reasons found by testing: LinkedIn's own post embed renders text only
   (no image, even in a 1000px frame) and forces its light theme into a
   dark page, and Instagram serves logged-out visitors nothing at all.
   Rendering the preview ourselves shows the images, matches the site,
   and costs one local image instead of a third-party iframe.
   ===================================================================== */
(function () {
  'use strict';

  var POSTS = window.SOCIAL_POSTS || [];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LABEL = { linkedin: 'LinkedIn', instagram: 'Instagram' };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function buildCard(post) {
    var card = el('a', 'post-card post-card--' + post.platform);
    card.href = post.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    var media = el('div', 'post-card__media');
    if (post.image) {
      var img = el('img');
      img.src = post.image;
      img.alt = '';                 // decorative: the headline carries the meaning
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
    } else {
      media.classList.add('post-card__media--empty');
    }
    card.appendChild(media);

    var body = el('div', 'post-card__body');
    body.appendChild(el('span', 'post-card__chip', LABEL[post.platform]));
    body.appendChild(el('h4', 'post-card__headline', post.headline));
    if (post.text) body.appendChild(el('p', 'post-card__text', post.text));
    body.appendChild(el('span', 'post-card__cta', 'View post →'));
    card.appendChild(body);

    return card;
  }

  function buildFollowCard(platform, profile) {
    var card = el('a', 'post-card post-card--follow');
    card.href = profile;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.appendChild(el('h4', null, 'See the latest on ' + LABEL[platform]));
    card.appendChild(el('p', null,
      'Posts show up here once they are added. The profile itself is always current.'));
    card.appendChild(el('span', 'post-card__follow-cta', 'Open profile →'));
    return card;
  }

  function wireRail(rail) {
    var platform = rail.dataset.platform;
    var track = rail.querySelector('.post-rail__track');
    var mine = POSTS.filter(function (p) { return p.platform === platform; });

    if (mine.length) {
      mine.forEach(function (p) { track.appendChild(buildCard(p)); });
    } else {
      track.appendChild(buildFollowCard(platform, rail.dataset.profile));
    }

    var prev = rail.querySelector('.post-rail__nav--prev');
    var next = rail.querySelector('.post-rail__nav--next');

    function step(dir) {
      var card = track.querySelector('.post-card');
      var by = card ? card.offsetWidth + 20 : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * by, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });

    // Grey out an arrow when the rail cannot travel further that way.
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
      rail.classList.toggle('is-static', max <= 0);
    }

    track.addEventListener('scroll', function () {
      window.requestAnimationFrame(sync);
    }, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  function init() {
    document.querySelectorAll('.post-rail').forEach(wireRail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
