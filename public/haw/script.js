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
