/* P5 Customer lifecycle: FO-20 and the queue size from DAX, contactable buyers counted from the queue rows, ranked stores, queue. */
(function () {
  "use strict";
  const S = window.S, D = S.D, $ = S.$, fmt = S.fmt, esc = S.esc;
  const Q = S.rows(D.queue_first_service);
  const ok = function (r) { return r.consent_status === "Opted-In"; };
  const TILES = [
    { key: "m:FO-20", mid: "FO-20", label: "First service within 183 days", fmt: "pct1", sub: "retail buyers" },
    { key: "Q-LIF-01", mid: "Q-LIF-01", label: "Buyers due a first service", fmt: "int", blank: "0", sub: "in the queue" },
    { key: "consent-ok", label: "Due and can be contacted", fmt: "int", sub: "opted in to contact",
      value: function (s) { return Q.filter(function (r) { return ok(r) && (s === "ALL" || r.location_id === s); }).length; } }];
  const row = S.sigRow("SCN-LIF-01"), vals = S.sigValues("SCN-LIF-01"), targets = row.target.split(";");
  function draw() {
    const s = S.store();
    S.tiles($("tiles"), TILES);
    $("rank").innerHTML = window.Charts.ranked(vals, targets, "pct1", s);
    $("ranktable").innerHTML = Object.keys(vals).sort().map(function (k) { return "<tr><td>" + esc(k) + '</td><td class="n">' + fmt(vals[k], "pct1") + "</td><td>" + (targets.indexOf(k) >= 0 ? "Yes" : "No") + "</td></tr>"; }).join("");
  }
  S.onStore(draw);
  draw();
  S.queue({
    tbody: $("queue"), count: $("qcount"), more: $("qmore"), data: Q,
    columns: [{ k: "ownership_id" }, { k: "location_id" }, { k: "vehicle_id" }, { k: "ownership_start_date", fmt: "date" }, { k: "days_since_purchase", fmt: "int", cls: "n" },
      { html: function (r) { return '<span class="chip' + (ok(r) ? " ok" : "") + '">' + esc(r.consent_status) + "</span>"; } }, { k: "recommended_action" }],
    title: function (r) { return r.ownership_id + " at " + r.location_id; },
    detail: function (r) {
      return [["Store", r.location_id], ["Customer", r.customer_id], ["Vehicle", r.vehicle_id], ["Bought", fmt(r.ownership_start_date, "date")], ["Days since", fmt(r.days_since_purchase, "int")],
        ["Consent", r.consent_status], ["Preferred channel", r.preferred_channel || "none on file"], ["Reason code", r.reason_code], ["Action", r.recommended_action]];
    },
    empty: function (s) { return "No buyers at " + s + " are due a first service."; }
  });
})();
