/* ==========================================================================
   motion.js — micro-motion layer for mattiagiannattasio.com
   Load with `defer` AFTER site.js. On the home page it also replaces the
   inline hero-reel script (same behaviour: random start, shuffled queue,
   1400ms cadence, pauses when hidden or with reduced motion) and adds the
   intro + cursor scrubbing. Remove that inline script when you add this.
   ========================================================================== */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const inView = el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  const below = el => el.getBoundingClientRect().top >= innerHeight;
  const handledByCore = el => !!el.closest('[data-reveal], .page-enter, .home-hero');
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  /* ------------------------------------------------------------------------
     Hero reel — drop-in replacement for the inline script, plus scrubbing
     ------------------------------------------------------------------------ */
  const heroReel = (() => {
    const reel = document.querySelector('.hero-reel');
    if (!reel) return null;
    const frames = $$('img', reel);
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = Math.floor(Math.random() * frames.length);
    let queue = [];
    let timer;
    let started = false;
    let scrubbing = false;

    frames.forEach((frame, index) => frame.classList.toggle('is-active', index === active));
    reel.style.setProperty('--reel-ratio', frames[active].dataset.ratio);

    const shuffle = items => {
      for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    };
    const refill = () => { queue = shuffle(frames.map((_, i) => i).filter(i => i !== active)); };
    const next = () => {
      if (queue.length === 0) refill();
      const to = queue.shift();
      frames[active].classList.remove('is-active');
      active = to;
      reel.style.setProperty('--reel-ratio', frames[active].dataset.ratio);
      frames[active].classList.add('is-active');
    };
    const restart = () => {
      window.clearInterval(timer);
      if (started && !scrubbing && !reducedQuery.matches && !document.hidden && frames.length > 1) {
        timer = window.setInterval(next, 1400);
      }
    };

    document.addEventListener('visibilitychange', restart);
    if (typeof reducedQuery.addEventListener === 'function') reducedQuery.addEventListener('change', restart);
    refill();
    requestAnimationFrame(() => requestAnimationFrame(() => reel.classList.add('is-ready')));

    // Scrub: moving the cursor across the name advances the reel like a flipbook.
    const h1 = reel.closest('h1');
    if (h1 && fine && !reduced && frames.length > 1) {
      let lastX = null;
      let travelled = 0;
      h1.addEventListener('pointerenter', () => {
        scrubbing = true; lastX = null; travelled = 0;
        reel.classList.add('mg-scrubbing');
        restart();
      });
      h1.addEventListener('pointermove', event => {
        if (lastX !== null) travelled += Math.abs(event.clientX - lastX);
        lastX = event.clientX;
        if (travelled > 56) { travelled = 0; next(); }
      });
      h1.addEventListener('pointerleave', () => {
        scrubbing = false;
        reel.classList.remove('mg-scrubbing');
        restart();
      });
    }

    return {
      ready: () => frames[active].decode ? frames[active].decode().catch(() => {}) : Promise.resolve(),
      begin: () => { started = true; restart(); }
    };
  })();

  /* ------------------------------------------------------------------------
     01 · Hero intro (first visit per session): letters focus in, reel opens
     ------------------------------------------------------------------------ */
  const heroIntro = async () => {
    const hero = document.querySelector('.home-hero');
    const h1 = hero?.querySelector('.hero-wordmark h1');
    let first = false;
    if (hero && h1) {
      try { first = !sessionStorage.getItem('mg-intro'); sessionStorage.setItem('mg-intro', '1'); } catch (_) { first = false; }
    }
    if (!hero || !h1 || reduced || !first) { root.classList.remove('mg-preintro'); heroReel?.begin(); return; }

    // Split the two names into letters; the heading keeps its accessible name.
    const words = $$('.hero-first-name, .hero-last-name', h1);
    if (words.length === 0) { heroReel?.begin(); return; }
    h1.setAttribute('aria-label', words.map(w => w.textContent.trim()).join(' '));
    let index = 0;
    words.forEach(word => {
      const text = word.textContent;
      word.setAttribute('aria-hidden', 'true');
      word.textContent = '';
      [...text].forEach(char => {
        const span = document.createElement('span');
        span.className = 'mg-char';
        span.textContent = char;
        span.style.setProperty('--mg-d', `${index++ * 30}ms`);
        word.append(span);
      });
    });
    $$('.hero-copy > *', hero).forEach((el, i) => el.style.setProperty('--mg-d', `${i * 90}ms`));

    hero.classList.add('mg-chars-wait', 'mg-reel-wait', 'mg-copy-wait');
    root.classList.remove('mg-preintro');
    void hero.offsetWidth; // commit the hidden state before transitions are enabled
    hero.classList.add('mg-reel-opening', 'mg-copy-in');

    const safety = setTimeout(() => finish(), 4000);
    const finish = () => {
      clearTimeout(safety);
      hero.classList.remove('mg-chars-wait', 'mg-reel-wait', 'mg-copy-wait');
      setTimeout(() => hero.classList.remove('mg-reel-opening', 'mg-copy-in'), 1800);
      heroReel?.begin();
    };

    // Wait for the font and the first frame so nothing swaps mid-animation.
    await Promise.race([Promise.all([document.fonts?.ready, heroReel?.ready()]), wait(500)]);
    await wait(120);
    hero.classList.remove('mg-chars-wait');
    await wait(480);
    hero.classList.remove('mg-reel-wait');
    await wait(420);
    hero.classList.remove('mg-copy-wait');
    await wait(700);
    finish();
  };

  if (reduced) { root.classList.remove('mg-preintro'); heroReel?.begin(); return; }
  heroIntro();

  /* ------------------------------------------------------------------------
     04 · Navigation glide
     ------------------------------------------------------------------------ */
  if (fine) {
    $$('.header-links, .site-nav').forEach(group => {
      const links = $$(':scope > a', group);
      if (links.length === 0) return;
      group.classList.add('mg-glide-host');
      const glide = document.createElement('span');
      glide.className = 'mg-glide';
      glide.setAttribute('aria-hidden', 'true');
      group.append(glide);
      const current = links.find(a => a.getAttribute('aria-current') === 'page');

      const place = (link, travel) => {
        const g = group.getBoundingClientRect();
        const l = link.getBoundingClientRect();
        const size = parseFloat(getComputedStyle(link).fontSize) || 14;
        const px = .7143 * size;
        const py = .6786 * size;
        if (!travel) glide.classList.add('no-travel');
        glide.style.width = `${l.width + px * 2}px`;
        glide.style.height = `${l.height + py * 2}px`;
        glide.style.transform = `translate(${l.left - g.left - px}px, ${l.top - g.top - py}px)`;
        if (!travel) { void glide.offsetWidth; glide.classList.remove('no-travel'); }
      };

      if (current) { place(current, false); glide.classList.add('is-visible'); }
      links.forEach(link => link.addEventListener('pointerenter', () => {
        place(link, glide.classList.contains('is-visible'));
        glide.classList.add('is-visible');
      }));
      group.addEventListener('pointerleave', () => {
        if (current) place(current, true);
        else glide.classList.remove('is-visible');
      });
      const settle = () => { if (current) place(current, false); };
      window.addEventListener('resize', settle);
      document.fonts?.ready.then(settle);
    });
    root.classList.add('mg-glide-on');
  }

  /* ------------------------------------------------------------------------
     05 · Arrows
     ------------------------------------------------------------------------ */
  $$('a span[aria-hidden="true"], button span[aria-hidden="true"]').forEach(span => {
    const glyph = span.textContent.trim();
    if (span.children.length) return;
    if (glyph === '→') span.classList.add('mg-arrow');
    if (glyph === '↗') { span.classList.add('mg-arrow-ne'); span.innerHTML = '<span>↗</span><span>↗</span>'; }
  });
  // Links that carry the ↗ as plain text (e.g. newsletter letters).
  $$('a').forEach(link => {
    const last = link.lastChild;
    if (!last || last.nodeType !== Node.TEXT_NODE || !last.textContent.trimEnd().endsWith('↗')) return;
    const text = last.textContent.trimEnd();
    last.textContent = text.slice(0, -1);
    const span = document.createElement('span');
    span.className = 'mg-arrow-ne';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<span>↗</span><span>↗</span>';
    link.append(span);
  });

  /* ------------------------------------------------------------------------
     Shared reveal observer with a per-batch stagger
     ------------------------------------------------------------------------ */
  const reveal = (elements, onShow, { step = 55, base = 0, cap = 8 } = {}) => {
    const pending = [];
    let loadIndex = 0;
    elements.forEach(el => {
      if (inView(el)) onShow(el, base + Math.min(loadIndex++, cap) * step);
      else if (below(el)) pending.push(el);
      else onShow(el, 0, true);
    });
    if (!pending.length) return;
    if (!('IntersectionObserver' in window)) { pending.forEach(el => onShow(el, 0)); return; }
    const left = new Set(pending);
    const show = (el, delay) => { if (!left.delete(el)) return; io.unobserve(el); onShow(el, delay); };
    const io = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((entry, i) => show(entry.target, Math.min(i, cap) * step));
    }, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' });
    pending.forEach(el => io.observe(el));
    // Items in the last sliver of the page can never cross the margin: show them at the bottom.
    const atEnd = () => {
      if (!left.size) { removeEventListener('scroll', atEnd); return; }
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) {
        [...left].forEach((el, i) => show(el, Math.min(i, cap) * step));
      }
    };
    addEventListener('scroll', atEnd, { passive: true });
  };

  /* ------------------------------------------------------------------------
     07 · Hairlines
     ------------------------------------------------------------------------ */
  const lineTargets = $$([
    '.announce-band', '.mailing-inner', '.archive-item', '.feature-item', '.credit-row',
    '.engagement-row', '.related-link', '.footer-inner', '.edition', '.project-embed summary'
  ].join(',')).filter(el => {
    const cs = getComputedStyle(el);
    const top = cs.borderTopStyle !== 'none' ? parseFloat(cs.borderTopWidth) : 0;
    const bottom = cs.borderBottomStyle !== 'none' ? parseFloat(cs.borderBottomWidth) : 0;
    if (!top && !bottom) return false;
    if (top) { el.style.setProperty('--mg-lt', cs.borderTopColor); el.style.setProperty('--mg-wt', `${top}px`); el.classList.add('mg-line-t'); }
    if (bottom) { el.style.setProperty('--mg-lb', cs.borderBottomColor); el.style.setProperty('--mg-wb', `${bottom}px`); el.classList.add('mg-line-b'); }
    el.classList.add('mg-line');
    return true;
  });
  requestAnimationFrame(() => reveal(lineTargets, (el, delay, instant) => {
    el.style.setProperty('--mg-d', `${instant ? 0 : delay}ms`);
    el.classList.add('is-drawn');
  }, { step: 70, base: 260 }));

  /* ------------------------------------------------------------------------
     08 · Rise into focus
     ------------------------------------------------------------------------ */
  const riseTargets = [];
  $$([
    '.announce-inner', '.section-head', '.mailing-inner > *',
    '.archive-section-title', '.archive-item', '.work-features > h2', '.feature-item',
    '.content-section > *', '.related-inner > *', '.newsletter-details > *',
    '.article-body > *', '.pack-card', '.film-caption', '.footer-inner > *'
  ].join(',')).forEach(el => {
    if (handledByCore(el) || el.closest('[data-mg="rise"]') || el.getBoundingClientRect().height < 1) return;
    el.dataset.mg = 'rise';
    riseTargets.push(el);
  });
  requestAnimationFrame(() => reveal(riseTargets, (el, delay, instant) => {
    el.style.setProperty('--mg-d', `${instant ? 0 : delay}ms`);
    el.classList.add('is-in');
    // Once settled, hand the element back to its normal (hover) transitions.
    setTimeout(() => {
      el.removeAttribute('data-mg');
      el.classList.remove('is-in');
      el.style.removeProperty('--mg-d');
    }, (instant ? 0 : delay) + 1100);
  }, { step: 55, base: 220 }));

  /* ------------------------------------------------------------------------
     09 · Images: decode fade + settle
     ------------------------------------------------------------------------ */
  const settleTargets = [];
  $$([
    '.work-image img', '.archive-thumb img', '.article-media img', 'img.article-hero',
    '.article-pair img', '.project-gallery img', '.pack-gallery img', '.pack-hero img'
  ].join(',')).forEach(img => {
    img.classList.add('mg-img');
    if (!img.complete) {
      img.classList.add('is-waiting');
      const done = () => img.classList.remove('is-waiting');
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
    if (below(img)) { img.dataset.mgSettle = 'pending'; settleTargets.push(img); }
  });
  reveal(settleTargets, img => { img.dataset.mgSettle = 'done'; }, { step: 0 });

  /* ------------------------------------------------------------------------
     10 · Develop (portrait, prints)
     ------------------------------------------------------------------------ */
  const developTargets = $$('.about-portrait img, .print-sheet');
  developTargets.forEach(img => { img.dataset.mgDevelop = 'pending'; });
  requestAnimationFrame(() => reveal(developTargets, (img, delay) => {
    img.style.setProperty('--mg-d', `${delay}ms`);
    const go = () => requestAnimationFrame(() => { img.dataset.mgDevelop = 'done'; });
    if (img.complete) go(); else img.addEventListener('load', go, { once: true });
    img.addEventListener('error', go, { once: true });
  }, { step: 120, base: 350 }));

  /* ------------------------------------------------------------------------
     11 · Print tilt (shop)
     ------------------------------------------------------------------------ */
  if (fine) {
    $$('.pack-image').forEach(card => {
      const sheet = card.querySelector('.print-sheet');
      if (!sheet) return;
      let frame = 0;
      card.addEventListener('pointermove', event => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const x = (event.clientX - r.left) / r.width - .5;
          const y = (event.clientY - r.top) / r.height - .5;
          card.classList.add('is-tilting');
          sheet.style.transform = `perspective(1100px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg) translateY(-3px)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(frame);
        card.classList.remove('is-tilting');
        sheet.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------------
     13 · Cursor label
     ------------------------------------------------------------------------ */
  if (fine) {
    const zones = [['.work-card .work-image', 'View'], ['.pack-image', 'View pack']]
      .flatMap(([sel, label]) => $$(sel).map(el => [el, label]));
    if (zones.length) {
      const pill = document.createElement('div');
      pill.className = 'mg-cursor';
      pill.setAttribute('aria-hidden', 'true');
      document.body.append(pill);
      let x = 0, y = 0, cx = 0, cy = 0, running = false, shown = false;
      const loop = () => {
        cx += (x - cx) * .2;
        cy += (y - cy) * .2;
        pill.style.transform = `translate3d(${cx + 16}px, ${cy + 16}px, 0)`;
        if (shown || Math.abs(x - cx) > .5 || Math.abs(y - cy) > .5) requestAnimationFrame(loop);
        else running = false;
      };
      zones.forEach(([el, label]) => {
        el.addEventListener('pointerenter', event => {
          pill.textContent = label;
          x = event.clientX; y = event.clientY;
          if (!shown) { cx = x; cy = y; }
          shown = true;
          pill.classList.add('is-visible');
          if (!running) { running = true; requestAnimationFrame(loop); }
        });
        el.addEventListener('pointermove', event => { x = event.clientX; y = event.clientY; });
        el.addEventListener('pointerleave', () => { shown = false; pill.classList.remove('is-visible'); });
      });
      window.addEventListener('scroll', () => { if (shown) { shown = false; pill.classList.remove('is-visible'); } }, { passive: true });
    }
  }

  /* ------------------------------------------------------------------------
     Back/forward cache: show everything in its final state
     ------------------------------------------------------------------------ */
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    $$('[data-mg="rise"]').forEach(el => el.classList.add('is-in'));
    $$('.mg-line').forEach(el => el.classList.add('is-drawn'));
    $$('[data-mg-settle]').forEach(el => { el.dataset.mgSettle = 'done'; });
    $$('[data-mg-develop]').forEach(el => { el.dataset.mgDevelop = 'done'; });
    document.querySelector('.home-hero')?.classList.remove('mg-chars-wait', 'mg-reel-wait', 'mg-copy-wait');
  });
})();
