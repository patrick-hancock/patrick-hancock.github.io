// Data / BI / AI page (work.html, D-058). Progressive enhancement only: every diagram, list and card is complete in the
// HTML. This adds (1) selectable diagram nodes that copy a node's text into its detail panel, (2) the project filter,
// (3) case-study deep links (#case-notice opens its details), (4) the sticky section nav highlight.
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  // 1. Diagram nodes. One pressed node per group; pressing it again clears it. Click covers mouse, touch and
  //    keyboard (Enter and Space on a button).
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
      const where = btn.querySelector('.dx-node__where');
      if (where) { const w = where.cloneNode(true); w.className = 'dx-detail__where'; panel.append(w); }
    };
    nodes.forEach(b => b.addEventListener('click', () => show(b.getAttribute('aria-pressed') === 'true' ? null : b)));
  });

  // 2. Project filter. Cards stay in DOM order; non-matching cards get the hidden attribute. A card with several
  //    pillars matches each of them (one DOM card, no duplicates).
  const btns = [...document.querySelectorAll('.dx-filter__btn')];
  const cards = [...document.querySelectorAll('.dx-card')];
  const intros = [...document.querySelectorAll('[data-intro]')];
  const count = document.querySelector('[data-count]');
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
  };
  btns.forEach(b => b.addEventListener('click', () => filter(b.dataset.filter)));
  if (btns.length) filter('all');

  // 3. Deep links: #case-bi, #case-platform, #case-notice (or the pillar ids) open that case study's details.
  const openFromHash = () => {
    const id = location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    const art = el && el.closest('.dx-case');
    if (art && id.startsWith('case-')) {
      const det = art.querySelector('details');
      if (det) det.open = true;
    }
  };
  addEventListener('hashchange', openFromHash);
  openFromHash();

  // 4. Section nav highlight: the link whose section crosses the band 25-35% down the viewport is current.
  const links = [...document.querySelectorAll('.dx-subnav a')];
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
