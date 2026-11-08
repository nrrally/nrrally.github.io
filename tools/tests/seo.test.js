const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const repo = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const pages = ['index.html', 'disclaimer.html', 'privacy.html'];
const canonical = file => 'https://nrrally.co.za/' + (file === 'index.html' ? '' : file);

test('public documents have one static canonical and descriptive evergreen metadata', () => {
  for (const file of pages) {
    const html = read(file);
    const links = html.match(/<link\b[^>]*rel="canonical"[^>]*>/g) || [];
    assert.equal(links.length, 1, file);
    assert.ok(links[0].includes('href="' + canonical(file) + '"'), file);
    assert.match(html, /<html[^>]*lang="en-ZA"/);
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.match(html, /<title>[^<]+Northern Regions Rally[^<]*<\/title>|<title>Northern Regions Rally[^<]+<\/title>/);
    assert.doesNotMatch(html, /<meta name="robots"[^>]*noindex|<title>[^<]*20\d\d/);
  }
  assert.match(read('index.html'), /Independent results &amp; standings<\/title>/);
  assert.doesNotMatch(read(path.join('assets', 'site.js')), /rel\s*=\s*['"]canonical|createElement\(['"]meta['"]\)/);
});

test('homepage WebSite microdata names the existing site without executable markup', () => {
  const html = read('index.html');
  assert.match(html, /<html[^>]*itemscope itemtype="https:\/\/schema.org\/WebSite"/);
  assert.equal((html.match(/schema.org\/WebSite/g) || []).length, 1);
  assert.match(html, /<meta itemprop="name" content="Northern Regions Rally">/);
  assert.match(html, /<link itemprop="url" rel="canonical" href="https:\/\/nrrally.co.za\/">/);
  assert.doesNotMatch(html, /application\/ld\+json|schema.org\/Organization|alternateName/);
  assert.match(html, /script-src 'self' https:\/\/www.googletagmanager.com;/);
  assert.match(html, /Independent rally archive/);
});

test('crawl discovery lists only canonical public documents and permits admin noindex retrieval', () => {
  const robots = read('robots.txt').replace(/\r\n/g, '\n');
  assert.equal(robots, 'User-agent: *\nAllow: /\n\nSitemap: https://nrrally.co.za/sitemap.xml\n');
  const sitemap = read('sitemap.xml');
  const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), m => m[1]);
  assert.deepEqual(urls, pages.map(canonical));
  assert.match(sitemap, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  assert.doesNotMatch(sitemap, /#|admin|lastmod|priority|changefreq/);
  assert.match(read(path.join('admin', 'index.html')), /<meta name="robots" content="noindex, nofollow">/);
});

test('all shells advertise the square raster fallback and retain the original SVG favicon', () => {
  for (const file of [...pages, path.join('admin', 'index.html')]) {
    const html = read(file), prefix = file === path.join('admin', 'index.html') ? '../' : '';
    assert.ok(html.includes('<link rel="icon" type="image/png" sizes="192x192" href="' + prefix + 'assets/favicon.png">'));
    assert.ok(html.includes('<link rel="icon" type="image/svg+xml" sizes="any" href="' + prefix + 'assets/brand.svg">'));
  }
  const png = fs.readFileSync(path.join(repo, 'assets', 'favicon.png'));
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(png.readUInt32BE(16), 192);
  assert.equal(png.readUInt32BE(20), 192);
});
