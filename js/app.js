(function () {
  "use strict";

  var DATA_URL = "data/entries.json";
  var TYPEN = ["Rezept", "Restaurant"];

  var state = {
    entries: [],
    filter: "Alle",
    sort: "datum-desc",
    rating: 0
  };

  var el = {
    grid: document.getElementById("grid"),
    empty: document.getElementById("empty"),
    count: document.getElementById("count"),
    sort: document.getElementById("sort"),
    filterBtns: document.querySelectorAll("[data-filter]"),
    form: document.getElementById("entry-form"),
    starInput: document.getElementById("star-input"),
    formError: document.getElementById("form-error"),
    output: document.getElementById("output"),
    jsonOut: document.getElementById("json-out"),
    copyBtn: document.getElementById("copy-btn"),
    copyStatus: document.getElementById("copy-status"),
    datum: document.getElementById("f-datum")
  };

  /* ---------- Hilfsfunktionen ---------- */

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Nur http(s)-URLs als Bildquelle zulassen (verhindert javascript:/data:-Tricks).
  function safeUrl(value) {
    if (!value || typeof value !== "string") return "";
    try {
      var url = new URL(value.trim(), window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (e) {
      return "";
    }
  }

  function clampRating(value) {
    var n = Math.round(Number(value));
    if (!isFinite(n)) return 0;
    return Math.min(5, Math.max(0, n));
  }

  function today() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function formatDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
    var parts = iso.split("-");
    return parts[2] + "." + parts[1] + "." + parts[0];
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function starsHtml(rating) {
    var r = clampRating(rating);
    var html = '<span class="stars" role="img" aria-label="' + r + ' von 5 Sternen">';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="' + (i <= r ? "on" : "") + '" aria-hidden="true">★</span>';
    }
    return html + "</span>";
  }

  var PLACEHOLDER_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>';

  /* ---------- Darstellung ---------- */

  function cardHtml(entry) {
    var typ = TYPEN.indexOf(entry.typ) >= 0 ? entry.typ : "Rezept";
    var foto = safeUrl(entry.foto);
    var media = foto
      ? '<img src="' + escapeHtml(foto) + '" alt="' + escapeHtml(entry.name) + '" loading="lazy" referrerpolicy="no-referrer">'
      : '<div class="placeholder">' + PLACEHOLDER_ICON + "</div>";

    return (
      '<article class="card">' +
        '<div class="card-media">' + media +
          '<span class="badge badge-' + typ + '">' + escapeHtml(typ) + "</span>" +
        "</div>" +
        '<div class="card-body">' +
          '<h3 class="card-title">' + escapeHtml(entry.name) + "</h3>" +
          (entry.notiz ? '<p class="card-note">' + escapeHtml(entry.notiz) + "</p>" : "") +
          '<div class="card-meta">' + starsHtml(entry.bewertung) +
            '<time class="card-date" datetime="' + escapeHtml(entry.datum) + '">' + escapeHtml(formatDate(entry.datum)) + "</time>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function visibleEntries() {
    var list = state.entries.filter(function (e) {
      return state.filter === "Alle" || e.typ === state.filter;
    });
    var parts = state.sort.split("-");
    var key = parts[0];
    var dir = parts[1] === "asc" ? 1 : -1;
    return list.slice().sort(function (a, b) {
      var cmp;
      if (key === "bewertung") {
        cmp = clampRating(a.bewertung) - clampRating(b.bewertung);
        if (cmp === 0) cmp = String(a.datum || "").localeCompare(String(b.datum || ""));
      } else {
        cmp = String(a.datum || "").localeCompare(String(b.datum || ""));
      }
      return cmp * dir;
    });
  }

  function render() {
    var list = visibleEntries();
    el.grid.innerHTML = list.map(cardHtml).join("");

    // Fehlerhafte Bild-URLs durch den Platzhalter ersetzen.
    el.grid.querySelectorAll(".card-media img").forEach(function (img) {
      img.addEventListener("error", function () {
        var ph = document.createElement("div");
        ph.className = "placeholder";
        ph.innerHTML = PLACEHOLDER_ICON;
        img.replaceWith(ph);
      }, { once: true });
    });

    var total = state.entries.length;
    el.count.textContent = total ? list.length + " von " + total + " Einträgen" : "";

    if (list.length === 0) {
      el.empty.hidden = false;
      if (total === 0) {
        el.empty.innerHTML =
          '<span class="emoji" aria-hidden="true">🍽️</span>' +
          "<h2>Noch keine Einträge</h2>" +
          '<p>Hier ist noch alles leer – aber bestimmt nicht mehr lange. ' +
          'Lege unten über <a href="#hinzufuegen">„Eintrag hinzufügen“</a> dein erstes Rezept oder Restaurant an.</p>';
      } else {
        var label = state.filter === "Rezept" ? "Rezepte" : "Restaurants";
        el.empty.innerHTML =
          '<span class="emoji" aria-hidden="true">🔍</span>' +
          "<h2>Keine " + escapeHtml(label) + " gefunden</h2>" +
          "<p>Für diesen Filter gibt es noch nichts. Probier „Alle“ oder füge einen neuen Eintrag hinzu.</p>";
      }
    } else {
      el.empty.hidden = true;
      el.empty.innerHTML = "";
    }
  }

  function showLoadError() {
    el.count.textContent = "";
    el.empty.hidden = false;
    el.empty.innerHTML =
      '<span class="emoji" aria-hidden="true">⚠️</span>' +
      "<h2>Einträge konnten nicht geladen werden</h2>" +
      "<p>Prüfe, ob <code>data/entries.json</code> gültiges JSON enthält. " +
      "Lokal muss die Seite über einen Webserver geöffnet werden (nicht per Doppelklick).</p>";
  }

  /* ---------- Daten laden ---------- */

  function normalize(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(function (e) { return e && typeof e === "object" && e.name; })
      .map(function (e) {
        return {
          id: String(e.id || makeId()),
          name: String(e.name),
          typ: TYPEN.indexOf(e.typ) >= 0 ? e.typ : "Rezept",
          bewertung: clampRating(e.bewertung),
          notiz: e.notiz ? String(e.notiz) : "",
          foto: e.foto ? String(e.foto) : "",
          datum: e.datum ? String(e.datum) : ""
        };
      });
  }

  function load() {
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        state.entries = normalize(data);
        render();
      })
      .catch(function (err) {
        console.error("Laden fehlgeschlagen:", err);
        showLoadError();
      });
  }

  /* ---------- Filter & Sortierung ---------- */

  el.filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.filter = btn.getAttribute("data-filter");
      el.filterBtns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      render();
    });
  });

  el.sort.addEventListener("change", function () {
    state.sort = el.sort.value;
    render();
  });

  /* ---------- Sterne im Formular ---------- */

  var starButtons = [];

  function paintStars(value) {
    starButtons.forEach(function (b, i) {
      b.classList.toggle("on", i < value);
    });
  }

  function setRating(value) {
    state.rating = value;
    starButtons.forEach(function (b, i) {
      b.setAttribute("aria-checked", i + 1 === value ? "true" : "false");
      b.tabIndex = (value ? i + 1 === value : i === 0) ? 0 : -1;
    });
    paintStars(value);
  }

  for (var i = 1; i <= 5; i++) {
    (function (n) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "star-btn";
      b.textContent = "★";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", n + (n === 1 ? " Stern" : " Sterne"));
      b.addEventListener("click", function () { setRating(n); });
      b.addEventListener("mouseenter", function () { paintStars(n); });
      b.addEventListener("keydown", function (ev) {
        var next = null;
        if (ev.key === "ArrowRight" || ev.key === "ArrowUp") next = Math.min(5, n + 1);
        if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") next = Math.max(1, n - 1);
        if (next !== null) {
          ev.preventDefault();
          setRating(next);
          starButtons[next - 1].focus();
        }
      });
      starButtons.push(b);
      el.starInput.appendChild(b);
    })(i);
  }
  el.starInput.addEventListener("mouseleave", function () { paintStars(state.rating); });

  /* ---------- Formular ---------- */

  function showError(msg) {
    el.formError.textContent = msg;
    el.formError.hidden = !msg;
  }

  function resetForm() {
    setRating(0);
    el.datum.value = today();
    showError("");
  }

  el.form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var fd = new FormData(el.form);
    var name = String(fd.get("name") || "").trim();
    var typ = String(fd.get("typ") || "");
    var datum = String(fd.get("datum") || "");
    var foto = String(fd.get("foto") || "").trim();
    var notiz = String(fd.get("notiz") || "").trim();

    if (!name) return showError("Bitte gib einen Namen ein.");
    if (TYPEN.indexOf(typ) < 0) return showError("Bitte wähle einen Typ.");
    if (state.rating < 1) return showError("Bitte vergib 1 bis 5 Sterne.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return showError("Bitte gib ein gültiges Datum an.");
    if (foto && !safeUrl(foto)) return showError("Die Foto-URL muss mit http:// oder https:// beginnen.");
    showError("");

    var entry = {
      id: makeId(),
      name: name,
      typ: typ,
      bewertung: state.rating,
      notiz: notiz,
      datum: datum
    };
    if (foto) entry.foto = foto;
    // Feldreihenfolge wie im Datenmodell
    var ordered = { id: entry.id, name: entry.name, typ: entry.typ, bewertung: entry.bewertung, notiz: entry.notiz };
    if (entry.foto) ordered.foto = entry.foto;
    ordered.datum = entry.datum;

    el.jsonOut.value = JSON.stringify(ordered, null, 2);
    el.output.hidden = false;
    el.copyStatus.textContent = "";
    el.jsonOut.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  el.form.addEventListener("reset", function () {
    setTimeout(resetForm, 0);
    el.output.hidden = true;
  });

  el.copyBtn.addEventListener("click", function () {
    var text = el.jsonOut.value;
    var done = function () { el.copyStatus.textContent = "✓ Kopiert!"; };
    var fallback = function () {
      el.jsonOut.focus();
      el.jsonOut.select();
      try {
        document.execCommand("copy") ? done() : (el.copyStatus.textContent = "Bitte manuell kopieren (Strg/Cmd + C).");
      } catch (e) {
        el.copyStatus.textContent = "Bitte manuell kopieren (Strg/Cmd + C).";
      }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  });

  /* ---------- Start ---------- */

  resetForm();
  load();
})();
