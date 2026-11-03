const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve('public/haw');
const pages = ['index.html','contact/index.html','overons/index.html','project/repanels/index.html','project/d-p/index.html','project/meliopus/index.html','project/groei-versnellen-door-focus-en-ritme-met-okrs/index.html'];

test('all pages keep site links and local assets inside the deployment prefix', () => {
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(html, /https?:\/\/(?:www\.)?holmeswatson\.be/i, file);
    const pageUrl = new URL(file === 'index.html' ? '/haw/' : '/haw/' + file.replace(/index\.html$/, ''), 'https://example.test');
    const base = new URL(html.match(/<base href="([^"]+)">/)?.[1] || '.', pageUrl);
    for (const match of html.replace(/<base\s+href="[^"]+">/, '').matchAll(/(?:href|src)="([^"]+)"/g)) {
      const value = match[1].replaceAll('&amp;', '&');
      if (value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('https://')) continue;
      const resolved = new URL(value, base);
      assert.ok(resolved.pathname.startsWith('/haw/'), `${file}: ${value}`);
      const relative = decodeURIComponent(resolved.pathname.slice('/haw/'.length));
      const target = path.join(root, relative || 'index.html');
      const final = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
      assert.ok(fs.existsSync(final), `${file}: missing ${value}`);
    }
  }
});

test('contact form makes an email draft and does not post visitor data', () => {
  const html = fs.readFileSync(path.join(root, 'contact/index.html'), 'utf8');
  assert.match(html, /action="mailto:shari@holmeswatson\.be"/);
  assert.match(html, /id="contact-name"[^>]*required/);
  assert.match(html, /id="contact-email"[^>]*required/);
  assert.match(html, /id="contact-message"[^>]*required/);
  let submit;
  const form = { addEventListener(type, handler) { if (type === 'submit') submit = handler; } };
  const location = { href: '' };
  const context = {
    document: { querySelector(selector) { return selector === '#contact-form' ? form : null; }, querySelectorAll() { return []; } },
    window: { matchMedia: () => ({ matches: true, addEventListener() {} }), location },
    FormData: class { get(key) { return { name: 'Test Person', email: 'test@example.test', message: 'Hello & goodbye' }[key]; } },
    URLSearchParams
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'script.js'), 'utf8'), context);
  let prevented = false;
  submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  const draft = new URL(location.href);
  assert.equal(draft.protocol, 'mailto:');
  assert.equal(draft.pathname, 'shari@holmeswatson.be');
  assert.match(draft.searchParams.get('body'), /Test Person/);
  assert.match(draft.searchParams.get('body'), /Hello & goodbye/);
});
