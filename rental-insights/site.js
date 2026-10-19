// Rental Insights static site: shared helpers and three single-series chart forms (line, bars,
// histogram) drawn as inline SVG from site/data/*.json. No libraries, no network calls beyond
// the page's own JSON files.
const fmt = {
  usd: (v) => "$" + Math.round(v).toLocaleString("en-US"),
  pct: (v, d = 1) => (v * 100).toFixed(d) + "%",
  signedPct: (v, d = 1) => (v >= 0 ? "+" : "") + (v * 100).toFixed(d) + "%",
  ratio: (v) => v.toFixed(2),
  int: (v) => Math.round(v).toLocaleString("en-US"),
  month: (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
};

async function loadJSON(name) {
  const res = await fetch("data/" + name);
  if (!res.ok) throw new Error(name + ": HTTP " + res.status);
  return res.json();
}

function el(tag, attrs = {}, text) {
  const svgTags = ["svg", "g", "line", "rect", "path", "circle", "text"];
  const n = svgTags.includes(tag) ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
}

async function setupFooter() {
  const f = document.getElementById("asof");
  if (!f) return;
  try {
    const m = await loadJSON("meta.json");
    f.textContent = `Data exported ${m.exported_at.slice(0, 10)} from gold tables built ${m.gold_as_of.fct_cbsa_affordability.slice(0, 10)}. Sources: ${m.sources}.`;
  } catch (e) { f.textContent = "Data export date unavailable."; }
}

function tile(container, label, value, note) {
  const t = el("div", { class: "tile" });
  t.append(el("div", { class: "label" }, label), el("div", { class: "value" }, value));
  if (note) t.append(el("div", { class: "note" }, note));
  container.append(t);
}

function table(container, columns, rows, caption) {
  const d = el("details");
  d.append(el("summary", {}, caption || "Show the numbers as a table"));
  const wrap = el("div", { class: "table-scroll" });
  const t = el("table");
  const head = el("tr");
  columns.forEach((c) => head.append(el("th", { scope: "col", class: c.num ? "num" : "" }, c.label)));
  const thead = el("thead");
  thead.append(head);
  t.append(thead);
  const body = el("tbody");
  rows.forEach((r) => {
    const tr = el("tr");
    columns.forEach((c) => tr.append(el("td", { class: c.num ? "num" : "" }, c.fmt ? c.fmt(r[c.key]) : r[c.key])));
    body.append(tr);
  });
  t.append(body);
  wrap.append(t);
  d.append(wrap);
  container.append(d);
}

function tooltip(chart) {
  const tip = el("div", { class: "tip", role: "status" });
  chart.append(tip);
  return {
    show(html, x, y) {
      tip.innerHTML = html;
      tip.style.display = "block";
      const w = chart.clientWidth, tw = tip.offsetWidth;
      tip.style.left = Math.min(Math.max(0, x - tw / 2), w - tw) + "px";
      tip.style.top = Math.max(0, y - tip.offsetHeight - 12) + "px";
    },
    hide() { tip.style.display = "none"; },
  };
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p / 0.5) * 0.5 * p;
}

