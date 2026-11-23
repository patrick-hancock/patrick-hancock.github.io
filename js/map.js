// Property Management maps (R3.T09, SPEC-reshape section 6). No library, no tiles, no third-party requests.
// Zoom and pan: +, - and Reset buttons, drag when zoomed, Ctrl/Cmd + wheel (a plain wheel scrolls the page).
// Markers are real buttons: Enter or Space (or a tap) toggles the preview, Escape closes it and returns focus to the marker.
// Tabbing to a marker that is out of view pans it into view. Without JS every preview card stays visible as a list.
(() => {
  const MAX_K = 8;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-view]').forEach(view => {
    const vp = view.querySelector('[data-viewport]');
    const stage = view.querySelector('[data-stage]');
    const btns = {
      in: view.querySelector('[data-zoom="in"]'),
      out: view.querySelector('[data-zoom="out"]'),
      reset: view.querySelector('[data-zoom="reset"]'),
    };
    let k = 1, tx = 0, ty = 0;

    const clamp = () => {
      const w = vp.clientWidth, h = vp.clientHeight;
      k = Math.min(MAX_K, Math.max(1, k));
      tx = Math.min(0, Math.max(w * (1 - k), tx));
      ty = Math.min(0, Math.max(h * (1 - k), ty));
    };
    const apply = () => {
      clamp();
      stage.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
      stage.style.setProperty('--k', k);
      vp.dataset.zoomed = k > 1 ? 'true' : 'false';
      btns.in.setAttribute('aria-disabled', k >= MAX_K ? 'true' : 'false');
      btns.out.setAttribute('aria-disabled', k <= 1 ? 'true' : 'false');
      btns.reset.setAttribute('aria-disabled', k === 1 && tx === 0 && ty === 0 ? 'true' : 'false');
    };
    const zoomAt = (factor, cx, cy) => {
      const nk = Math.min(MAX_K, Math.max(1, k * factor));
      tx = cx - (cx - tx) * (nk / k);
      ty = cy - (cy - ty) * (nk / k);
      k = nk;
      apply();
    };
    const centre = () => [vp.clientWidth / 2, vp.clientHeight / 2];

    btns.in.addEventListener('click', () => zoomAt(1.5, ...centre()));
    btns.out.addEventListener('click', () => zoomAt(1 / 1.5, ...centre()));
    btns.reset.addEventListener('click', () => { k = 1; tx = 0; ty = 0; apply(); });

    vp.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    // Drag to pan (when zoomed). Presses on markers are left alone so they stay clickable.
    let drag = null;
    vp.addEventListener('pointerdown', e => {
      if (k <= 1 || e.button !== 0 || e.target.closest('[data-marker]')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tx, ty, moved: false };
    });
    vp.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      if (!drag.moved) { drag.moved = true; vp.setPointerCapture(e.pointerId); vp.dataset.drag = 'true'; }
      tx = drag.tx + dx; ty = drag.ty + dy;
      apply();
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      vp.dataset.drag = 'false';
    };
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);

    // Keyboard focus on a marker pans it into view.
    stage.addEventListener('focusin', e => {
      const b = e.target.closest('[data-marker]');
      if (!b || k <= 1) return;
      vp.scrollLeft = 0; vp.scrollTop = 0;
      const w = vp.clientWidth, h = vp.clientHeight, m = 36;
      const x = parseFloat(b.style.left) / 100 * w * k + tx;
      const y = parseFloat(b.style.top) / 100 * stage.offsetHeight * k + ty;
      if (x < m) tx += m - x; else if (x > w - m) tx -= x - (w - m);
      if (y < m) ty += m - y; else if (y > h - m) ty -= y - (h - m);
      apply();
    });
    window.addEventListener('resize', apply);
    apply();
  });

  // Preview panel: one card open at a time across the block.
  document.querySelectorAll('[data-map-block]').forEach(block => {
    const cards = [...block.querySelectorAll('[data-card]')];
    const markers = [...block.querySelectorAll('[data-marker]')];
    let opener = null;
    cards.forEach(c => { c.hidden = true; });

    const close = refocus => {
      cards.forEach(c => { c.hidden = true; });
      markers.forEach(m => m.setAttribute('aria-expanded', 'false'));
      const o = opener; opener = null;
      if (refocus && o) o.focus();
    };
    const open = marker => {
      close(false);
      const card = document.getElementById(marker.getAttribute('aria-controls'));
      if (!card) return;
      card.hidden = false;
      marker.setAttribute('aria-expanded', 'true');
      opener = marker;
      card.scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
    };

    markers.forEach(m => m.addEventListener('click', () => {
      if (m.getAttribute('aria-expanded') === 'true') close(false); else open(m);
    }));
    block.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(true)));
    block.addEventListener('keydown', e => {
      if (e.key === 'Escape' && opener) { e.preventDefault(); close(true); }
    });
  });
})();
