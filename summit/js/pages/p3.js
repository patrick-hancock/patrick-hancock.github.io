/* P3 Service recovery: tiles from DAX, the declined-followed-recovered funnel by store, signal charts, the recovery queue. */
(function () {
  "use strict";
  const S = window.S, D = S.D, $ = S.$, fmt = S.fmt, esc = S.esc;
  const target = S.sigRow("SCN-FIX-01").target;
  const TILES = [
    { key: "m:FO-13", mid: "FO-13", label: "Declined recommendations", fmt: "int", blank: "0", sub: "3 years" },
    { key: "Q-SVC-01", mid: "Q-SVC-01", label: "Open, not recovered", fmt: "int", blank: "0", sub: "in the queue" },
    { key: "Q-SVC-02", mid: "Q-SVC-02", label: "No follow-up yet", fmt: "int", blank: "0", sub: "never contacted" },
    { key: "Q-SVC-03", mid: "Q-SVC-03", label: "Open estimated opportunity", fmt: "usdc", blank: "$0", kind: "est", sub: "advisor quotes" },
    { key: "Q-SVC-04", mid: "Q-SVC-04", label: "Recovered lines linked to an RO", fmt: "int", blank: "0", sub: "3 years" },
    { key: "m:FO-17", mid: "FO-17", label: "Recovered work gross", fmt: "usdc", blank: "$0", kind: "ms", kindLabel: "associated", sub: "not proven incremental" }];
  const CHARTS = [
    { key: "c-fix01", sid: "SCN-FIX-01", title: "Declined with no follow-up or recovery", note: "Share of declined recommendations.", fmt: "pct1" },
    { key: "c-fix02", sid: "SCN-FIX-02", title: "Recovered work gross (associated), low is the signal", note: "Dollars, 3 years.", fmt: "usdc" },
    { key: "c-fix03", sid: "SCN-FIX-03", title: "Service appointment no-shows", note: "Share of appointments.", fmt: "pct1" },
    { key: "c-fix04", sid: "SCN-FIX-04", title: "Days booked over capacity", note: "Share of capacity days.", fmt: "pct1" }];
  const F = D.service_funnel;
  function funnel() {
    const s = S.store();
    $("funnel").innerHTML = window.Charts.funnel(F, target, s);
    $("funtable").innerHTML = F.map(function (r) {
      return "<tr><td>" + esc(r.location_id) + '</td><td class="n">' + fmt(r.declined, "int") + '</td><td class="n">' + fmt(r.followed_up, "int") + '</td><td class="n">' + fmt(r.recovered, "int") +
        '</td><td class="n">' + fmt(r.recovered / r.declined, "pct1") + '</td><td class="n">' + fmt(r.declined_estimate, "usd0") + "</td></tr>";
    }).join("");
  }
  function draw() { S.tiles($("tiles"), TILES); funnel(); S.evidence($("charts"), $("sigtable"), CHARTS); }
  S.onStore(draw);
  draw();
  const REASON = { NO_FOLLOWUP: "No follow-up yet", FOLLOWED_UP_NOT_RECOVERED: "Followed up, not recovered" };
  S.queue({
    tbody: $("queue"), count: $("qcount"), more: $("qmore"), data: S.rows(D.queue_service),
    columns: [
      { k: "priority_rank", fmt: "int", cls: "n" }, { k: "recommendation_id" }, { k: "location_id" }, { k: "urgency_category" }, { k: "recommended_operation" },
      { k: "estimated_gross_opportunity", fmt: "usd2", cls: "n" }, { k: "days_since_presented", fmt: "int", cls: "n" },
      { html: function (r) { return '<span class="chip' + (r.reason_code === "NO_FOLLOWUP" ? "" : " ok") + '">' + esc(REASON[r.reason_code] || r.reason_code) + "</span>"; } },
      { k: "owner_employee_id" }],
    title: function (r) { return r.recommendation_id + " at " + r.location_id; },
    detail: function (r) {
      return [["Priority", fmt(r.priority_rank, "int")], ["Store", r.location_id], ["Work", r.recommended_operation], ["Urgency", r.urgency_category],
        ["Estimated price", fmt(r.estimated_total_price, "usd2")], ["Estimated gross", fmt(r.estimated_gross_opportunity, "usd2") + " (advisor estimate)"],
        ["Presented", fmt(r.presented_date, "date")], ["Days since", fmt(r.days_since_presented, "int")], ["Status", REASON[r.reason_code] || r.reason_code], ["Reason code", r.reason_code],
        ["Advisor", r.owner_employee_id], ["Suggested", r.recommended_action]];
    },
    empty: function (s) { return "No open declined work at " + s + "."; }
  });
})();
