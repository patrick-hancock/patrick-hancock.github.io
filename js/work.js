// Work page script (work.html), ported from the approved D-064 mockup (docs/review/work-mockup/mockup.js) in D-067.
// Progressive enhancement: without this script every case-study panel and every tab panel stays visible.
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  // 1. Diagram nodes (from work.js). One pressed node per group; pressing it again clears it.
  document.querySelectorAll('[data-diagram]').forEach(fig => {
    const nodes = [...fig.querySelectorAll('.dx-node')];
    const panel = fig.querySelector('.dx-detail');
    if (!nodes.length || !panel) return;
    const show = btn => {
      nodes.forEach(b => {
        const on = b === btn;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('is-on', on);
      });
      fig.classList.toggle('has-selection', !!btn);
      if (!btn) { panel.hidden = true; panel.textContent = ''; return; }
      panel.hidden = false;
      panel.innerHTML = '';
      const h = document.createElement('p');
      h.className = 'dx-detail__name';
      h.textContent = btn.querySelector('.dx-node__name').textContent;
      const t = document.createElement('p');
      t.className = 'dx-detail__text';
      t.textContent = btn.querySelector('.dx-node__text').textContent;
      panel.append(h, t);
    };
    nodes.forEach(b => b.addEventListener('click', () => show(b.getAttribute('aria-pressed') === 'true' ? null : b)));
  });

  // 2. Project filter (from work.js).
  const btns = [...document.querySelectorAll('.dx-filter__btn')];
  const cards = [...document.querySelectorAll('.dx-card')];
  const intros = [...document.querySelectorAll('[data-intro]')];
  const count = document.querySelector('[data-count]');
  const empty = document.querySelector('[data-empty]');
  const filter = key => {
    btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === key ? 'true' : 'false'));
    let n = 0;
    cards.forEach(c => {
      const on = key === 'all' || c.dataset.pillars.split(' ').includes(key);
      c.hidden = !on;
      if (on) n++;
    });
    intros.forEach(p => { p.hidden = p.dataset.intro !== key; });
    if (count) count.textContent = n;
    if (empty) empty.hidden = n > 0;
  };
  btns.forEach(b => b.addEventListener('click', () => filter(b.dataset.filter)));
  if (btns.length) filter('all');

  // 3. Tile groups ([data-tiles]: the hero case-study buttons and the Selected Work tiles). One open panel per group:
  //    clicking the open tile closes it, clicking another in the same group switches to it.
  const tiles = [...document.querySelectorAll('[data-tile]')];
  const panelOf = t => document.getElementById(t.getAttribute('aria-controls'));
  const groupOf = t => t.closest('[data-tiles]');
  const closeGroup = g => tiles.filter(t => groupOf(t) === g).forEach(t => {
    t.setAttribute('aria-expanded', 'false');
    panelOf(t).hidden = true;
  });
  const openTile = tile => {
    if (!tile) return;
    closeGroup(groupOf(tile));
    tile.setAttribute('aria-expanded', 'true');
    panelOf(tile).hidden = false;
  };
  tiles.forEach(t => t.addEventListener('click', () => {
    if (t.getAttribute('aria-expanded') === 'true') closeGroup(groupOf(t)); else openTile(t);
  }));
  new Set(tiles.map(groupOf)).forEach(closeGroup);

  // 4. How I Build tabs (vertical tablist; arrows, Home and End move between tabs).
  const tabs = [...document.querySelectorAll('.mk-tab')];
  const selectTab = (tab, focus) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const k = e.key; let j = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });
  if (tabs.length) selectTab(tabs[0]);

  // 4b. Control plane layers (round 8): one layer selected at a time; its detail shows beside the stack
  //     on wide screens and under the layer on narrow ones. Without this script every detail stays visible.
  const layers = [...document.querySelectorAll('.mk-cp__layer')];
  const selectLayer = btn => layers.forEach(b => {
    const on = b === btn;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.closest('.mk-cp__item').classList.toggle('is-on', on);
  });
  layers.forEach(b => b.addEventListener('click', () => selectLayer(b)));
  if (layers.length) selectLayer(layers[0]);

  // Round 9: section links land with the heading just below the sticky header and section bar. Their combined height
  // changes with width (61 + 45 = 106px at 1024; the header wraps on phones), so it is measured, plus a 16px gap.
  const subnav = document.querySelector('.dx-subnav');
  const setPad = () => {
    if (!subnav) return;
    const cs = getComputedStyle(subnav);
    const pad = cs.position === 'sticky' ? (parseFloat(cs.top) || 0) + subnav.offsetHeight + 16 : 16;
    root.style.scrollPaddingTop = pad + 'px';
  };
  setPad();
  addEventListener('resize', setPad);
  // Also measure at the moment an in-page link is clicked (capture phase, before the browser scrolls): in the
  // 2026-11-24 probe neither a resize event nor a ResizeObserver fired under the browser pane's width emulation, so a
  // padding measured at load stayed wrong after the width changed (77px gap instead of 16px at 430 and 390).
  document.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) setPad(); }, true);

  // Deep links: a hash inside a closed case panel or an inactive tab panel opens it, then scrolls to the target.
  const openFromHash = () => {
    const id = location.hash.slice(1);
    const el = id && document.getElementById(id);
    if (!el) return;
    const panel = el.closest('.mk-panel');
    if (panel) openTile(tiles.find(t => t.getAttribute('aria-controls') === panel.id));
    const tp = el.closest('.mk-tabpanel');
    if (tp) selectTab(tabs.find(t => t.getAttribute('aria-controls') === tp.id));
    if (panel || tp) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  };
  addEventListener('hashchange', openFromHash);
  // A link to the hash already in the address bar fires no hashchange, so handle that click directly.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.hash === location.hash) setTimeout(openFromHash);
  });
  openFromHash();

  // 5. Section nav highlight (from work.js).
  const links = [...document.querySelectorAll('.dx-subnav a[href^="#"]')];
  const secs = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (secs.length && 'IntersectionObserver' in window) {
    const mark = id => links.forEach(a => {
      const on = a.hash === '#' + id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) mark(e.target.id); }),
      { rootMargin: '-25% 0px -65% 0px' });
    secs.forEach(s => io.observe(s));
  }
})();
