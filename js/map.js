/* Property portfolio maps (property-management.html, 2026-11-23 redesign spec section 5).
   Leaflet 1.9.4 (vendored, js/vendor/leaflet-1.9.4) on OpenStreetMap tiles. Each map reads its markers from the property
   directory under it ([data-property] rows with data-lat, data-lon and data-kind), so the page text is the single source.
   - Tile provider: TILES below is the one place to change it (OSM tile policy: HTTPS URL, visible attribution, normal
     browser caching, no prefetch or bulk download, default referrer).
   - No wheel zoom (page scrolling is never captured); zoom buttons, keyboard, double-click and pinch zoom stay on. On touch
     screens one-finger drag is off so a swipe scrolls the page; pinch still zooms and pans.
   - Markers are keyboard buttons (Leaflet keyboard option) with an aria-label and 44 px hit areas; nearly coincident
     markers are fanned out with a leader line to the true point (declutter) so each stays selectable.
   - Hover (or focus-free pointer) shows a property's popup as a preview; it closes 300 ms after the pointer leaves both
     the marker and the popup. Click, tap or Enter pins it open until its close button, Escape or another pin
     (Patrick, 2026-11-23). Leaflet's own click-to-toggle popup handlers are replaced for this (1.9.4 internals).
   - Directory rows get a "show on map" button. One detail popup is open at a time across both maps. The popup shows
     the row's photo when pm-map.yml has one.
   - The property lists under the maps are <details>, closed by default; a map that cannot load opens its list.
   - If Leaflet is missing, a map fails to start, or no tile loads, the map box shows its fallback note and the directory
     stays as it is. Each map starts on its own, so one failure does not stop the other. */
