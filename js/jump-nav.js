// Scroll highlight for the sticky jump nav (D-001): the link whose section crosses the band
// 30-40% down the viewport is current. At the bottom of the page the last link wins, because
// a short last section may never reach the band.
(() => {
  const links = [...document.querySelectorAll('[data-jump] a')];
  const sections = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (!sections.length) return;

  const mark = id => links.forEach(a => {
    const on = a.hash === '#' + id;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });

  const atBottom = () => innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
  const io = new IntersectionObserver(entries => {
    if (atBottom()) return;
    entries.forEach(e => { if (e.isIntersecting) mark(e.target.id); });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach(s => io.observe(s));

  addEventListener('scroll', () => { if (atBottom()) mark(sections[sections.length - 1].id); }, { passive: true });
  mark(location.hash && document.getElementById(location.hash.slice(1)) ? location.hash.slice(1) : sections[0].id);
})();
