/* P7 Knowledge assistant: scoreboard tiles computed from the per-case rows (knowledge.json); the rest of the page is server-rendered. */
(function () {
  "use strict";
  const S = window.S, K = S.D.knowledge;
  S.tiles(S.$("tiles"), [
    { key: "ka-scored", label: "Cases scored that pass", value: K.scored_passed, fmt: "int", sub: "of " + K.scored + " scored cases" },
    { key: "ka-withheld", label: "Withheld as source label errors", value: K.withheld.length, fmt: "int", sub: "reported, not counted" },
    { key: "ka-recall", label: "Answer-point recall", value: K.mean_answer_point_recall, fmt: "pct0", sub: "mean across answered cases" }]);
})();
