/* P1 Group overview: decisions from mart.scenario_signal and the DAX values, monthly minis from series.json, P&L impact.
   Ranking rule (Claude proposed 2026-11-18, for Patrick's review): the store's share of the group figure for its leak, which is
   unit-free, so leaks of different kinds are compared by concentration, never added or put on one dollar scale. */
(function () {
  "use strict";
  const S = window.S, D = S.D, $ = S.$, fmt = S.fmt, esc = S.esc, kv = S.kv;
  const SIG = {};
  D.signals.scenarios.forEach(function (s) { SIG[s.scenario_id] = s; });
  const KL = { est: "estimate", ms: "measured", "": "not measured" };
  const DEC = [
    { sid: "SCN-FIX-01", d: "Follow up declined service work", e: "Declined work with no follow-up or recovery", f: "pct1", money: "FO-14", mk: "est", mf: "usd2", ml: "declined work, 3 years", pg: "service.html", pn: "Service recovery" },
    { sid: "SCN-INV-02", d: "Reprice or wholesale aged, over-market stock", e: "Vehicles priced over 1.08 × market", f: "pct1", money: "IN-06", mk: "ms", mf: "usd2", per: " a day", ml: "floorplan interest, today", pg: "inventory.html", pn: "Inventory actions" },
    { sid: "SCN-FND-01", d: "Chase lender funding", e: "Funded deals that took over 12 days", f: "pct1", money: "FN-06", mk: "ms", mf: "usd2", ml: "waiting on lenders, today", pg: "funding.html", pn: "Deal funding" },
    { sid: "SCN-SLS-02", d: "Review deal pricing", e: "Front-end gross per deal (low is the signal)", f: "usd0", money: "EX-06", mk: "ms", mf: "usd2", ml: "front-end gross, group, 3 years", noShare: true, pg: "sales.html", pn: "Sales and leads" },
    { sid: "SCN-SLS-03", d: "Fix or stop campaign CMP-07", e: "Marketing spend per sale", f: "usd0", money: "SM-08", mk: "ms", mf: "usd2", ml: "marketing spend, group, 3 years", noShare: true, peers: "other campaigns", pg: "sales.html", pn: "Sales and leads" },
    { sid: "SCN-FIX-03", d: "Cut service no-shows", e: "Service appointment no-show rate", f: "pct1", money: null, ml: "lost bays are not measured", pg: "service.html", pn: "Service recovery" },
    { sid: "SCN-LIF-01", d: "Book a first service for new buyers", e: "Retailed vehicles with no service visit within 183 days", f: "pct1", money: null, ml: "future service is not forecast", pg: "lifecycle.html", pn: "Customer lifecycle" }
  ].filter(function (r) { return SIG[r.sid] && SIG[r.sid].is_detected; }).map(function (r) {
    const s = SIG[r.sid];
    r.store = s.target; r.v = s.target_value; r.p = s.peer_mean;
    if (r.money && !r.noShare) { r.own = kv(r.money, r.store); r.grp = kv(r.money, "ALL"); r.share = r.own / r.grp; }
    return r;
  });
  DEC.sort(function (a, b) {
    const ka = a.share !== undefined ? 0 : a.money ? 1 : 2, kb = b.share !== undefined ? 0 : b.money ? 1 : 2;
    return ka - kb || (b.share || 0) - (a.share || 0);
  });
  function decisions() {
    const f = S.store();
    const rows = DEC.map(function (r, i) { return [r, i]; }).filter(function (x) { return f === "ALL" || x[0].store === f; });
    $("dlist").innerHTML = rows.length ? rows.map(function (x) {
      const r = x[0], i = x[1];
      let money;
      if (r.share !== undefined) money = '<span class="kind ' + r.mk + '">' + KL[r.mk] + '</span><span class="v">' + fmt(r.own, r.mf) + (r.per || "") + '</span><span class="muted" style="font-size:.75rem">' +
        fmt(r.share, "pct1") + " of the group's " + fmt(r.grp, r.mf) + (r.per || "") + " (" + esc(r.ml) + ")</span>";
      else if (r.money) money = '<span class="kind ' + r.mk + '">' + KL[r.mk] + '</span><span class="v">' + fmt(kv(r.money, "ALL"), r.mf) + '</span><span class="muted" style="font-size:.75rem">' + esc(r.ml) + "</span>";
      else money = '<span class="kind">not measured</span><span class="v">No dollar figure</span><span class="muted" style="font-size:.75rem">' + esc(r.ml) + "</span>";
      return '<li><span class="rk">' + (i + 1) + '</span><span class="what"><b>' + esc(r.d) + '</b><span class="store">' + esc(r.store) + '</span></span><span class="evd">' + esc(r.e) + ': <span class="cmp">' +
        fmt(r.v, r.f) + '</span> against <span class="cmp">' + fmt(r.p, r.f) + "</span> " + (r.peers ? "for " + r.peers + " (mean)" : "at the other 7 (mean)") + '</span><span class="money">' + money +
        '</span><a class="go" href="' + r.pg + (r.store.indexOf("LOC") === 0 ? "?store=" + r.store : "") + '">' + esc(r.pn) + " →</a></li>";
    }).join("") : '<li><span class="empty">No decision points at ' + esc(f) + ". It does not stand apart from the other stores on any check; its figures are on each report page.</span></li>";
  }

  /* Monthly group series (series.json; check 4 ties the totals to EX-15, EX-16 and EX-18) */
  const SE = D.series, M = SE.months, ATT = SE.revenue.map(function (v, i) { return v / SE.budget[i] * 100; });
  const sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  const last = function (a) { return a.slice(-12); };
  const mon = function (m) { return new Date(m + "-01T00:00:00Z").toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }); };
  const att12 = sum(last(SE.revenue)) / sum(last(SE.budget)), attAll = sum(SE.revenue) / sum(SE.budget);
  const MINI = [
    { key: "m:EX-15", title: "Revenue as booked", value: fmt(sum(last(SE.revenue)), "usdc"), sub: "last 12 months · 3 years " + fmt(sum(SE.revenue), "usdc"), d: SE.revenue, f: function (v) { return fmt(v, "usdc"); }, type: "line", col: "var(--accent)", months: M, mon: mon },
    { key: "m:EX-16", title: "Gross profit as booked", value: fmt(sum(last(SE.gross)), "usdc"), sub: "last 12 months · 3 years " + fmt(sum(SE.gross), "usdc"), d: SE.gross, f: function (v) { return fmt(v, "usdc"); }, type: "line", col: "var(--accent)", months: M, mon: mon },
    { key: "m:EX-18", title: "Revenue against budget", value: fmt(att12, "pct1"), sub: "last 12 months · 3 years " + fmt(attAll, "pct1"), d: ATT, f: function (v) { return v.toFixed(1) + "%"; }, type: "bar", col: "var(--bar)", months: M, mon: mon }];
  $("minis").innerHTML = MINI.map(window.Charts.mini).join("");
  window.Charts.bindMinis($("minis"), MINI);
  document.querySelector("#mtable tbody").innerHTML = M.map(function (m, i) {
    return "<tr><td>" + mon(m) + '</td><td class="n">' + fmt(SE.revenue[i], "usd0") + '</td><td class="n">' + fmt(SE.gross[i], "usd0") + '</td><td class="n">' + fmt(SE.budget[i], "usd0") + '</td><td class="n">' + ATT[i].toFixed(1) + "%</td></tr>";
  }).join("");

  /* P&L as booked over the window (EX-15, EX-16, EX-17) with each leak pinned to the line it reduces */
  const sls02 = SIG["SCN-SLS-02"];
  const PL = [
    { l: "Revenue", sm: "billed to customers", v: kv("EX-15", "ALL"), leaks: [] },
    { l: "Gross profit", sm: "after cost of sales", v: kv("EX-16", "ALL"), leaks: [
      { key: "m:FO-14", n: "Declined service work", v: fmt(kv("FO-14", "ALL"), "usdc"), k: "est", p: "3 years" },
      { key: "m:IN-12", n: "Wholesale losses", v: fmt(kv("IN-12", "ALL"), "usdc"), k: "ms", p: "3 years" },
      { key: "lowgross", n: "Low deal gross at " + sls02.target, v: fmt(sls02.target_value, "usd0") + " a deal", k: "ms", p: "3 years" }] },
    { l: "Operating profit", sm: "after running costs", v: kv("EX-17", "ALL"), leaks: [
      { key: "m:IN-06", n: "Floorplan interest", v: fmt(kv("IN-06", "ALL"), "usd2") + " a day", k: "ms", p: "today" },
      { key: "m:SM-08", n: "Marketing spend", v: fmt(kv("SM-08", "ALL"), "usdc"), k: "ms", p: "3 years" }] },
    { l: "Cash", sm: "timing, not profit", v: null, leaks: [{ key: "m:FN-06", n: "Waiting on lenders", v: fmt(kv("FN-06", "ALL"), "usdc"), k: "ms", p: "today" }] }];
  const max = PL[0].v;
  $("pl").innerHTML = PL.map(function (r) {
    return '<div class="plrow"><div class="lab">' + r.l + "<small>" + r.sm + "</small></div>" +
      (r.v ? '<div class="plbar" style="width:' + (r.v / max * 100).toFixed(1) + '%"><span>' + fmt(r.v, "usdc") + "</span></div>" : '<div class="plbar cash" style="width:2%"><span>Not a P&amp;L line</span></div>') +
      '<div class="leaksc">' + (r.leaks.map(function (x) {
        return '<span class="leak" data-x="' + x.key + '"><span class="xb">' + esc(x.n) + '</span><span class="v">' + esc(x.v) + '</span><span class="kind ' + x.k + '">' + KL[x.k] + " · " + x.p + "</span></span>";
      }).join("") || '<span class="kind">no leak pinned here</span>') + "</div></div>";
  }).join("");
  function fitLabels() {
    document.querySelectorAll(".plbar:not(.cash)").forEach(function (b) { b.classList.remove("out"); const s = b.querySelector("span"); if (s.offsetWidth + 16 > b.clientWidth) b.classList.add("out"); });
  }
  addEventListener("resize", fitLabels);
  fitLabels();
  S.onStore(decisions);
  decisions();
})();
