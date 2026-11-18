/* P4 Sales and leads: tiles from DAX, the first-response distribution with the 15-minute line, signal charts, never-contacted leads. */
(function () {
  "use strict";
  const S = window.S, D = S.D, $ = S.$, fmt = S.fmt, esc = S.esc;
  const TILES = [
    { key: "m:SM-01", mid: "SM-01", label: "Net leads", fmt: "int", blank: "0", sub: "3 years, duplicates removed" },
    { key: "m:SM-02", mid: "SM-02", label: "Lead to sale", fmt: "pct1", sub: "share of net leads" },
    { key: "m:SM-03", mid: "SM-03", label: "Median first response", fmt: "min0", sub: "contacted leads" },
    { key: "m:SM-04", mid: "SM-04", label: "Never contacted", fmt: "pct1", sub: "share of net leads" },
    { key: "Q-LEAD-01", mid: "Q-LEAD-01", label: "Leads in the queue", fmt: "int", blank: "0", sub: "no contact recorded" },
    { key: "m:SM-10", mid: "SM-10", label: "Marketing cost per sale", fmt: "usd0", sub: "campaign-sourced sales" }];
  const CHARTS = [
    { key: "c-sls01", sid: "SCN-SLS-01", title: "Contact attempts lasting over 3 hours", note: "Share of touchpoints.", fmt: "pct1" },
    { key: "c-sls02", sid: "SCN-SLS-02", title: "Front-end gross per deal, low is the signal", note: "Average dollars per deal.", fmt: "usd0" },
    { key: "c-sls03", sid: "SCN-SLS-03", title: "Marketing spend per sale, by campaign", note: "Campaigns, not stores: the store filter does not apply.", fmt: "usd0", peerLabel: "Other campaigns" }];
  const LR = D.lead_response, LABELS = ["≤5", "5-10", "10-15", "15-20", "20-30", "30-45", "45-60", "1-4h", "4h+"];
  function dist() {
    const s = S.store(), rows = LR.by_store.filter(function (r) { return s === "ALL" || r.location_id === s; });
    const bins = LABELS.map(function (l, i) { return { label: l, n: rows.reduce(function (a, r) { return a + r["b" + i]; }, 0) }; });
    const contacted = rows.reduce(function (a, r) { return a + r.contacted; }, 0), over = rows.reduce(function (a, r) { return a + r.over_15; }, 0);
    $("hist").innerHTML = '<p class="note">' + esc((s === "ALL" ? "All stores" : s) + ": " + fmt(over / contacted, "pct1") + " of " + fmt(contacted, "int") + " contacted leads waited more than 15 minutes.") + "</p>" +
      window.Charts.hist(bins, 3, "15-minute policy");
    $("disttable").innerHTML = LR.by_store.map(function (r) {
      return "<tr><td>" + esc(r.location_id) + '</td><td class="n">' + fmt(r.net_leads, "int") + '</td><td class="n">' + fmt(r.contacted, "int") + '</td><td class="n">' + fmt(r.over_15, "int") +
        '</td><td class="n">' + fmt(r.over_15 / r.contacted, "pct1") + '</td><td class="n">' + fmt(r.median_minutes, "num1") + '</td><td class="n">' + fmt(r.net_leads - r.contacted, "int") + "</td></tr>";
    }).join("");
  }
  function draw() { S.tiles($("tiles"), TILES); dist(); S.evidence($("charts"), $("sigtable"), CHARTS); }
  S.onStore(draw);
  draw();
  S.queue({
    tbody: $("queue"), count: $("qcount"), more: $("qmore"), data: S.rows(D.queue_leads),
    columns: [{ k: "lead_id" }, { k: "location_id" }, { k: "campaign_id" }, { k: "created_timestamp", fmt: "date" }, { k: "deal_close_status" }, { k: "close_lost_reason" }, { k: "owner_employee_id" },
      { html: function (r) { return '<span class="chip">No contact</span>'; } }],
    title: function (r) { return r.lead_id + " at " + r.location_id; },
    detail: function (r) {
      return [["Store", r.location_id], ["Campaign", r.campaign_id || "none"], ["Created", String(r.created_timestamp).replace("T", " ").slice(0, 16)], ["Status", r.deal_close_status],
        ["Lost reason", r.close_lost_reason || "not recorded"], ["Salesperson", r.owner_employee_id || "unassigned"], ["Sold", r.has_deal ? "Yes" : "No"],
        ["Reason code", r.reason_code], ["Policy", r.policy_version_id]];
    },
    empty: function (s) { return "Every net lead at " + s + " has at least one recorded contact."; }
  });
})();
