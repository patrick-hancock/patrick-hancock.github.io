/* P6 Deal funding: tiles from DAX, days-to-fund strips by store with the 12-day line, funding exceptions queue. */
(function () {
  "use strict";
  const S = window.S, D = S.D, $ = S.$, fmt = S.fmt, esc = S.esc;
  const TILES = [
    { key: "m:FN-01", mid: "FN-01", label: "Average days to fund", fmt: "days2", sub: "funded deals" },
    { key: "m:FN-02", mid: "FN-02", label: "Funded after 12 days", fmt: "pct1", sub: "share of funded deals" },
    { key: "m:FN-03", mid: "FN-03", label: "Unfunded cases", fmt: "int", blank: "0", sub: "as of 31 Oct 2026" },
    { key: "m:FN-04", mid: "FN-04", label: "Open requirements", fmt: "int", blank: "0", sub: "as of 31 Oct 2026" },
    { key: "m:FN-06", mid: "FN-06", label: "Contracts in transit", fmt: "usdc", blank: "$0", sub: "waiting on lenders" },
    { key: "Q-FND-03", mid: "Q-FND-03", label: "In transit, unfunded", fmt: "usdc", blank: "$0", sub: "on cases in the queue" }];
  const target = S.sigRow("SCN-FND-01").target;
  const byStore = {};
  D.funding_days.forEach(function (r) { (byStore[r.location_id] = byStore[r.location_id] || {})[r.days] = r.cases; });
  const maxDay = Math.max.apply(null, D.funding_days.map(function (r) { return r.days; }));
  function median(m) {
    const ds = Object.keys(m).map(Number).sort(function (a, b) { return a - b; }), n = ds.reduce(function (a, d) { return a + m[d]; }, 0);
    let c = 0, lo = null;
    for (const d of ds) { c += m[d]; if (lo === null && c >= n / 2) { lo = d; if (c > n / 2 || n % 2) return d; } else if (lo !== null) return (lo + d) / 2; }
    return lo;
  }
  function draw() {
    const s = S.store();
    S.tiles($("tiles"), TILES);
    $("strips").innerHTML = window.Charts.strips(byStore, maxDay, 12, target, s);
    $("disttable").innerHTML = Object.keys(byStore).sort().map(function (k) {
      const m = byStore[k], n = Object.keys(m).reduce(function (a, d) { return a + m[d]; }, 0), over = Object.keys(m).filter(function (d) { return +d > 12; }).reduce(function (a, d) { return a + m[d]; }, 0);
      return "<tr><td>" + esc(k) + '</td><td class="n">' + fmt(n, "int") + '</td><td class="n">' + fmt(median(m), "num1") + '</td><td class="n">' + fmt(over, "int") + '</td><td class="n">' + fmt(over / n, "pct1") + "</td></tr>";
    }).join("");
  }
  S.onStore(draw);
  draw();
  const RC = { NOT_FUNDED: "Not funded", OVER_12_DAYS: "Over 12 days", OPEN_REQUIREMENT: "Open requirement", REWORK: "Rework" };
  const codes = function (r) { return (r.reason_codes || "").split(",").filter(Boolean); };
  S.queue({
    tbody: $("queue"), count: $("qcount"), more: $("qmore"), data: S.rows(D.queue_funding),
    columns: [{ k: "funding_case_id" }, { k: "location_id" }, { k: "lender_name" }, { k: "funding_status" }, { k: "days_since_contract", fmt: "int", cls: "n" },
      { k: "open_requirements", fmt: "int", cls: "n" }, { k: "rework_requirements", fmt: "int", cls: "n" }, { k: "cit_outstanding_balance", fmt: "usd0", cls: "n" },
      { html: function (r) { return codes(r).map(function (c) { return '<span class="chip">' + esc(RC[c] || c) + "</span>"; }).join(""); } }],
    title: function (r) { return r.funding_case_id + " at " + r.location_id; },
    detail: function (r) {
      return [["Store", r.location_id], ["Deal", r.deal_id], ["Lender", r.lender_name], ["Status", r.funding_status], ["Contract", fmt(r.contract_date, "date")],
        ["Submitted", r.submission_date ? fmt(r.submission_date, "date") : "not yet"], ["Days since contract", fmt(r.days_since_contract, "int")], ["Open requirements", fmt(r.open_requirements, "int")],
        ["Rework", fmt(r.rework_requirements, "int")], ["In-transit balance", r.cit_outstanding_balance === null ? "no in-transit record" : fmt(r.cit_outstanding_balance, "usd2")],
        ["Days in transit", r.days_in_transit === null ? "—" : fmt(r.days_in_transit, "int")], ["Hold reason", r.funding_hold_reason || "none recorded"], ["Reason codes", r.reason_codes]];
    },
    empty: function (s) { return "No unfunded deals at " + s + "."; }
  });
})();
