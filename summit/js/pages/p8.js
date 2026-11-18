/* P8 How the numbers are checked: the searchable DAX check table (checks.json dax_rows: measure, scope, expected, DAX, match). */
(function () {
  "use strict";
  const S = window.S, D = S.D, $ = S.$, fmt = S.fmt, esc = S.esc;
  const ROWS = D.checks.dax_rows, NAME = function (m) { return D.kpi[m] ? D.kpi[m].name : ""; };
  let shown = 100;
  const n = function (v) { return v === null ? "" : Math.abs(v) >= 1000 ? fmt(v, "num2") : String(Math.round(v * 1e4) / 1e4); };
  function draw() {
    const q = $("ksearch").value.trim().toLowerCase();
    const list = ROWS.filter(function (r) { return !q || (r[0] + " " + r[1] + " " + NAME(r[0])).toLowerCase().indexOf(q) >= 0; });
    $("ktable").innerHTML = list.slice(0, shown).map(function (r) {
      const diff = r[2] === null || r[3] === null ? "" : (r[3] - r[2]).toExponential(1);
      return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(NAME(r[0])) + "</td><td>" + esc(r[1]) + '</td><td class="n">' + n(r[2]) + '</td><td class="n">' + n(r[3]) + '</td><td class="n">' + diff +
        '</td><td class="' + (r[4] ? "pass" : "failt") + '">' + (r[4] ? "Yes" : "No") + "</td></tr>";
    }).join("") || '<tr><td colspan="7" class="muted">No rows match. Try a measure id such as FO-17 or a store such as LOC-05.</td></tr>';
    $("kcount").textContent = "Showing " + fmt(Math.min(shown, list.length), "int") + " of " + fmt(list.length, "int") + " rows; " + fmt(list.filter(function (r) { return r[4]; }).length, "int") + " match.";
    $("kmore").hidden = list.length <= shown;
  }
  $("ksearch").addEventListener("input", function () { shown = 100; draw(); });
  $("kmore").addEventListener("click", function () { shown += 100; draw(); });
  draw();
})();