// Line chart with a crosshair and tooltip. points: [{x: Date, y: number, label: string}]
function lineChart(container, points, { yFmt, height = 280, ariaLabel }) {
  const chart = el("div", { class: "chart" });
  container.append(chart);
  // Draw at the container's real width so 12px text stays 12px on a phone.
  const W = Math.max(320, chart.clientWidth || 960), H = height, m = { t: 12, r: 16, b: 28, l: 56 };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": ariaLabel });
  chart.append(svg);
  const xs = points.map((p) => +p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const yMax = niceMax(Math.max(...points.map((p) => p.y))), yMin = 0;
  const X = (v) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
  const Y = (v) => H - m.b - ((v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const grid = el("g", { class: "grid" });
  for (let i = 0; i <= 4; i++) {
    const v = yMin + ((yMax - yMin) * i) / 4;
    grid.append(el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
    grid.append(el("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end" }, yFmt(v)));
  }
  svg.append(grid);
  const years = [...new Set(points.map((p) => p.x.getUTCFullYear()))];
  years.filter((yr, i) => i % 2 === 0 || years.length < 8).forEach((yr) => {
    const d = Date.UTC(yr, 0, 31);
    if (d >= x0 && d <= x1) svg.append(el("text", { x: X(d), y: H - 8, "text-anchor": "middle" }, String(yr)));
  });
  svg.append(el("path", { class: "line", d: points.map((p, i) => (i ? "L" : "M") + X(+p.x) + " " + Y(p.y)).join(" ") }));
  const last = points[points.length - 1];
  svg.append(el("circle", { class: "dot", cx: X(+last.x), cy: Y(last.y), r: 4 }));
  const cross = el("line", { class: "cross", y1: m.t, y2: H - m.b, visibility: "hidden" });
  const hot = el("circle", { class: "dot", r: 5, visibility: "hidden" });
  svg.append(cross, hot);
  const tip = tooltip(chart);
  const hit = el("rect", { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: "transparent" });
  svg.append(hit);
  const move = (evt) => {
    const r = svg.getBoundingClientRect();
    const sx = ((evt.clientX - r.left) / r.width) * W;
    const t = x0 + ((sx - m.l) / (W - m.l - m.r)) * (x1 - x0);
    let best = points[0];
    for (const p of points) if (Math.abs(+p.x - t) < Math.abs(+best.x - t)) best = p;
    const px = X(+best.x), py = Y(best.y);
    cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("visibility", "visible");
    hot.setAttribute("cx", px); hot.setAttribute("cy", py); hot.setAttribute("visibility", "visible");
    tip.show(`${best.label}<br><b>${yFmt(best.y)}</b>`, (px / W) * r.width, (py / H) * r.height);
  };
  hit.addEventListener("pointermove", move);
  hit.addEventListener("pointerleave", () => { tip.hide(); cross.setAttribute("visibility", "hidden"); hot.setAttribute("visibility", "hidden"); });
}

// Horizontal bars, one series, sorted by the caller. rows: [{label, value, tip}]
function barChart(container, rows, { xFmt, xMax, ref, ariaLabel }) {
  const chart = el("div", { class: "chart" });
  container.append(chart);
  // Label margin fits the longest label (about 7px per character at 12px), capped at 44 characters.
  const W = Math.max(320, chart.clientWidth || 960);
  const maxChars = Math.min(44, Math.floor((W * 0.4) / 7));
  const longest = Math.min(maxChars, Math.max(...rows.map((r) => r.label.length)));
  const rowH = 26, gap = 2, m = { t: 8, r: 48, b: 24, l: Math.max(40, longest * 7 + 16) };
  const H = m.t + m.b + rows.length * rowH;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": ariaLabel });
  chart.append(svg);
  const max = xMax || niceMax(Math.max(...rows.map((r) => r.value)));
  const X = (v) => m.l + (v / max) * (W - m.l - m.r);
  const grid = el("g", { class: "grid" });
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    grid.append(el("line", { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b }));
    grid.append(el("text", { x: X(v), y: H - 6, "text-anchor": "middle" }, xFmt(v)));
  }
  svg.append(grid);
  const tip = tooltip(chart);
  rows.forEach((r, i) => {
    const y = m.t + i * rowH;
    svg.append(el("text", { x: m.l - 8, y: y + rowH / 2 + 4, "text-anchor": "end" }, r.label.length > maxChars ? r.label.slice(0, maxChars - 1) + "…" : r.label));
    const w = Math.max(0, X(r.value) - m.l);
    const bar = el("path", { class: "mark", d: roundedRight(m.l, y + gap, w, rowH - 2 * gap - 4, 4) });
    svg.append(bar);
    if (i < 3 || i === rows.length - 1) svg.append(el("text", { x: X(r.value) + 6, y: y + rowH / 2 + 2 }, xFmt(r.value)));
    const hit = el("rect", { x: 0, y, width: W, height: rowH, fill: "transparent" });
    hit.addEventListener("pointerenter", () => {
      bar.classList.add("hot");
      const s = svg.getBoundingClientRect();
      tip.show(r.tip, (X(r.value) / W) * s.width, ((y + 4) / H) * s.height);
    });
    hit.addEventListener("pointerleave", () => { bar.classList.remove("hot"); tip.hide(); });
    svg.append(hit);
  });
  // Reference line drawn last so it stays visible over the bars; CSS lets the pointer pass through it.
  if (ref !== undefined) {
    const line = el("line", { class: "ref", x1: X(ref), x2: X(ref), y1: m.t, y2: H - m.b });
    svg.append(line);
  }
}

// Vertical bins, one series. bins: [{label, value, tip}]
function histogram(container, bins, { yFmt, refIndex, refLabel, ariaLabel, height = 260 }) {
  const chart = el("div", { class: "chart" });
  container.append(chart);
  const W = Math.max(320, chart.clientWidth || 960), H = height, m = { t: 20, r: 16, b: 28, l: 48 };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": ariaLabel });
  chart.append(svg);
  const max = niceMax(Math.max(...bins.map((b) => b.value)));
  const bw = (W - m.l - m.r) / bins.length;
  const Y = (v) => H - m.b - (v / max) * (H - m.t - m.b);
  const grid = el("g", { class: "grid" });
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    grid.append(el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
    grid.append(el("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end" }, yFmt(v)));
  }
  svg.append(grid);
  const tip = tooltip(chart);
  bins.forEach((b, i) => {
    const x = m.l + i * bw;
    const bar = el("path", { class: "mark", d: roundedTop(x + 1, Y(b.value), bw - 2, H - m.b - Y(b.value), 4) });
    svg.append(bar, el("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle" }, b.label));
    const hit = el("rect", { x, y: m.t, width: bw, height: H - m.t - m.b, fill: "transparent" });
    hit.addEventListener("pointerenter", () => {
      bar.classList.add("hot");
      const s = svg.getBoundingClientRect();
      tip.show(b.tip, ((x + bw / 2) / W) * s.width, (Y(b.value) / H) * s.height);
    });
    hit.addEventListener("pointerleave", () => { bar.classList.remove("hot"); tip.hide(); });
    svg.append(hit);
  });
  if (refIndex !== undefined) {
    const rx = m.l + refIndex * bw;
    svg.append(el("line", { class: "ref", x1: rx, x2: rx, y1: m.t - 8, y2: H - m.b }));
    svg.append(el("text", { x: rx + 6, y: m.t - 2 }, refLabel));
  }
}

function roundedRight(x, y, w, h, r) {
  r = Math.min(r, w, h / 2);
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
}
function roundedTop(x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function fail(container, err) {
  const fetchFailed = err instanceof TypeError && /fetch/i.test(err.message) || /HTTP \d+/.test(err.message);
  container.append(el("p", { class: "error" }, fetchFailed
    ? "The data for this page could not be loaded. If you opened the file directly, serve the folder instead (python -m http.server in site/)."
    : "Part of this page failed to draw. The numbers are in the data files under data/."));
  console.error(err);
}

setupFooter();
