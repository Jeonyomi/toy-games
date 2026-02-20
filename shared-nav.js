(() => {
  const games = [
    { href: '/index.html', name: 'Tap2Earn', meta: 'Easy · 2 min · 1P' },
    { href: '/beat-shield/index.html', name: 'Beat Shield', meta: 'Medium · 3 min · 1P' },
    { href: '/reaction-dash/index.html', name: 'Reaction Dash', meta: 'Easy · 1 min · 1P' },
    { href: '/astro-dodge/index.html', name: 'Astro Dodge', meta: 'Medium · 2 min · 1P' },
    { href: '/worm-tail/index.html', name: 'Worm Tail', meta: 'Medium · 4 min · 1P' },
    { href: '/perfect-stack/index.html', name: 'Perfect Stack', meta: 'Easy · 2 min · 1P' },
    { href: '/orbit-defender/index.html', name: 'Orbit Defender', meta: 'Medium · 3 min · 1P' },
    { href: '/laser-relay/index.html', name: 'Laser Relay', meta: 'Puzzle · 3 min · 1P' },
    { href: '/neon-tank/index.html', name: 'Neon Tank', meta: 'Arcade · 3 min · 1P' }
  ];

  const root = document.querySelector('.app, .wrap');
  if (!root) return;

  const path = location.pathname.replace(/\/$/, '').toLowerCase();
  const current = games.find(g => path.endsWith(g.href.toLowerCase().replace(/^\//, '')) || path === g.href.toLowerCase().replace('/index.html', '').replace(/^\//, ''));

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'arcade-menu-toggle';
  toggle.setAttribute('aria-label', 'Open game menu');
  toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="arcade-menu-icon" aria-hidden="true"></span>';
  root.appendChild(toggle);

  const overlay = document.createElement('div');
  overlay.className = 'arcade-menu-overlay';
  overlay.hidden = true;

  const drawer = document.createElement('aside');
  drawer.className = 'arcade-menu-drawer';
  drawer.id = 'arcadeGameMenu';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Game menu');

  const links = games.map(g => {
    const isCurrent = current && current.href === g.href;
    const href = new URL(g.href, location.origin).toString();
    return `<a class="arcade-menu-link" href="${href}"${isCurrent ? ' aria-current="page"' : ''}><strong>${g.name}</strong><small>${g.meta}</small></a>`;
  }).join('');

  drawer.innerHTML = `
    <div class="arcade-menu-head">
      <h2 class="arcade-menu-title">Choose game</h2>
      <button type="button" class="arcade-menu-close" aria-label="Close menu">✕</button>
    </div>
    <nav class="arcade-menu-list" aria-label="Game links">${links}</nav>
  `;

  document.body.append(overlay, drawer);
  toggle.setAttribute('aria-controls', drawer.id);

  const focusables = () => drawer.querySelectorAll('a[href], button:not([disabled])');
  let prevFocus = null;

  function openMenu() {
    prevFocus = document.activeElement;
    overlay.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    const first = focusables()[0];
    if (first) first.focus();
  }

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { overlay.hidden = true; }, 180);
    if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
  }

  function onKeyDown(e) {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = Array.from(focusables());
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  toggle.addEventListener('click', () => drawer.classList.contains('open') ? closeMenu() : openMenu());
  overlay.addEventListener('click', closeMenu);
  drawer.querySelector('.arcade-menu-close').addEventListener('click', closeMenu);
  document.addEventListener('keydown', onKeyDown);

  document.querySelectorAll('[data-action="change-game"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openMenu();
    });
  });

  window.arcadeMenu = { open: openMenu, close: closeMenu };
})();
