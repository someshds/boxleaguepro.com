const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const landing = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

const HOME = 'https://boxleaguepro.com/';

assert.match(
  landing,
  /<link rel="canonical" href="https:\/\/boxleaguepro.com\/">/,
  'homepage canonical should be https://boxleaguepro.com/'
);
assert.match(
  landing,
  /<meta property="og:url" content="https:\/\/boxleaguepro.com\/">/,
  'og:url should match the trailing-slash homepage URL'
);
assert.match(sitemap, /<loc>https:\/\/boxleaguepro.com\/<\/loc>/);
assert.equal(
  sitemap.includes('index.html'),
  false,
  'sitemap should not list /index.html'
);

assert.equal(
  (landing.match(/<video\b/g) || []).length,
  1,
  'homepage should keep only the hero video'
);
assert.match(
  landing,
  /<video class="hero-video"[^>]*\bmuted\b[^>]*\bplaysinline\b[^>]*preload="none"[^>]*poster="images\/hero-poster\.webp"/
);

assert.equal(
  /<iframe[^>]*src="https:\/\/www\.youtube/.test(landing),
  false,
  'YouTube iframes must not be present until click'
);
assert.equal((landing.match(/class="yt-facade"/g) || []).length, 6);
assert.match(
  landing,
  /youtube-nocookie\.com\/embed\/' \+ encodeURIComponent\(id\)/,
  'facade should insert youtube-nocookie embeds on click'
);

const stills = landing.match(/<img class="section-still"[^>]*>/g) || [];
assert.equal(stills.length, 6, 'five background sections plus FAQ reuse should use stills');
for (const tag of stills) {
  assert.match(tag, /\bwidth="\d+"/);
  assert.match(tag, /\bheight="\d+"/);
  assert.match(tag, /\balt="[^"]+"/);
  assert.match(tag, /src="images\/bg-[a-z]+\.webp"/);
}

const posters = ['bg-how.webp', 'bg-features.webp', 'bg-grid.webp', 'bg-sports.webp', 'bg-cta.webp', 'hero-poster.webp'];
for (const name of posters) {
  const file = path.join(root, 'images', name);
  const size = fs.statSync(file).size;
  assert.ok(size > 0 && size < 150 * 1024, `${name} should stay under 150KB (got ${size})`);
}

assert.match(landing, /\.cookie-consent-actions\{display:flex;gap:8px;flex-wrap:wrap\}/);
assert.match(landing, /@media\(max-width:480px\)/);
assert.match(landing, /\.cookie-consent-actions\{flex-direction:column;width:100%;align-items:stretch\}/);
assert.equal(
  /cookie-consent-actions[^>]*>[\s\S]*flex-shrink:0/.test(landing),
  false,
  'cookie action row should be allowed to wrap instead of overflowing'
);

console.log('landing-page-weight.test.js: all assertions passed');
