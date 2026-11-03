const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-nav');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Menu openen' : 'Menu sluiten');
    menu.hidden = open;
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Menu openen');
    }
  });
}

// Content remains visible without JavaScript or when motion is reduced.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const runningAnimations = new Set();
const runningCounters = new Map();
let revealObserver;

function animateOnce(element, keyframes, options) {
  const animation = element.animate(keyframes, options);
  runningAnimations.add(animation);
  animation.finished.then(() => {
    runningAnimations.delete(animation);
    animation.cancel();
  }).catch(() => runningAnimations.delete(animation));
}

function countUp(element) {
  const target = Number(element.dataset.count);
  if (!Number.isFinite(target)) return;
  const duration = 1300;
  let start;
  function tick(time) {
    if (start === undefined) start = time;
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = String(Math.round(target * eased));
    if (progress < 1) runningCounters.set(element, requestAnimationFrame(tick));
    else runningCounters.delete(element);
  }
  runningCounters.set(element, requestAnimationFrame(tick));
}

function startMotion() {
  if (motionPreference.matches || !('animate' in Element.prototype)) return;
  const ease = 'cubic-bezier(.22, 1, .36, 1)';
  const heroItems = document.querySelectorAll('.hero-top, .hero-redesign h1, .hero-copy p, .hero-copy .actions');
  heroItems.forEach((item, index) => animateOnce(item,
    [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 850, delay: index * 110, easing: ease }));
  const backdrop = document.querySelector('.hero-backdrop');
  if (backdrop) animateOnce(backdrop,
    [{ opacity: 0.55, transform: 'scale(1.035)' }, { opacity: 1, transform: 'scale(1)' }],
    { duration: 1500, easing: ease });

  if (!('IntersectionObserver' in window)) return;
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      revealObserver.unobserve(element);
      if (element.matches('.counter-value')) {
        countUp(element);
      } else {
        const delay = Number(element.dataset.motionDelay || 0);
        animateOnce(element,
          [{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 760, delay, easing: ease });
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

  const selectors = [
    '.proof-inner > div:first-child', '.proof-detail', '.section-heading', '.challenge-list article',
    '.expertise .section-kicker', '.expertise-heading', '.expertise-grid article', '.okr',
    '.method-intro', '.method-row', '.case-heading', '.case-feature', '.more-case',
    '.people-photos figure', '.people-copy', '.final-top', '.final-cta h2', '.final-bottom',
    '.counter-value'
  ];
  document.querySelectorAll(selectors.join(',')).forEach(element => {
    if (element.matches('.challenge-list article, .expertise-grid article, .method-row, .more-case, .people-photos figure')) {
      const siblings = Array.from(element.parentElement.children);
      element.dataset.motionDelay = String(Math.min(siblings.indexOf(element), 3) * 75);
    }
    revealObserver.observe(element);
  });
}

motionPreference.addEventListener('change', event => {
  if (!event.matches) return;
  if (revealObserver) revealObserver.disconnect();
  runningAnimations.forEach(animation => animation.cancel());
  runningAnimations.clear();
  runningCounters.forEach((frame, element) => {
    cancelAnimationFrame(frame);
    element.textContent = element.dataset.count;
  });
  runningCounters.clear();
});

startMotion();
