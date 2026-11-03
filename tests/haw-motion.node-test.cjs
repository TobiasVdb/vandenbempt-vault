const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('public/haw/script.js', 'utf8');

function setup(reduced = false) {
  let mediaChange;
  let observer;
  let frameId = 0;
  const frames = new Map();
  const counter = { dataset: { count: '15' }, textContent: '15', matches: selector => selector === '.counter-value' };
  class FakeElement { animate() { throw new Error('No hero elements in this test'); } }
  class FakeObserver {
    constructor(callback) { this.callback = callback; this.targets = []; this.disconnected = false; observer = this; }
    observe(target) { this.targets.push(target); }
    unobserve(target) { this.targets = this.targets.filter(item => item !== target); }
    disconnect() { this.disconnected = true; }
    enter(target) { this.callback([{ target, isIntersecting: true }]); }
  }
  const media = { matches: reduced, addEventListener(_event, callback) { mediaChange = callback; } };
  const context = {
    document: {
      querySelector() { return null; },
      querySelectorAll(selector) { return selector.startsWith('.hero-top') ? [] : [counter]; }
    },
    window: { matchMedia: () => media, IntersectionObserver: FakeObserver },
    Element: FakeElement,
    IntersectionObserver: FakeObserver,
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  vm.runInNewContext(source, context);
  return { counter, observer: () => observer, frames, reduce() { media.matches = true; mediaChange({ matches: true }); }, step(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); } };
}

test('counter animates once when visible and ends at the true value', () => {
  const page = setup();
  const observer = page.observer();
  assert.equal(page.counter.textContent, '15');
  observer.enter(page.counter);
  assert.equal(observer.targets.length, 0);
  page.step(0); assert.equal(page.counter.textContent, '0');
  page.step(650); assert.ok(Number(page.counter.textContent) > 0 && Number(page.counter.textContent) < 15);
  page.step(1300); assert.equal(page.counter.textContent, '15');
  assert.equal(page.frames.size, 0);
});

test('reduced motion leaves the real value visible without an observer', () => {
  const page = setup(true);
  assert.equal(page.counter.textContent, '15');
  assert.equal(page.observer(), undefined);
  assert.equal(page.frames.size, 0);
});

test('enabling reduced motion stops a running count and restores the real value', () => {
  const page = setup();
  page.observer().enter(page.counter);
  page.step(0);
  assert.equal(page.counter.textContent, '0');
  page.reduce();
  assert.equal(page.counter.textContent, '15');
  assert.equal(page.frames.size, 0);
  assert.equal(page.observer().disconnected, true);
});
