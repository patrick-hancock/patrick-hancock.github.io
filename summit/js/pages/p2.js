/* P2 Inventory actions: tiles from DAX, four evidence charts from mart.scenario_signal_value, the vehicle action queue. */
(function () {
  "use strict";
  const S = window.S, $ = S.$, fmt = S.fmt, esc = S.esc;
  const TILES = [
    { key: "m:IN-01", mid: "IN-01", label: "Vehicles in stock", fmt: "int", blank: "0", sub: "as of 31 Oct 2026" },
    { key: "Q-INV-01", mid: "Q-INV-01", label: "Vehicles flagged", fmt: "int", blank: "0", sub: "at least one reason" },
    { key: "Q-INV-02", mid: "Q-INV-02", label: "Invested cost, flagged", fmt: "usdc", blank: "$0", sub: "cash tied up" },
    { key: "Q-INV-03", mid: "Q-INV-03", label: "Floorplan interest, flagged", fmt: "usdc", blank: "$0", sub: "charged so far" },
    { key: "m:IN-03d", mid: "IN-03d", label: "Aged 91+ days", fmt: "int", blank: "0", sub: "as of 31 Oct 2026" },
    { key: "m:IN-12", mid: "IN-12", label: "Wholesale gain or loss", fmt: "usdc", blank: "$0", sub: "all wholesale exits, 3 years" }];
  const CHARTS = [
    { key: "c-inv01", sid: "SCN-INV-01", title: "Used stock aged over 45 days", note: "Share of used-vehicle stock records.", fmt: "pct1" },
    { key: "c-inv02", sid: "SCN-INV-02", title: "Priced over 1.08 × market", note: "Share of vehicles with comparable prices.", fmt: "pct1" },
    { key: "c-inv04", sid: "SCN-INV-04", title: "Recon over budget and 14+ days down", note: "Share of reconditioning orders.", fmt: "pct1" },
    { key: "c-inv05", sid: "SCN-INV-05", title: "Wholesale exits at a loss", note: "Count of wholesale dispositions.", fmt: "int" }];
  const REASON = { AGED_91_PLUS: "Aged 91+ days", AGED_61_90: "Aged 61-90 days", OVER_MARKET: "Over market", RECON_OVERRUN: "Recon over budget" };
  const codes = function (r) { return (r.reason_codes || "").split(",").filter(Boolean); };
  function draw() { S.tiles($("tiles"), TILES); S.evidence($("charts"), $("sigtable"), CHARTS); }
  S.onStore(draw);
  draw();
  S.queue({
    tbody: $("queue"), count: $("qcount"), more: $("qmore"), data: S.rows(S.D.queue_inventory),
    columns: [
      { k: "priority_rank", fmt: "int", cls: "n" }, { k: "vehicle_id" }, { k: "location_id" }, { k: "age_days", fmt: "int", cls: "n" },
      { k: "price_to_market", fmt: "ratio2", cls: "n" }, { k: "invested_cost", fmt: "usd0", cls: "n" }, { k: "accrued_carrying_interest", fmt: "usd0", cls: "n" },
      { html: function (r) { return codes(r).map(function (c) { return '<span class="chip">' + esc(REASON[c] || c) + "</span>"; }).join(""); } },
      { k: "recommended_action" }],
    title: function (r) { return r.vehicle_id + " at " + r.location_id; },
    detail: function (r) {
      return [["Priority", fmt(r.priority_rank, "int")], ["Store", r.location_id], ["New or used", r.new_used_classification], ["Age", fmt(r.age_days, "int") + " days (" + r.age_bucket + ")"],
        ["Asking price", fmt(r.asking_price, "usd0")], ["Median comparable", fmt(r.median_comp_price, "usd0")], ["Price vs market", fmt(r.price_to_market, "ratio2")],
        ["Invested cost", fmt(r.invested_cost, "usd2")], ["Interest a day", fmt(r.daily_carrying_cost, "usd2")], ["Interest so far", fmt(r.accrued_carrying_interest, "usd2")],
        ["Recon over budget", r.is_recon_overrun ? "Yes" : "No"], ["Reasons", codes(r).map(function (c) { return REASON[c] || c; }).join(", ")], ["Reason codes", r.reason_codes], ["Suggested", r.recommended_action]];
    },
    empty: function (s) { return "No flagged vehicles at " + s + ". Every in-stock vehicle there is under 61 days, priced near market and within its recon budget."; }
  });
})();
