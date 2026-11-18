/* P0 Start here: forecasts with live math, trace one record, proof test planner (Patrick's pick 2026-11-18).
   Every input comes from the page data: forecast.json (docs/design/roi_forecast.py constants and outputs), trace.json, signals.json.
   build_site.py recomputes the defaults with these formulas and fails the build if they differ from roi_forecast.py. */
(function () {
  "use strict";
  const S = window.S, D = S.D, $ = S.$, fmt = S.fmt, esc = S.esc;
  const I = D.forecast.inputs, Z = D.forecast.z;
  const IN06 = I.IN_06, FO13 = I.FO_13, FO16 = I.FO_16, FO17 = I.FO_17, LINKED = I.RECOVERY_EVENTS, AVG0 = FO17 / LINKED;
  const WEEKS = I.WEEKS_IN_WINDOW, STORES = I.STORES, PSW = FO13 / STORES / WEEKS;
  const hasD3 = typeof window.d3 !== "undefined";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const usd = function (v, d) { return fmt(v, d === 0 ? "usd0" : "usd2"); };
  const num = function (v, d) { return Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d === undefined ? 1 : d, maximumFractionDigits: d === undefined ? 1 : d }); };
  if (!hasD3) $("nod3").hidden = false;
  /* Small D3 parts (G4): linear scales and short transitions; plain SVG attributes when D3 is missing or motion is reduced */
  const scale = function (max, w) { return hasD3 ? window.d3.scaleLinear().domain([0, max]).range([0, w]) : function (v) { return v / max * w; }; };
  function setA(el, a, v) { if (hasD3 && !still) window.d3.select(el).transition().duration(260).attr(a, v); else el.setAttribute(a, v); }
  const NS = "http://www.w3.org/2000/svg";
  function el(p, tag, a) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); p.append(e); return e; }

  /* F1 floorplan interest over a year */
  const f1svg = $("viz-f1"), f1x = scale(IN06 * 365 * 1.25, 190), L = 118;
  el(f1svg, "text", { x: 0, y: 20, class: "t" }).textContent = "Today's level";
  el(f1svg, "text", { x: 0, y: 52, class: "t" }).textContent = "Chosen level";
  const f1a = el(f1svg, "rect", { x: L, y: 7, height: 18, rx: 2, fill: "var(--bar)", width: 1 });
  const f1b = el(f1svg, "rect", { x: L, y: 39, height: 18, rx: 2, fill: "var(--fc)", width: 1 });
  const f1at = el(f1svg, "text", { y: 20, class: "t" }), f1bt = el(f1svg, "text", { y: 52, class: "t" });
  function f1() {
    const s = +$("s-stock").value / 100, base = IN06 * 365, val = IN06 * (1 + s) * 365, pct = (s > 0 ? "+" : "") + Math.round(s * 100) + "%";
    $("o-stock").textContent = pct;
    $("v-f1").innerHTML = usd(val) + "<small>a year</small>";
    setA(f1a, "width", Math.max(f1x(base), 1)); setA(f1b, "width", Math.max(f1x(val), 1));
    f1at.textContent = fmt(base, "usdc"); f1bt.textContent = fmt(val, "usdc");
    setA(f1at, "x", L + f1x(base) + 5); setA(f1bt, "x", L + f1x(val) + 5);
    $("m-f1").innerHTML = usd(IN06) + " a day × " + num(1 + s, 2) + " (stock " + pct + ") × 365 days<br>= <b>" + usd(val) + " a year</b><br>Change from today's level: <b>" + usd(val - base) + "</b>";
  }

  /* F2 declined service work recovered */
  const f2svg = $("viz-f2"), f2max = FO17 + FO13 * 0.20 * 450, f2x = scale(f2max, 300);
  el(f2svg, "rect", { x: 0, y: 6, height: 22, rx: 2, fill: "var(--accent)", width: f2x(FO17) });
  const f2b = el(f2svg, "rect", { x: f2x(FO17), y: 6, height: 22, fill: "var(--fc)", width: 1 });
  const f2t = el(f2svg, "text", { x: 0, y: 48, class: "t" });
  let avgExact = AVG0; // the measured average to the cent, until the reader moves the slider
  $("asm-f2").innerHTML = ["New recoveries earn what past ones did: " + usd(FO17) + " over " + fmt(LINKED, "int") + " linked lines.",
    "The rise applies to the same " + fmt(FO13, "int") + " declined recommendations.",
    "Associated, not incremental: some of this work might have come back anyway."].map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  function f2() {
    const pts = +$("s-pts").value, avg = avgExact, extra = FO13 * pts / 100, add = extra * avg;
    $("o-pts").textContent = pts + " points"; $("o-avg").textContent = usd(avg);
    $("v-f2").innerHTML = usd(add) + "<small>more associated gross</small>";
    setA(f2b, "width", Math.max(f2x(add), 1));
    f2t.textContent = "Total " + usd(FO17 + add, 0) + ", of which " + usd(add, 0) + " is forecast";
    $("m-f2").innerHTML = fmt(FO13, "int") + " declined × " + pts + " points = " + num(extra) + " more recoveries<br>× " + usd(avg) + " gross per recovered line<br>= <b>" + usd(add) +
      "</b> more associated gross<br>Recovery rate: " + num(FO16 * 100) + "% → <b>" + num(FO16 * 100 + pts) + "%</b>";
  }
  $("s-stock").addEventListener("input", f1);
  $("s-pts").addEventListener("input", f2);
  $("s-avg").addEventListener("input", function () { avgExact = +$("s-avg").value; f2(); });
  $("r-f2").addEventListener("click", function () { avgExact = AVG0; $("s-avg").value = AVG0.toFixed(2); f2(); });
  $("s-avg").value = AVG0.toFixed(2);
  f1(); f2();

  /* Trace one record: the line export_site_data.py picks with trace_record.py's rule; check 4 proves it is one of the FO-17 lines */
  const T = D.trace, R = T.recommendation, LN = T.line, LK = T.linked;
  const day = function (iso) { return new Date(iso.slice(0, 10) + "T00:00:00Z"); };
  const recovered = T.stg_events.find(function (e) { return e.event_type === "Completed - Recovered Work"; }) || T.events[0];
  const declinedAt = (T.stg_events.find(function (e) { return /declin/i.test(e.event_type); }) || { event_timestamp: R.presented_date }).event_timestamp;
  const lag = Math.round((day(recovered.event_timestamp) - day(declinedAt)) / 864e5);
  const kv = function (pairs) { return '<dl class="kv">' + pairs.map(function (p) { return "<dt>" + esc(p[0]) + "</dt><dd>" + esc(p[1]) + "</dd>"; }).join("") + "</dl>"; };
  const when = function (iso) { return iso.replace("T", " ").slice(0, 16); };
  const lineGross = LN.labor_sales - LN.labor_cost + LN.parts_sales - LN.parts_cost;
  const TRACE = [
    { s: "The headline total", t: "Power BI measure FO-17 · mart.kpi_value", h: usd(T.fo17_gross) + " recovered work gross (associated)",
      b: "<p>The sum of gross profit on every repair line that a recovered-work event links back to a declined recommendation. " + fmt(T.fo17_lines, "int") + " lines make it up.</p>" +
        kv([["Rule", "labor sales − labor cost + parts sales − parts cost, on each linked line"], ["Lines", fmt(T.fo17_lines, "int")], ["Average", usd(T.fo17_gross / T.fo17_lines) + " a line"]]) },
    { s: "One of the " + fmt(T.fo17_lines, "int") + " lines", t: "mart.app_service_recovery_linked", h: R.recommendation_id + " at " + LK.location_id + ": " + usd(LK.recovered_line_gross),
      b: "<p>The mart view keeps one row per recovered line, with the store and the recommendation it came from.</p>" +
        kv([["Recommendation", R.recommendation_id], ["Store", LK.location_id], ["Recovered on", LK.linked_repair_order_id + ", line " + LK.linked_ro_line_id], ["Line gross", usd(LK.recovered_line_gross)]]) },
    { s: "The repair order line", t: "core.fact_repair_order_line", h: LN.operation_description + (T.ro && T.ro.close_timestamp ? ", closed " + T.ro.close_timestamp.slice(0, 10) : ""),
      b: kv([["Line", LN.repair_order_line_id + " on " + LN.repair_order_id + " (" + LN.line_category + ")"], ["Labor sales", usd(LN.labor_sales)], ["Labor cost", usd(-LN.labor_cost)],
        ["Parts", usd(LN.parts_sales) + " sales, " + usd(LN.parts_cost) + " cost"], ["Gross", usd(lineGross)]]) },
    { s: "The events that link them", t: "stg.recommendation_event_history", h: "Declined, followed up, recovered " + lag + " days later",
      b: '<ol class="tl">' + T.stg_events.map(function (e) {
        const hit = e.event_type === "Completed - Recovered Work";
        return "<li><time>" + esc(when(e.event_timestamp)) + '</time><span class="' + (hit ? "hit" : "") + '">' + esc(e.event_type + ": " + e.outcome_result) + "</span></li>";
      }).join("") + "</ol>" },
    { s: "The original recommendation", t: "core.fact_service_recommendation", h: R.recommendation_id + ": advisor estimate " + usd(R.estimated_gross_opportunity),
      b: kv([["Work", R.recommended_operation], ["Urgency", R.urgency_category], ["Decline reason", R.decline_reason || "not recorded"], ["Estimated price", usd(R.estimated_total_price)],
        ["Estimated cost", usd(R.estimated_total_cost)], ["Estimated gross", usd(R.estimated_gross_opportunity) + " (advisor estimate)"]]) +
        '<p class="muted" style="font-size:.85rem">The estimate (' + usd(R.estimated_gross_opportunity) + ") and the gross actually earned (" + usd(lineGross) +
        ") differ. That is why declined work is shown as an estimate and recovered work as a separate, measured figure.</p>" },
    { s: "The raw files", t: "raw → stg → core", h: "Three source files, loaded and checked",
      b: kv([["Recommendation", "service_recommendations.csv"], ["Events", "recommendation_event_history.csv"], ["Repair line", "repair_order_lines.csv"]]) +
        '<p class="muted" style="font-size:.85rem">Each file is loaded as text into raw, typed and cleaned in stg, and joined on its keys in core. Every recovery event links to a repair line that exists, which a check enforces.</p>' }];
  let ti = 0;
  function trace() {
    $("tsteps").innerHTML = TRACE.map(function (r, i) {
      return '<li class="' + (i === ti ? "on" : "") + '"><button type="button" data-i="' + i + '" ' + (i === ti ? 'aria-current="step"' : "") + "><b>" + esc(r.s) + "</b><code>" + esc(r.t) + "</code></button></li>";
    }).join("");
    const r = TRACE[ti];
    $("tdetail").innerHTML = '<code class="tbl">' + esc(r.t) + "</code><h3>" + esc(r.h) + "</h3>" + r.b + '<div class="tnav">' +
      (ti > 0 ? '<button type="button" class="sbtn" data-go="-1">↑ Back up a layer</button>' : "") +
      (ti < TRACE.length - 1 ? '<button type="button" class="sbtn" data-go="1">↓ Go down a layer</button>' : "") + "</div>";
  }
  $("tsteps").addEventListener("click", function (e) { const b = e.target.closest("button[data-i]"); if (!b) return; ti = +b.dataset.i; trace(); $("tsteps").querySelector('[data-i="' + ti + '"]').focus(); });
  $("tdetail").addEventListener("click", function (e) {
    const b = e.target.closest("[data-go]"); if (!b) return;
    ti += +b.dataset.go; trace();
    const n = $("tdetail").querySelector('[data-go="' + b.dataset.go + '"]') || $("tdetail").querySelector("[data-go]");
    if (n) n.focus();
  });
  trace();

  /* Proof test planner: smallest detectable rise, two-proportion test (same formula as roi_forecast.py F3) */
  const fix01 = D.signals.scenarios.find(function (s) { return s.scenario_id === "SCN-FIX-01"; });
  $("asm-p").innerHTML = ["Declined work arrives evenly across the " + STORES + " stores and the " + Math.round(WEEKS) + " weeks of data (" + fmt(FO13, "int") + " lines).",
    "Each declined line is treated as independent. Stores differ from each other, which makes the real number larger, so read this as the best case.",
    "Recoveries land weeks after the decline (" + lag + " days in the traced record), so keep counting after the test ends.",
    "5% significance, 80% power, starting from today's " + num(FO16 * 100) + "% recovery rate."].map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  const HOLD = new Set(["LOC-01", "LOC-07"]);
  const mdeSvg = $("viz-mde"), mx = scale(25, 300);
  el(mdeSvg, "rect", { x: 0, y: 14, width: 300, height: 16, rx: 2, fill: "var(--accent-soft)" });
  const zone = el(mdeSvg, "rect", { x: 0, y: 14, height: 16, rx: 2, fill: "var(--warn)", opacity: 0.35, width: 1 });
  const goal = el(mdeSvg, "rect", { y: 8, width: 3, height: 28, fill: "var(--fg)", x: 0 }), goalT = el(mdeSvg, "text", { y: 50, class: "t" });
  [0, 5, 10, 15, 20, 25].forEach(function (v) { el(mdeSvg, "text", { x: Math.min(mx(v), 292), y: 62 }).textContent = v; });
  el(mdeSvg, "text", { x: 0, y: 9 }).textContent = "Too small to detect";
  function stores() {
    $("stores").innerHTML = S.STORES.map(function (s) { const h = HOLD.has(s); return '<button type="button" data-s="' + s + '" aria-pressed="' + h + '">' + s + "<small>" + (h ? "Holdout" : "Uses the queue") + "</small></button>"; }).join("");
  }
  $("stores").addEventListener("click", function (e) {
    const b = e.target.closest("button[data-s]"); if (!b) return;
    const s = b.dataset.s; if (HOLD.has(s)) HOLD.delete(s); else HOLD.add(s);
    stores(); plan(); $("stores").querySelector('[data-s="' + s + '"]').focus();
  });
  function plan() {
    const wk = +$("s-wk").value, g = +$("s-goal").value, h = HOLD.size, t = STORES - h, v = $("verdict");
    $("o-wk").textContent = wk + " weeks"; $("o-goal").textContent = g + " points";
    if (!h || !t) {
      $("v-mde").textContent = "No test"; v.className = "verdict err";
      v.textContent = !h ? "Pick at least one holdout store: without one there is nothing to compare against." : "Leave at least one store using the queue: otherwise nothing is being tested.";
      $("m-mde").innerHTML = ""; setA(zone, "width", 1); return;
    }
    const nh = h * PSW * wk, nt = t * PSW * wk, m = Z * Math.sqrt(FO16 * (1 - FO16) * (1 / nt + 1 / nh)) * 100, need = Math.ceil(wk * Math.pow(m / g, 2));
    $("v-mde").textContent = num(m) + " points";
    setA(zone, "width", mx(Math.min(m, 25))); setA(goal, "x", Math.min(mx(g), 297));
    goalT.textContent = "Hoped-for rise: " + g; setA(goalT, "x", Math.min(Math.max(mx(g) - 50, 0), 200));
    const loc5 = HOLD.has("LOC-05") && fix01 ? " LOC-05 is the store with the biggest follow-up gap (" + fmt(fix01.target_value, "pct1") + " of its declined work never followed up, against " +
      fmt(fix01.peer_mean, "pct1") + " elsewhere), so holding it out keeps the queue from the store that needs it most." : "";
    if (g >= m) { v.className = "verdict"; v.textContent = "A " + g + "-point rise would likely show up in this test." + loc5; }
    else { v.className = "verdict miss"; v.textContent = "A " + g + "-point rise would likely be missed. With these stores the test needs about " + need + " weeks" + (need > WEEKS ? ", longer than the three years of data." : ".") + loc5; }
    $("m-mde").innerHTML = "Declined lines per store per week: " + fmt(FO13, "int") + " ÷ " + STORES + " ÷ " + Math.round(WEEKS) + " = " + num(PSW, 2) +
      "<br>Holdout stores: " + h + " × " + num(PSW, 2) + " × " + wk + " = " + num(nh) + " lines<br>Queue stores: " + t + " × " + num(PSW, 2) + " × " + wk + " = " + num(nt) +
      " lines<br>" + num(Z, 2) + " × √(" + num(FO16, 2) + " × " + num(1 - FO16, 2) + " × (1/" + num(nt) + " + 1/" + num(nh) + "))<br>= <b>" + num(m) + " points</b>";
  }
  $("s-wk").addEventListener("input", plan); $("s-goal").addEventListener("input", plan);
  stores(); plan();

  /* Tabs: arrow keys move between tabs (roving tabindex) */
  const tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
  function pick(t, focus) {
    tabs.forEach(function (x) { const on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; $(x.getAttribute("aria-controls")).hidden = !on; });
    t.parentElement.scrollLeft = t.offsetLeft - 8;
    if (focus) t.focus();
    if (window.Explain) window.Explain.hide();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { pick(t); });
    t.addEventListener("keydown", function (e) {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Home") pick(tabs[0], 1); else if (e.key === "End") pick(tabs[tabs.length - 1], 1); else if (d) pick(tabs[(i + d + tabs.length) % tabs.length], 1);
    });
  });
})();
