/* Hand-built SVG charts for the Summit pages (G4). Each function returns markup; every chart sits beside a
   "show as a table" fallback that the page writes from the same values. Colors are CSS tokens, so light and dark both work.
   Forms: bars (paired or ranked horizontal bars), mini (line or bar, with a pointer readout), funnel (nested counts by store),
   hist (distribution with a policy line), strips (per-store distribution with a policy line). Written 2026-11-18 by Claude. */
(function () {
  "use strict";
  const esc = function (s) { return window.S.esc(s); };
  const fmt = function (v, k) { return window.S.fmt(v, k); };

  /* Horizontal bars. rows [{label, v, col, strong, dim}], fmt kind, opts {labelW, max} */
  function bars(rows, kind, opts) {
    opts = opts || {};
    const W = 320, L = opts.labelW || 104, R = 64, bh = 16, gap = 10, H = rows.length * (bh + gap) + 2;
    const max = opts.max || Math.max.apply(null, rows.map(function (r) { return Math.abs(r.v || 0); })) * 1.08 || 1;
    const x = function (v) { return (W - L - R) * Math.abs(v || 0) / max; };
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">';
    rows.forEach(function (r, i) {
      const y = 2 + i * (bh + gap), w = Math.max(x(r.v), r.v ? 1.5 : 0);
      s += '<text x="0" y="' + (y + 12) + '" class="' + (r.strong ? "t" : "") + '">' + esc(r.label) + "</text>";
      s += '<rect x="' + L + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + bh + '" rx="2" fill="' + (r.col || "var(--bar)") + '" opacity="' + (r.dim ? 0.45 : 1) + '"/>';
      s += '<text x="' + (L + w + 5).toFixed(1) + '" y="' + (y + 12) + '" class="t">' + esc(fmt(r.v, kind)) + "</text>";
    });
    return s + "</svg>";
  }

  /* Target store against the mean of the other seven, plus the filtered store when it is neither (P2-P6 evidence charts) */
  function versus(values, targets, kind, store, peerLabel) {
    const subj = Object.keys(values);
    const peers = subj.filter(function (k) { return targets.indexOf(k) < 0; });
    const mean = peers.reduce(function (a, k) { return a + (values[k] || 0); }, 0) / (peers.length || 1);
    const rows = targets.map(function (t) { return { label: t, v: values[t], col: "var(--warn)", strong: true }; });
    rows.push({ label: peerLabel || "Other " + peers.length + " (mean)", v: mean, col: "var(--bar)" });
    if (store && store !== "ALL" && targets.indexOf(store) < 0 && values[store] !== undefined) rows.push({ label: store, v: values[store], col: "var(--accent)", strong: true });
    return { svg: bars(rows, kind), mean: mean, rows: rows };
  }

  /* Every subject ranked, targets in the warning color, the filtered store in the accent color */
  function ranked(values, targets, kind, store, lowIsSignal) {
    const rows = Object.keys(values).map(function (k) {
      return { label: k, v: values[k], col: targets.indexOf(k) >= 0 ? "var(--warn)" : k === store ? "var(--accent)" : "var(--bar)", strong: targets.indexOf(k) >= 0 || k === store };
    }).sort(function (a, b) { return lowIsSignal ? a.v - b.v : b.v - a.v; });
    return bars(rows, kind, { labelW: 64 });
  }

  /* Mini chart with a pointer readout. c {key,title,value,sub,d,f,type,col,months,mon,shade} */
  function mini(c) {
    const W = 300, H = 86, T = 8, B = 16, n = c.d.length, bw = W / n;
    let s = "";
    if (c.type === "line") {
      const lo = Math.min.apply(null, c.d) * 0.95, hi = Math.max.apply(null, c.d) * 1.02;
      const y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); }, x = function (i) { return bw * i + bw / 2; };
      s += '<rect x="' + (bw * (n - 12)).toFixed(1) + '" y="' + T + '" width="' + (bw * 12).toFixed(1) + '" height="' + (H - T - B) + '" fill="var(--accent-soft)"/>';
      s += '<path d="' + c.d.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join("") + '" fill="none" stroke="' + c.col + '" stroke-width="1.8" stroke-linejoin="round"/>';
    } else {
      const lo = 97, hi = 103, clamp = function (v) { return Math.min(Math.max(v, lo), hi); };
      const y = function (v) { return T + (H - T - B) * (1 - (clamp(v) - lo) / (hi - lo)); }, y0 = y(100);
      s += c.d.map(function (v, i) {
        return '<rect x="' + (bw * i + 1).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" y="' + Math.min(y(v), y0).toFixed(1) + '" height="' + Math.max(Math.abs(y(v) - y0), 1).toFixed(1) +
          '" fill="' + (v >= 100 ? "var(--accent)" : "var(--warn)") + '" opacity="' + (i >= n - 12 ? 1 : 0.55) + '"/>';
      }).join("");
      s += '<line x1="0" x2="' + W + '" y1="' + y0 + '" y2="' + y0 + '" stroke="var(--fg)" stroke-width="1" stroke-dasharray="3 3"/><text x="' + (W - 2) + '" y="' + (y0 - 3) + '" text-anchor="end">100%</text>';
    }
    s += '<line class="cur" x1="-10" x2="-10" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--fg)" stroke-width="1" opacity=".6"/>';
    s += '<text x="0" y="' + (H - 3) + '">' + esc(c.mon(c.months[0])) + '</text><text x="' + W + '" y="' + (H - 3) + '" text-anchor="end">' + esc(c.mon(c.months[n - 1])) + "</text>";
    return '<div class="mini" data-x="' + c.key + '"><h3 class="xb">' + esc(c.title) + '</h3><div class="v">' + c.value + '</div><div class="s">' + esc(c.sub) +
      '</div><svg viewBox="0 0 ' + W + " " + H + '" data-k="' + c.key + '" aria-hidden="true">' + s + '</svg><div class="read">Point at the chart for a month\'s value</div></div>';
  }
  function bindMinis(scope, list) {
    scope.querySelectorAll(".mini svg").forEach(function (svg) {
      const c = list.find(function (m) { return m.key === svg.dataset.k; }), read = svg.nextElementSibling, cur = svg.querySelector(".cur"), n = c.d.length;
      svg.addEventListener("pointermove", function (e) {
        const r = svg.getBoundingClientRect(), i = Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * n))), x = (i + 0.5) * 300 / n;
        cur.setAttribute("x1", x); cur.setAttribute("x2", x); read.textContent = c.mon(c.months[i]) + ": " + c.f(c.d[i]);
      });
      svg.addEventListener("pointerleave", function () { cur.setAttribute("x1", -10); cur.setAttribute("x2", -10); read.textContent = "Point at the chart for a month's value"; });
    });
  }

  /* Funnel by store: declined, followed up, recovered, nested on one count scale (P3) */
  function funnel(rows, target, store) {
    const W = 320, L = 56, R = 74, bh = 18, gap = 12, H = rows.length * (bh + gap) + 2;
    const max = Math.max.apply(null, rows.map(function (r) { return r.declined; })) * 1.02;
    const x = function (v) { return (W - L - R) * v / max; };
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">';
    rows.forEach(function (r, i) {
      const y = 2 + i * (bh + gap), strong = r.location_id === target || r.location_id === store;
      s += '<text x="0" y="' + (y + 13) + '" class="' + (strong ? "t" : "") + '">' + esc(r.location_id) + "</text>";
      s += '<rect x="' + L + '" y="' + y + '" width="' + x(r.declined).toFixed(1) + '" height="' + bh + '" rx="2" fill="var(--bar)" opacity=".35"/>';
      s += '<rect x="' + L + '" y="' + (y + 3) + '" width="' + x(r.followed_up).toFixed(1) + '" height="' + (bh - 6) + '" rx="1" fill="var(--accent)"/>';
      s += '<rect x="' + L + '" y="' + (y + 6) + '" width="' + Math.max(x(r.recovered), 1).toFixed(1) + '" height="' + (bh - 12) + '" fill="' + (r.location_id === target ? "var(--warn)" : "var(--fg)") + '"/>';
      s += '<text x="' + (L + x(r.declined) + 5).toFixed(1) + '" y="' + (y + 13) + '" class="t">' + fmt(r.recovered / r.declined, "pct1") + " back</text>";
    });
    return s + "</svg>";
  }

  /* Distribution with a policy line. bins [{label, n}], line index (the line is drawn after bin[line-1]) */
  function hist(bins, line, lineLabel) {
    const W = 320, H = 150, T = 18, B = 34, L = 4, n = bins.length, bw = (W - L) / n;
    const max = Math.max.apply(null, bins.map(function (b) { return b.n; })) || 1;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">';
    bins.forEach(function (b, i) {
      const h = (H - T - B) * b.n / max, x = L + i * bw;
      s += '<rect x="' + (x + 2).toFixed(1) + '" y="' + (H - B - h).toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + Math.max(h, b.n ? 1 : 0).toFixed(1) + '" rx="1" fill="' + (i >= line ? "var(--warn)" : "var(--accent)") + '"/>';
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - B + 12) + '" text-anchor="middle">' + esc(b.label) + "</text>";
    });
    const lx = L + line * bw;
    s += '<line x1="' + lx + '" x2="' + lx + '" y1="' + (T - 6) + '" y2="' + (H - B) + '" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    s += '<text x="' + (lx + 4) + '" y="' + (T - 6) + '" class="t">' + esc(lineLabel) + "</text>";
    s += '<text x="' + (W / 2) + '" y="' + (H - 4) + '" text-anchor="middle">minutes to first response</text>';
    return s + "</svg>";
  }

  /* Per-store distribution of days with a policy line (P6). data {store: {day: n}}, maxDay, line */
  function strips(data, maxDay, line, target, store) {
    const keys = Object.keys(data).sort(), W = 320, L = 56, R = 8, rh = 22, H = keys.length * rh + 22;
    const x = function (d) { return L + (W - L - R) * d / maxDay; }, cw = (W - L - R) / maxDay;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">';
    keys.forEach(function (k, i) {
      const y = 4 + i * rh, row = data[k], tot = Object.keys(row).reduce(function (a, d) { return a + row[d]; }, 0);
      const peak = Math.max.apply(null, Object.keys(row).map(function (d) { return row[d]; }));
      s += '<text x="0" y="' + (y + 13) + '" class="' + (k === target || k === store ? "t" : "") + '">' + esc(k) + "</text>";
      Object.keys(row).forEach(function (d) {
        const h = (rh - 6) * row[d] / peak;
        s += '<rect x="' + x(+d).toFixed(1) + '" y="' + (y + rh - 6 - h).toFixed(1) + '" width="' + Math.max(cw - 1, 1).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + (+d > line ? "var(--warn)" : k === store ? "var(--accent)" : "var(--bar)") + '"/>';
      });
      s += "<title>" + esc(k + ": " + tot + " funded cases") + "</title>";
    });
    const lx = x(line + 0.5);
    s += '<line x1="' + lx.toFixed(1) + '" x2="' + lx.toFixed(1) + '" y1="0" y2="' + (H - 18) + '" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    [0, 6, 12, 18, 24].filter(function (d) { return d <= maxDay; }).forEach(function (d) { s += '<text x="' + x(d + 0.5).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle">' + d + "</text>"; });
    return s + "</svg>";
  }

  /* Table fallback: headers [..], rows [[..]] already formatted; numeric columns by index */
  function table(headers, rows, numeric) {
    numeric = numeric || [];
    return '<div class="tablewrap"><table><thead><tr>' + headers.map(function (h, i) { return '<th class="' + (numeric.indexOf(i) >= 0 ? "n" : "") + '">' + esc(h) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c, i) { return '<td class="' + (numeric.indexOf(i) >= 0 ? "n" : "") + '">' + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }

  window.Charts = { bars: bars, versus: versus, ranked: ranked, mini: mini, bindMinis: bindMinis, funnel: funnel, hist: hist, strips: strips, table: table };
})();
