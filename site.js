(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('#mobile-menu');
  const menuToggle = document.querySelector('.menu-toggle');
  const menuClose = menu?.querySelector('.menu-close');
  let navigationPending = false;
  const activeAnimations = new Set();
  // Netlify's Pretty URLs rewrite HTML links to extensionless routes in production.
  const sitePages = new Set([
    '/', '/about', '/projects', '/shop', '/the-creative-lens',
    '/meravigliosa-biblioteca', '/the-subtle-art-of-slowing-down',
    '/fondazione-magnani-rocca', '/how-i-see-colors', '/design-week-2025',
    '/creative-direction-music-artist',
    '/diana', '/villa-of-masterpieces', '/girl-of-the-night-garden', '/destiny-noah-baine', '/finding-your-own-path', '/time-and-each-other', '/language-of-wind', '/recco', '/candle-flame-wildfire', '/you-me', '/roncato', '/like-roots', '/liquid-buildings', '/fallin-noah-baine', '/upside-down', '/comacchio', '/dusk-to-night', '/mosaic-biennale', '/trains', '/language-of-light', '/slowing-things-down', '/moft-iphone-setup', '/amsterdam-nikon', '/silence-berlin', '/moft-static', '/polarpro-warp', '/ugmonk-analog', '/italian-garden', '/mymind', '/pocket-dispo', '/brick', '/suspended-daydream', '/moment', '/weapon-distraction', '/moft-24-hours'
  ]);
  const pagePath = url => {
    const path = url.pathname.replace(/\/+$/, '').replace(/\.html$/, '');
    return path === '/index' || path === '' ? '/' : path;
  };

  // Native dialog supplies focus containment, Escape and return-to-trigger focus.
  if (menu && menuToggle && menuClose) {
    menuToggle.addEventListener('click', () => {
      menu.showModal();
      menuToggle.setAttribute('aria-expanded', 'true');
    });
    menuClose.addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => menuToggle.setAttribute('aria-expanded', 'false'));
    menu.addEventListener('click', event => {
      if (event.target !== menu) return;
      const bounds = menu.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) menu.close();
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', event => {
      if (event.matches && menu.open) menu.close();
    });
  }

  const revealTargets = [...document.querySelectorAll([
    '.page-intro', '.article-head', '.newsletter-hero', '.shop-intro',
    '.reading-column > .content-section:first-child',
    '.article-media', '.article-hero', '.article-video', '.work-card'
  ].join(','))].filter(element => element.getBoundingClientRect().height > 1);

  let observer;
  const showAll = () => {
    observer?.disconnect();
    revealTargets.forEach(element => {
      element.removeAttribute('data-reveal');
      element.classList.remove('page-enter');
    });
    document.querySelectorAll('.header-enter').forEach(element => element.classList.remove('header-enter'));
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations.clear();
  };

  if (!reducedMotion.matches) {
    document.querySelectorAll('.brand, .header-links > a, .site-nav > a, .header-inner > button, .mobile-work').forEach((element, index) => {
      element.style.setProperty('--intro-delay', `${[0, 120, 170, 220][index % 4]}ms`);
      element.classList.add('header-enter');
    });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.dataset.reveal = 'shown';
          observer.unobserve(entry.target);
        });
      }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    }
    let entryIndex = 0;
    revealTargets.forEach(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight && bounds.bottom > 0) {
        element.style.setProperty('--entry-delay', `${100 + Math.min(entryIndex++, 3) * 90}ms`);
        element.classList.add('page-enter');
      } else if (observer && bounds.top >= window.innerHeight) {
        element.dataset.reveal = 'pending';
        observer.observe(element);
      }
    });
  }

  // Same-origin pages retain real URLs and normal browser navigation.
  // The reference's exit is 400ms, y=14, scale=.99, blur=12px, ease [.5,0,.75,0].
  document.addEventListener('click', async event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || !sitePages.has(pagePath(destination))) return;
    if (menu?.open && menu.contains(link)) menu.close();
    if (pagePath(destination) === pagePath(new URL(location.href)) && destination.search === location.search) return;
    if (reducedMotion.matches || typeof Element.prototype.animate !== 'function') return;
    const main = document.querySelector('main');
    if (!main) return;
    event.preventDefault();
    if (navigationPending) return;
    navigationPending = true;
    const exit = main.animate([
      { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
      { opacity: 0, transform: 'translateY(14px) scale(.99)', filter: 'blur(12px)' }
    ], { duration: 400, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    activeAnimations.add(exit);
    try { await exit.finished; } catch (_) { /* A motion preference change can cancel the exit. */ }
    location.assign(destination.href);
  });

  window.addEventListener('pageshow', event => {
    navigationPending = false;
    if (event.persisted) showAll();
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) showAll();
  });
})();

// Original project publications load only when the visitor opens the embed.
document.querySelectorAll('.project-embed').forEach(details => {
  details.addEventListener('toggle', () => {
    const frame = details.querySelector('iframe[data-project-embed]');
    if (details.open && frame && !frame.hasAttribute('src')) frame.src = frame.dataset.projectEmbed;
  });
});
