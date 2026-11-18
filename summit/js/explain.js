/* Explain the numbers (G8 hybrid, Patrick's pick 2026-11-18), lifted from the approved mockups.
   Every figure carries data-x="<note key>"; notes come from window.SUMMIT.notes (the build writes only the keys a page uses).
   Page switch on: every note shown inline, i buttons hidden. Switch off: each i button shows its note on hover or focus;
   a click pins it until Close, Escape or a click elsewhere; Close and Escape return focus to the button.
   The choice is remembered per viewer in localStorage (wrapped in try/catch: storage can be blocked). */
(function () {
  "use strict";
  const NOTES = (window.SUMMIT && window.SUMMIT.notes) || {};
  const root = document.documentElement;
  const toggle = document.getElementById("xtoggle");
  const pop = document.getElementById("xpop");
  const popText = pop.querySelector(".xpt");
  let pinned = null, cur = null, quiet = null, hideT = 0;

  function applyNotes(scope) {
    (scope || document).querySelectorAll("[data-x]").forEach(function (e) {
      const k = e.dataset.x, t = NOTES[k];
      if (!t) return;
      const tag = e.tagName;
      const after = e.dataset.xPos === "after" || tag === "P" || tag === "TR" || e.classList.contains("tablewrap");
      const host = after ? e.parentElement : e;
      if (host.querySelector(':scope > .xnote[data-for="' + k + '"]')) return;
      let n;
      if (tag === "TR") {
        n = document.createElement("tr");
        n.className = "xnote xrow";
        n.innerHTML = '<td colspan="' + e.children.length + '"><b>What this means</b>' + t + "</td>";
      } else {
        n = document.createElement("p");
        n.className = "xnote";
        n.innerHTML = "<b>What this means</b>" + t;
      }
      n.dataset.for = k;
      if (after) { e.classList.add("xsrc"); e.insertAdjacentElement("afterend", n); } else e.append(n);
    });
  }

  function place(b) {
    const r = b.getBoundingClientRect(), w = Math.min(320, innerWidth - 32);
    pop.style.width = w + "px";
    pop.style.left = Math.min(Math.max(16, r.left + r.width / 2 - w / 2), innerWidth - 16 - w) + "px";
    const h = pop.offsetHeight;
    let y = r.bottom + 8;
    if (y + h > innerHeight - 8 && r.top - 8 - h > 8) y = r.top - 8 - h;
    pop.style.top = Math.max(8, y) + "px";
  }
  function showPop(b, pin) {
    clearTimeout(hideT);
    if (pinned && pinned !== b && !pin) return;
    if (cur && cur !== b) { cur.removeAttribute("aria-describedby"); cur.setAttribute("aria-expanded", "false"); }
    popText.innerHTML = NOTES[b.dataset.k];
    pop.classList.toggle("pinned", pin);
    pop.hidden = false;
    place(b);
    b.setAttribute("aria-describedby", "xpop");
    b.setAttribute("aria-expanded", String(pin));
    pinned = pin ? b : null;
    cur = b;
  }
  function hidePop() {
    clearTimeout(hideT);
    pop.hidden = true;
    if (cur) { cur.removeAttribute("aria-describedby"); cur.setAttribute("aria-expanded", "false"); }
    pinned = null; cur = null;
  }
  function laterHide() { if (!pinned) { clearTimeout(hideT); hideT = setTimeout(hidePop, 150); } }
  function closeAndReturn() { const b = cur; hidePop(); if (b && b.isConnected) { quiet = b; b.focus(); } }

  function addInfo(scope) {
    (scope || document).querySelectorAll("[data-x]").forEach(function (e) {
      const k = e.dataset.x;
      if (!NOTES[k]) return;
      const host = e.querySelector(".xb") || e;
      if (host.querySelector(":scope > .ib")) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "ib"; b.dataset.k = k; b.textContent = "i";
      b.setAttribute("aria-label", "What this means: " + (e.dataset.xl || host.textContent.trim().slice(0, 70)));
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("pointerenter", function (ev) { if (ev.pointerType === "mouse") showPop(b, false); });
      b.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse") laterHide(); });
      b.addEventListener("focus", function () { if (quiet === b) { quiet = null; return; } if (!pinned) showPop(b, false); });
      b.addEventListener("blur", laterHide);
      b.addEventListener("click", function (ev) { ev.stopPropagation(); if (pinned === b) hidePop(); else showPop(b, true); });
      host.append(b);
    });
    if (cur && !cur.isConnected) hidePop();
  }

  function setExplain(on) {
    hidePop();
    root.classList.toggle("explain", on);
    toggle.setAttribute("aria-pressed", String(on));
    try { localStorage.setItem("summit-explain", on ? "1" : "0"); } catch (e) { /* storage blocked: the choice lasts this page only */ }
  }
  toggle.addEventListener("click", function () {
    const on = !root.classList.contains("explain");
    root.classList.add("xanim");
    setExplain(on);
    setTimeout(function () { root.classList.remove("xanim"); }, 300);
  });
  pop.addEventListener("pointerenter", function () { clearTimeout(hideT); });
  pop.addEventListener("pointerleave", laterHide);
  pop.querySelector(".xpc").addEventListener("click", closeAndReturn);
  document.addEventListener("click", function (e) { if (!pop.hidden && !pop.contains(e.target)) hidePop(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) { e.stopImmediatePropagation(); closeAndReturn(); } }, true);
  addEventListener("resize", function () { if (cur && !pop.hidden) place(cur); });
  addEventListener("scroll", function () { if (cur && !pop.hidden) place(cur); }, true);

  /* Pages call Explain.refresh(container) after they redraw part of the page (store filter, tab, paging). */
  window.Explain = { refresh: function (scope) { applyNotes(scope); addInfo(scope); }, hide: hidePop };
  applyNotes(); addInfo();
  let saved = null;
  try { saved = localStorage.getItem("summit-explain"); } catch (e) { saved = null; }
  setExplain(saved === "1");
})();
