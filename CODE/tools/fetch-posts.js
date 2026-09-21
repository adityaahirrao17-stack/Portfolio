/* =====================================================================
   fetch-posts.js — turns a list of post links into the Latest Posts data

   Usage, from the CODE folder:

       node tools/fetch-posts.js

   It reads tools/posts.txt, asks LinkedIn and Instagram for each post's
   own preview metadata, saves the preview images into assets/posts/,
   and writes posts-data.js, which the page loads.

   Re-run it whenever you change posts.txt. Nothing else needs editing.

   Why a build step rather than a live feed: neither platform will hand
   a visitor's browser your recent posts. LinkedIn's post embed renders
   text only — no image, even in a 1000px tall frame — and Instagram
   serves logged-out visitors an empty app shell. Both will, however,
   answer a direct request for one public post's preview data, which is
   what this script collects once so the page can render it instantly.
   ===================================================================== */
'use strict';

var https = require('https');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var LIST = path.join(__dirname, 'posts.txt');
var IMG_DIR = path.join(ROOT, 'assets', 'posts');
var OUT = path.join(ROOT, 'posts-data.js');

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
         '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/* ---------- tiny fetch helpers ---------- */

function request(url, binary, cb, depth) {
  depth = depth || 0;
  if (depth > 5) return cb(new Error('too many redirects'));

  https.get(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } }, function (res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      return request(res.headers.location, binary, cb, depth + 1);
    }
    if (res.statusCode !== 200) {
      res.resume();
      return cb(new Error('HTTP ' + res.statusCode));
    }

    if (binary) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { cb(null, Buffer.concat(chunks), res.headers['content-type'] || ''); });
    } else {
      var body = '';
      res.setEncoding('utf8');
      res.on('data', function (c) { body += c; });
      res.on('end', function () { cb(null, body); });
    }
  }).on('error', cb);
}

/* ---------- parsing ---------- */

function meta(html, prop) {
  var a = new RegExp('<meta[^>]+property="' + prop + '"[^>]+content="([^"]*)"', 'i').exec(html);
  if (a) return a[1];
  var b = new RegExp('<meta[^>]+content="([^"]*)"[^>]+property="' + prop + '"', 'i').exec(html);
  return b ? b[1] : null;
}

var ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ', '#x27': "'" };

function decodeEntities(s) {
  if (!s) return '';
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, function (m, e) {
    if (ENTITIES[e.toLowerCase()]) return ENTITIES[e.toLowerCase()];
    if (e[0] === '#') {
      var n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return isNaN(n) ? m : String.fromCodePoint(n);
    }
    return m;
  });
}

