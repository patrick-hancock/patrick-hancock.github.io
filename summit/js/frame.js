/* Shared page frame for the Summit pages: number formats, the store filter (G5), tiles from the DAX export,
   queue tables with paging and the detail drawer (dialog role, focus return, Space and Enter), phone menu scroll (G2).
   Page data is embedded by build_site.py as JSON in #page-data; nothing is fetched. Written 2026-11-18 by Claude. */
(function () {
  "use strict";
  const D = JSON.parse(document.getElementById("page-data").textContent);
  window.SUMMIT = { notes: D.notes || {} };
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  const nf = function (v, d) { return Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  const sign = function (v) { return v < 0 ? "−" : ""; };
  function fmt(v, kind) {
    if (v === null || v === undefined || Number.isNaN(v)) return "—";
    switch (kind) {
      case "int": return sign(v) + nf(Math.round(v), 0);
      case "usd0": return sign(v) + "$" + nf(v, 0);
      case "usd2": return sign(v) + "$" + nf(v, 2);
      case "usdc": { const a = Math.abs(v); return sign(v) + (a >= 1e6 ? "$" + nf(a / 1e6, 2) + "M" : a >= 1e3 ? "$" + nf(a / 1e3, 1) + "K" : "$" + nf(a, 0)); }
      case "pct1": return sign(v) + nf(v * 100, 1) + "%";
      case "pct0": return sign(v) + nf(v * 100, 0) + "%";
      case "num1": return sign(v) + nf(v, 1);
      case "num2": return sign(v) + nf(v, 2);
      case "days1": return nf(v, 1) + " days";
      case "days2": return nf(v, 2) + " days";
      case "min0": return nf(v, 0) + " min";
      case "ratio2": return nf(v, 2) + "×";
      case "date": return String(v).slice(0, 10);
      default: return String(v);
    }
  }

  /* Store filter: one select per page (id "store"); "ALL" means every store */
  const sel = $("store");
  /* A link may name the store: service.html?store=LOC-05 opens the page filtered to it */
  try {
    const want = new URLSearchParams(location.search).get("store");
    if (sel && want && [].some.call(sel.options, function (o) { return o.value === want; })) sel.value = want;
  } catch (e) { /* no URL parameters: keep All stores */ }
  const listeners = [];
  function store() { return sel ? sel.value : "ALL"; }
  function onStore(fn) { listeners.push(fn); }
  if (sel) sel.addEventListener("change", function () { listeners.forEach(function (fn) { fn(store()); }); if (window.Explain) window.Explain.refresh(); });

  /* Tiles: values from the Power BI model's DAX answers (kpi.json) for the chosen scope */
  function kv(mid, scope) {
    const m = D.kpi[mid];
    if (!m) return undefined;
    const v = m.values[scope];
    return v === undefined ? null : v;
  }
  function tiles(el, list) {
    const s = store();
    el.innerHTML = list.map(function (t) {
      let v = t.value !== undefined ? (typeof t.value === "function" ? t.value(s) : t.value) : kv(t.mid, s);
      let txt;
      if (v === null || v === undefined) txt = t.blank !== undefined ? t.blank : "—";
      else txt = fmt(v, t.fmt);
      const sub = typeof t.sub === "function" ? t.sub(s) : (t.sub || "");
      return '<div class="tile" data-x="' + t.key + '"><div class="l xb">' + esc(t.label) + "</div>" +
        (t.kind ? '<span class="kind ' + t.kind + '">' + esc(t.kindLabel || { est: "estimate", ms: "measured", fc: "forecast" }[t.kind] || t.kind) + "</span>" : "") +
        '<div class="v">' + txt + '</div><div class="s">' + esc(sub) + (s !== "ALL" && !t.groupOnly ? "" : "") + "</div></div>";
    }).join("");
  }

  /* Columnar rows -> objects */
  function rows(t) { return t.rows.map(function (r) { const o = {}; t.cols.forEach(function (c, i) { o[c] = r[i]; }); return o; }); }

  /* Drawer */
  const drawer = $("drawer");
  let opener = null;
  function openDrawer(title, pairs, trigger, foot) {
    opener = trigger;
    $("dtitle").textContent = title;
    $("ddl").innerHTML = pairs.map(function (p) { return "<dt>" + esc(p[0]) + "</dt><dd>" + (p[2] ? p[1] : esc(p[1])) + "</dd>"; }).join("");
    $("dfoot").textContent = foot || "Read-only. Action tracking is Phase 2I.";
    drawer.hidden = false;
    drawer.querySelector(".close").focus();
  }
  function closeDrawer() { if (!drawer || drawer.hidden) return; drawer.hidden = true; if (opener && opener.isConnected) opener.focus(); }
  if (drawer) {
    drawer.querySelector(".close").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) closeDrawer(); });
    drawer.addEventListener("keydown", function (e) { /* keep Tab inside the dialog */
      if (e.key !== "Tab") return;
      const f = drawer.querySelectorAll("button, a[href]");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* Queue table: cfg {tbody, count, more, data (objects), columns [{k, fmt, cls, html(r)}], filter(r, s), title(r), detail(r), empty(s), page} */
  function queue(cfg) {
    let shown = cfg.page || 50;
    const tb = cfg.tbody, more = cfg.more;
    function draw() {
      const s = store();
      const list = cfg.data.filter(function (r) { return s === "ALL" || (cfg.filter ? cfg.filter(r, s) : r.location_id === s); });
      tb.innerHTML = "";
      list.slice(0, shown).forEach(function (r) {
        const tr = document.createElement("tr");
        tr.tabIndex = 0;
        tr.setAttribute("aria-label", "Open detail for " + cfg.title(r));
        tr.innerHTML = cfg.columns.map(function (c) {
          const v = c.html ? c.html(r) : esc(fmt(r[c.k], c.fmt));
          return '<td class="' + (c.cls || "") + '">' + v + "</td>";
        }).join("");
        const open = function () { openDrawer(cfg.title(r), cfg.detail(r), tr); };
        tr.addEventListener("click", open);
        tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
        tb.append(tr);
      });
      if (!list.length) tb.innerHTML = '<tr><td colspan="' + cfg.columns.length + '" class="muted">' + esc(cfg.empty(s)) + "</td></tr>";
      if (cfg.count) cfg.count.textContent = list.length ? "Showing " + fmt(Math.min(shown, list.length), "int") + " of " + fmt(list.length, "int") + " rows" + (s === "ALL" ? "" : " at " + s) + "." : "";
      if (more) more.hidden = list.length <= shown;
    }
    if (more) more.addEventListener("click", function () { shown += cfg.page || 50; draw(); const r = tb.children[shown - (cfg.page || 50)]; if (r) r.focus(); });
    onStore(function () { shown = cfg.page || 50; draw(); });
    draw();
    return draw;
  }

  /* Phones: the frozen top menu scrolls sideways; start it with the current page in view */
  const a = document.querySelector("nav.rail a[aria-current]"), n = a && a.closest("nav");
  if (n && n.scrollWidth > n.clientWidth) n.scrollLeft = a.offsetLeft - 16;

  /* Signal values by subject for one scenario (mart.scenario_signal_value), and its summary row (mart.scenario_signal) */
  function sigValues(sid) { const o = {}; (D.signals ? D.signals.values : []).forEach(function (r) { if (r.scenario_id === sid) o[r.subject_id] = r.signal_value; }); return o; }
  function sigRow(sid) { return (D.signals ? D.signals.scenarios : []).find(function (r) { return r.scenario_id === sid; }); }
  /* Evidence charts: defs [{key, sid, title, note, fmt}], each the target store(s) against the mean of the others (G4) */
  function evidence(chartsEl, tbody, defs) {
    const s = store();
    chartsEl.innerHTML = defs.map(function (c) {
      const row = sigRow(c.sid), targets = row.target.split(";"), v = window.Charts.versus(sigValues(c.sid), targets, c.fmt, s, c.peerLabel);
      c._v = v; c._t = targets;
      const extra = s !== "ALL" && targets.indexOf(s) < 0 ? " " + s + " is shown in blue." : "";
      return '<div class="chart" data-x="' + c.key + '"><h3 class="xb">' + esc(c.title) + '</h3><p class="note">' + esc(c.note) + extra + "</p>" + v.svg + "</div>";
    }).join("");
    tbody.innerHTML = defs.map(function (c) {
      const row = sigRow(c.sid), vals = sigValues(c.sid);
      return "<tr><td>" + esc(c.title) + '</td><td>' + esc(row.target.replace(";", ", ")) + '</td><td class="n">' + c._t.map(function (t) { return fmt(vals[t], c.fmt); }).join(", ") +
        '</td><td class="n">' + fmt(c._v.mean, c.fmt) + '</td><td class="n">' + (s === "ALL" ? "—" : fmt(vals[s], c.fmt)) + "</td><td>" + (row.is_detected ? "Yes" : "No") + "</td></tr>";
    }).join("");
  }
  window.S = { D: D, sigValues: sigValues, sigRow: sigRow, evidence: evidence, $: $, esc: esc, fmt: fmt, store: store, onStore: onStore, kv: kv, tiles: tiles, rows: rows, queue: queue,
    openDrawer: openDrawer, closeDrawer: closeDrawer, STORES: ["LOC-01", "LOC-02", "LOC-03", "LOC-04", "LOC-05", "LOC-06", "LOC-07", "LOC-08"] };
})();
