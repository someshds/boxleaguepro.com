const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const guidePath = path.join(root, 'blog', 'how-to-run-a-tennis-box-league.html');

test('tennis box league guide has core SEO and privacy elements', () => {
  const html = fs.readFileSync(guidePath, 'utf8');
  assert.match(html, /<title>How to Run a Tennis Box League/);
  assert.match(html, /rel="canonical" href="https:\/\/boxleaguepro\.com\/blog\/how-to-run-a-tennis-box-league\.html"/);
  assert.match(html, /"@type": "Article"/);
  assert.match(html, /src="\/privacy-consent\.js"/);
  assert.match(html, /id="cookie-consent"/);
  assert.match(html, /href="\/apply\.html"/);
  assert.match(html, /href="\/app\.html\?club=demo-club"/);
  assert.match(html, /src="\/images\/blog\/tennis-box-league-organisers-v1\.webp"/);
  assert.match(html, /alt="Four recreational tennis players/);
});

test('homepage and sitemap link to the guide', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const guideUrl = '/blog/how-to-run-a-tennis-box-league.html';
  assert.match(homepage, new RegExp(guideUrl.replaceAll('/', '\\/')));
  assert.match(sitemap, /https:\/\/boxleaguepro\.com\/blog\/how-to-run-a-tennis-box-league\.html/);
});

test('padel box league guide has core SEO, privacy and internal-link elements', () => {
  const guideUrl = '/blog/how-to-run-a-padel-box-league.html';
  const html = fs.readFileSync(path.join(root, 'blog', 'how-to-run-a-padel-box-league.html'), 'utf8');
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.match(html, /<title>How to Run a Padel Box League/);
  assert.match(html, /rel="canonical" href="https:\/\/boxleaguepro\.com\/blog\/how-to-run-a-padel-box-league\.html"/);
  assert.match(html, /"@type": "Article"/);
  assert.match(html, /Padel is a doubles sport/);
  assert.match(html, /src="\/privacy-consent\.js"/);
  assert.match(html, /id="cookie-consent"/);
  assert.match(html, /href="\/apply\.html"/);
  assert.match(html, /href="\/app\.html\?club=demo-club"/);
  assert.match(html, /src="\/images\/blog\/padel-box-league-organisers-v1\.webp"/);
  assert.match(html, /alt="Four recreational padel players/);
  assert.doesNotMatch(html, /AI Fusion|RippleKeep|promos\.js/i);
  assert.match(homepage, new RegExp(guideUrl.replaceAll('/', '\\/')));
  assert.match(sitemap, /https:\/\/boxleaguepro\.com\/blog\/how-to-run-a-padel-box-league\.html/);
});

test('squash box league guide has SEO, image, privacy and internal links', () => {
  const guideUrl = '/blog/how-to-run-a-squash-box-league.html';
  const html = fs.readFileSync(path.join(root, 'blog', 'how-to-run-a-squash-box-league.html'), 'utf8');
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.match(html, /<title>How to Run a Squash Box League/);
  assert.match(html, /rel="canonical" href="https:\/\/boxleaguepro\.com\/blog\/how-to-run-a-squash-box-league\.html"/);
  assert.match(html, /"@type": "Article"/);
  assert.match(html, /point-a-rally scoring to 11/);
  assert.match(html, /src="\/images\/blog\/squash-box-league-organisers-v1\.webp"/);
  assert.match(html, /alt="Four recreational squash players/);
  assert.match(html, /src="\/privacy-consent\.js"/);
  assert.match(html, /id="cookie-consent"/);
  assert.match(html, /href="\/apply\.html"/);
  assert.match(html, /href="\/app\.html\?club=demo-club"/);
  assert.doesNotMatch(html, /AI Fusion|RippleKeep|promos\.js/i);
  assert.match(homepage, new RegExp(guideUrl.replaceAll('/', '\\/')));
  assert.match(sitemap, /https:\/\/boxleaguepro\.com\/blog\/how-to-run-a-squash-box-league\.html/);
});