function clean(s) {
  if (!s) return '';
  return decodeEntities(s)
    // Posts often use the maths-bold unicode block for emphasis; NFKC
    // folds those back to normal letters so the card stays readable.
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function platformOf(url) {
  if (/linkedin\.com/i.test(url)) return 'linkedin';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return null;
}

/* A LinkedIn share link carries its id inline; the embed view is the one
   that reliably serves preview metadata to a plain request. */
function previewUrl(platform, url) {
  if (platform === 'linkedin') {
    var m = /(activity|ugcPost|share)[-:](\d{6,})/.exec(url);
    return m ? 'https://www.linkedin.com/embed/feed/update/urn:li:' + m[1] + ':' + m[2] : null;
  }
  var ig = /instagram\.com\/(?:[^/]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/.exec(url);
  return ig ? 'https://www.instagram.com/' + ig[1] + '/' + ig[2] + '/embed/captioned/' : null;
}

function slugOf(platform, url) {
  var m = platform === 'linkedin'
    ? /(?:activity|ugcPost|share)[-:](\d{6,})/.exec(url)
    : /\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/.exec(url);
  return platform.slice(0, 2) + '-' + (m ? m[1] : String(Date.now()));
}

/* LinkedIn's title is a hashtag dump; the description holds the real
   opening line, so lead with that and keep the title only as a label. */
function headlineFrom(text, title) {
  // Posts often open with decorative emoji or bullets; they read as
  // noise at headline size, so start at the first real word.
  var body = (text || '').replace(/^[^\p{L}\p{N}"'“‘]+/u, '').trim();

  var sentences = body.split(/(?<=[.!?])\s+/);
  var head = sentences[0] || '';

  // A very short opener is usually half a thought ("A position gives you
  // a role."), so pull in the next sentence to complete it.
  if (head.length < 40 && sentences[1]) head += ' ' + sentences[1];

  if (head.length > 12) {
    return head.length <= 110 ? head : head.slice(0, 104).trim() + '…';
  }
  return clean(title || '').split('|')[0].trim() || 'View post';
}

/* ---------- main ---------- */

if (!fs.existsSync(LIST)) {
  console.error('Missing ' + LIST + ' — add one post URL per line.');
  process.exit(1);
}

var urls = fs.readFileSync(LIST, 'utf8')
  .split(/\r?\n/)
  .map(function (l) { return l.trim(); })
  .filter(function (l) { return l && l[0] !== '#'; });

if (!urls.length) {
  console.error('No URLs in posts.txt.');
  process.exit(1);
}

fs.mkdirSync(IMG_DIR, { recursive: true });

var out = [];
var idx = 0;

function finish() {
  var body =
    '/* GENERATED by tools/fetch-posts.js — do not edit by hand.\n' +
    '   Add or remove links in tools/posts.txt, then re-run:\n' +
    '       node tools/fetch-posts.js\n' +
    '   Generated ' + new Date().toISOString().slice(0, 10) + ' */\n' +
    'window.SOCIAL_POSTS = ' + JSON.stringify(out, null, 2) + ';\n';
  fs.writeFileSync(OUT, body);
  console.log('\nWrote posts-data.js with ' + out.length + ' post(s).');
  var missing = urls.length - out.length;
  if (missing > 0) console.log(missing + ' link(s) could not be read — see errors above.');
}

function step() {
  if (idx >= urls.length) return finish();

  var url = urls[idx++];
  var platform = platformOf(url);
  if (!platform) {
    console.log('SKIP  not a LinkedIn or Instagram link: ' + url);
    return step();
  }

  var src = previewUrl(platform, url);
  if (!src) {
    console.log('SKIP  could not find a post id in: ' + url);
    return step();
  }

  request(src, false, function (err, html) {
    if (err) {
      console.log('FAIL  ' + platform + ' ' + url + ' — ' + err.message);
      return step();
    }

    var text = clean(meta(html, 'og:description'));
    var title = clean(meta(html, 'og:title'));
    // Only entity-decoded, never "cleaned": the CDN link is signed, and
    // leaving &amp; in place corrupts the signature into a 403.
    var image = decodeEntities(meta(html, 'og:image'));

    var post = {
      platform: platform,
      url: url,
      headline: headlineFrom(text, title),
      text: text.length > 260 ? text.slice(0, 255).trim() + '…' : text,
      image: null
    };

    if (!image) {
      console.log('OK    ' + platform + ' — no preview image on this post');
      out.push(post);
      return step();
    }

    // Saved locally: the platforms' CDN links carry signed parameters and
    // can start refusing hotlinks, which would leave blank cards.
    request(image, true, function (imgErr, buf, type) {
      if (imgErr) {
        console.log('OK    ' + platform + ' — image download failed (' + imgErr.message + ')');
      } else {
        var ext = /png/.test(type) ? '.png' : /webp/.test(type) ? '.webp' : '.jpg';
        var name = slugOf(platform, url) + ext;
        fs.writeFileSync(path.join(IMG_DIR, name), buf);
        post.image = 'assets/posts/' + name;
        console.log('OK    ' + platform + ' — ' + name + ' (' + Math.round(buf.length / 1024) + ' KB)');
      }
      out.push(post);
      step();
    });
  });
}

console.log('Reading ' + urls.length + ' link(s) from posts.txt\n');
step();