(function () {
  'use strict';

  var TILES = {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  };
  // Initial view per map. Denver opens on downtown (the four central properties) so street names stay readable; the
  // Frontier Building in Golden (about 19 km west) is reached with "Show all" or from its directory row.
  // Downtown max zoom 16: fits the four points in a 540 px panel with street labels (checked in the pane, 2026-11-23).
  var VIEWS = {
    denver: { initial: function (pts) { return pts.filter(function (p) { return p.latlng.lng > -105.1; }); }, maxZoom: 16 },
    east: { initial: function (pts) { return pts; }, maxZoom: 12 }
  };
  var HIT = 44;      // marker hit area in px (spec 5.5: 40 to 44 px)
  var NEAR = 40;     // markers closer than this in px are fanned out
  var FAN = 30;      // fan radius in px
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var maps = [];

  var HOVER_CLOSE = 300; // ms grace after the pointer leaves, so it can travel from marker to popup

  function showFallback(box) {
    var note = box.querySelector('[data-map-fallback]');
    if (note) { note.hidden = false; box.classList.add('pmm-map--failed'); }
    var panel = box.closest('[data-map-panel]');
    var list = panel && panel.querySelector('[data-map-list]');
    if (list) list.open = true;
  }

  function icon(kind) {
    return L.divIcon({
      className: 'pmm-marker pmm-marker--' + kind,
      html: '<span class="pmm-pin" aria-hidden="true"></span>',
      iconSize: [HIT, HIT],
      iconAnchor: [HIT / 2, HIT / 2],
      popupAnchor: [0, -12]
    });
  }

  function popupContent(row) {
    var div = document.createElement('div');
    div.className = 'pmm-pop';
    Array.prototype.forEach.call(row.querySelectorAll(':scope > p, :scope > figure'), function (p) {
      var c = p.cloneNode(true);
      c.querySelectorAll('button').forEach(function (b) { b.replaceWith(document.createTextNode(b.textContent)); });
      div.appendChild(c);
    });
    return div;
  }

  function fitAll(entry, which, animate) {
    var pts = which === 'initial' ? VIEWS[entry.key].initial(entry.points) : entry.points;
    var bounds = L.latLngBounds(pts.map(function (p) { return p.latlng; }));
    entry.map.fitBounds(bounds, { padding: [48, 48], maxZoom: VIEWS[entry.key].maxZoom, animate: animate && !reduceMotion });
  }

  // Fan out markers that sit within NEAR px of each other at the current zoom; draw a leader to each true point.
  function declutter(entry) {
    var map = entry.map;
    entry.leaders.clearLayers();
    var pts = entry.points.map(function (p) { return { p: p, xy: map.latLngToLayerPoint(p.latlng) }; });
    var groups = [];
    pts.forEach(function (a) {
      var g = groups.find(function (gr) { return gr.some(function (b) { return a.xy.distanceTo(b.xy) < NEAR; }); });
      if (g) g.push(a); else groups.push([a]);
    });
    groups.forEach(function (g) {
      if (g.length === 1) { g[0].p.marker.setLatLng(g[0].p.latlng); return; }
      var cx = 0, cy = 0;
      g.forEach(function (a) { cx += a.xy.x; cy += a.xy.y; });
      var c = L.point(cx / g.length, cy / g.length);
      g.forEach(function (a, i) {
        var ang = -Math.PI / 2 + (2 * Math.PI * i) / g.length + (g.length === 2 ? Math.PI / 2 : 0);
        var pos = map.layerPointToLatLng(c.add(L.point(Math.cos(ang) * FAN, Math.sin(ang) * FAN)));
        a.p.marker.setLatLng(pos);
        L.polyline([a.p.latlng, pos], { className: 'pmm-leader', interactive: false, weight: 1.5 }).addTo(entry.leaders);
        L.circleMarker(a.p.latlng, { className: 'pmm-true', radius: 3, interactive: false, weight: 1 }).addTo(entry.leaders);
      });
    });
  }

  function initMap(box) {
    var key = box.getAttribute('data-map');
    var panel = box.closest('[data-map-panel]');
    var rows = panel ? panel.querySelectorAll('[data-property]') : [];
    var map = L.map(box, {
      scrollWheelZoom: false,
      dragging: !coarse,
      tap: false,
      zoomSnap: 0.5,
      fadeAnimation: !reduceMotion,
      zoomAnimation: !reduceMotion,
      markerZoomAnimation: !reduceMotion
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    var entry = { key: key, map: map, points: [], leaders: L.layerGroup().addTo(map), pinned: null, switching: false, timer: null };
    entry.show = function (pt) { clearTimeout(entry.timer); entry.switching = true; pt.marker.openPopup(); entry.switching = false; };
    entry.leave = function (pt) {
      clearTimeout(entry.timer);
      entry.timer = setTimeout(function () {
        if (entry.pinned === pt) return;
        if (entry.pinned) entry.show(entry.pinned);
        else { entry.switching = true; map.closePopup(); entry.switching = false; }
      }, HOVER_CLOSE);
    };

    var loaded = 0, errors = 0;
    var tiles = L.tileLayer(TILES.url, { attribution: TILES.attribution, maxZoom: TILES.maxZoom });
    tiles.on('tileload', function () { loaded++; box.classList.remove('pmm-map--failed'); var n = box.querySelector('[data-map-fallback]'); if (n) n.hidden = true; });
    tiles.on('tileerror', function () { errors++; if (!loaded && errors >= 4) showFallback(box); });
    tiles.addTo(map);

    Array.prototype.forEach.call(rows, function (row) {
      var lat = parseFloat(row.getAttribute('data-lat')), lon = parseFloat(row.getAttribute('data-lon'));
      if (isNaN(lat) || isNaN(lon)) return; // no verified point: the row stays in the list without a marker
      var kind = row.getAttribute('data-kind') === 'relief' ? 'relief' : 'managed';
      var titleEl = row.querySelector('.pmm-item__title');
      var title = titleEl.textContent.trim();
      var roleText = kind === 'relief' ? 'relief coverage' : 'management role';
      var latlng = L.latLng(lat, lon);
      var marker = L.marker(latlng, { icon: icon(kind), keyboard: true, riseOnHover: true, alt: title })
        .bindPopup(popupContent(row), { maxWidth: 260, autoPanPadding: [16, 16], className: 'pmm-popup' })
        .addTo(map);
      // The icon element exists only once the map has a view, so the name is set in labelMarkers() after fitAll.
      var p = { latlng: latlng, marker: marker, row: row, title: title, label: title + ', ' + roleText + ': show details' };
      entry.points.push(p);
      // Replace Leaflet's click/Enter toggle with hover preview plus click-to-pin.
      marker.off('click', marker._openPopup, marker);
      marker.off('keypress', marker._onKeyPress, marker);
      marker.on('click', function () { entry.pinned = p; entry.show(p); });
      marker.on('keypress', function (e) { if (e.originalEvent && (e.originalEvent.key === 'Enter' || e.originalEvent.keyCode === 13)) { entry.pinned = p; entry.show(p); } });
      marker.on('mouseover', function () { entry.show(p); });
      marker.on('mouseout', function () { entry.leave(p); });
      marker.on('popupopen', function (e) {
        maps.forEach(function (o) { if (o !== entry) { o.pinned = null; o.switching = true; o.map.closePopup(); o.switching = false; } });
        row.classList.add('pmm-item--active');
        var el = e.popup.getElement();
        if (el && !el.__pmm) {
          el.__pmm = true;
          el.addEventListener('mouseenter', function () { clearTimeout(entry.timer); });
          el.addEventListener('mouseleave', function () { entry.leave(p); });
        }
      });
      marker.on('popupclose', function () {
        row.classList.remove('pmm-item--active');
        if (entry.switching) return;
        if (entry.pinned === p) entry.pinned = null;
        // Closing by its button or Escape leaves focus nowhere (the popup is removed): put it back on the marker.
        setTimeout(function () {
          var a = document.activeElement, me = marker.getElement();
          if (me && (!a || a === document.body || !document.contains(a))) me.focus();
        }, 0);
      });

      // Directory row: the property name becomes a button that shows it on the map.
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmm-item__btn';
      btn.textContent = title;
      btn.setAttribute('aria-label', title + ': show on map');
      btn.addEventListener('click', function () {
        var z = Math.max(map.getZoom(), 15);
        map.setView(latlng, Math.min(z, VIEWS[key].maxZoom + 1), { animate: !reduceMotion });
        entry.pinned = p;
        entry.show(p);
        var r = box.getBoundingClientRect();
        if (r.top < 88 || r.bottom > window.innerHeight) box.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      titleEl.textContent = '';
      titleEl.appendChild(btn);
    });

    if (!entry.points.length) { map.remove(); showFallback(box); return; }

    // "Show all" control: fits every point on this map (the Frontier Building in Golden on the Denver map).
    var All = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        var wrap = L.DomUtil.create('div', 'leaflet-bar pmm-all');
        var b = L.DomUtil.create('button', '', wrap);
        b.type = 'button';
        b.textContent = 'Show all';
        b.setAttribute('aria-label', 'Show all properties on this map');
        L.DomEvent.disableClickPropagation(wrap);
        L.DomEvent.on(b, 'click', function () { entry.pinned = null; map.closePopup(); fitAll(entry, 'all', true); });
        return wrap;
      }
    });
    map.addControl(new All());

    map.on('zoomend viewreset', function () { declutter(entry); });
    // Escape closes the open detail popup from anywhere in the map (Leaflet only does this when the map box has focus).
    box.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = entry.points.find(function (pt) { return pt.marker.isPopupOpen(); });
      if (open) { e.preventDefault(); entry.pinned = null; map.closePopup(); open.marker.getElement().focus(); }
    });
    fitAll(entry, 'initial', false);
    entry.points.forEach(function (pt) {
      var el = pt.marker.getElement();
      if (el) { el.setAttribute('aria-label', pt.label); el.setAttribute('role', 'button'); }
    });
    declutter(entry);
    var note = box.querySelector('[data-map-fallback]');
    if (note) note.hidden = true;
    maps.push(entry);
  }

  function start() {
    // List toggles: the summary reads "Show the N properties" closed and "Hide the N properties" open.
    Array.prototype.forEach.call(document.querySelectorAll('[data-map-list]'), function (d) {
      var s = d.querySelector('summary');
      var showText = s.textContent;
      var hideText = showText.replace(/^Show/, 'Hide');
      var sync = function () { s.textContent = d.open ? hideText : showText; };
      d.addEventListener('toggle', sync);
      sync();
    });
    var boxes = document.querySelectorAll('[data-map]');
    if (typeof window.L === 'undefined') { Array.prototype.forEach.call(boxes, showFallback); return; }
    Array.prototype.forEach.call(boxes, function (box) {
      try { initMap(box); } catch (e) { showFallback(box); if (window.console) console.warn('map failed to start', e); }
    });
    // Panels resize with the layout (side by side or stacked): keep tiles and declutter in step.
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { maps.forEach(function (e) { e.map.invalidateSize(); declutter(e); }); }, 150);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
