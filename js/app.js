(() => {
  "use strict";

  /* =========================================================
     Konstanten
     ========================================================= */
  const DATA_URL = "data/entries.json";
  const TYPEN = ["Rezept", "Restaurant"];
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const MONATE_KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
  const STERNE_TEXT = ["Ohne Bewertung", "Ein Stern", "Zwei Sterne", "Drei Sterne", "Vier Sterne", "Fünf Sterne"];
  const URTEIL = ["Noch nicht bewertet", "Enttäuschend", "Geht so", "Gut", "Sehr gut", "Hervorragend"];
  const FAVORITEN_AB = 4; // Favoriten-Bereich erst ab so vielen Einträgen

  // Pastell-Verläufe für Platzhalter: gleiche Helligkeit und Sättigung,
  // damit die verschiedenen Farbtöne miteinander harmonieren.
  // [Verlauf hell, Verlauf dunkler, Farbe der Initiale]
  const PALETTEN = [
    ["#e8f5ec", "#c6e5d0", "#2f6b49"], // Minze
    ["#f0f5e6", "#d5e3bf", "#4f6a2c"], // Salbei
    ["#fff8dc", "#f8e8a8", "#3a7a55"], // Butter mit Salbei-Initiale (analog statt Senfbraun)
    ["#fdeef3", "#f6cfdc", "#a8325a"], // Himbeere
    ["#f3effb", "#ddd4f3", "#5a4a99"], // Flieder
    ["#e7f5f4", "#c4e6e3", "#2b6e69"]  // Meerglas
  ];

  const STAR_PATH = "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z";

  const svgIcon = (body) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  const ICONS = {
    Rezept: svgIcon('<path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="m4 8 16-4"/><path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"/>'),
    Restaurant: svgIcon('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>')
  };
  const ICON_CLOSE = svgIcon('<path d="M18 6 6 18M6 6l12 12"/>');

  const EMPTY_ART =
    '<svg class="empty-art" viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="80" cy="84" r="44"/>' +
      '<circle cx="80" cy="84" r="31" stroke-dasharray="2 8" opacity=".55"/>' +
      '<path d="M24 42v22a7 7 0 0 0 14 0V42M31 42v22M31 71v57"/>' +
      '<path d="M136 42c-8 7-11 20-11 36h11v50"/>' +
      '<path class="art-accent" d="M72 30c-4-5 4-8 0-14M88 30c-4-5 4-8 0-14" opacity=".7"/>' +
      '<path class="art-accent" d="M128 18v8M124 22h8M40 136v6M37 139h6" stroke-width="2" opacity=".8"/>' +
    "</svg>";

  /* =========================================================
     Zustand & DOM
     ========================================================= */
  const state = { entries: [], filter: "Alle", sort: "datum-desc", rating: 0 };
  const $ = (id) => document.getElementById(id);

  const el = {
    issue: $("issue"),
    stats: $("stats"),
    featured: $("favoriten"),
    featuredGrid: $("featured-grid"),
    listHead: $("list-head"),
    toolbar: $("toolbar"),
    list: $("list"),
    empty: $("empty"),
    sort: $("sort"),
    tabs: document.querySelectorAll(".tab"),
    form: $("entry-form"),
    name: $("f-name"),
    datum: $("f-datum"),
    foto: $("f-foto"),
    notiz: $("f-notiz"),
    notizCount: $("notiz-count"),
    starInput: $("star-input"),
    ratingWord: $("rating-word"),
    formError: $("form-error"),
    preview: $("preview"),
    output: $("output"),
    jsonOut: $("json-out"),
    copyBtn: $("copy-btn"),
    ghEdit: $("gh-edit"),
    detail: $("detail"),
    detailBody: $("detail-body"),
    detailClose: $("detail-close")
  };

  /* =========================================================
     Hilfsfunktionen
     ========================================================= */
  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

  // Nur http(s) als Bildquelle zulassen – relative Pfade wie img/foto.jpg sind erlaubt.
  function safeUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value.trim(), window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function clampRating(value) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : 0;
  }

  function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y, m: mo, d };
  }

  function formatDate(iso, long = false) {
    const p = parseDate(iso);
    if (!p) return "";
    return `${p.d}. ${(long ? MONATE : MONATE_KURZ)[p.m - 1]} ${p.y}`;
  }

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function hashIndex(str, n) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % n;
  }

  // Erster Buchstabe oder erste Ziffer des Namens (Sonderzeichen werden übersprungen)
  const initial = (name) => {
    const m = /[\p{L}\p{N}]/u.exec(String(name));
    return (m ? m[0] : "✦").toLocaleUpperCase("de-DE");
  };

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  const starSvg = (on = true) =>
    `<svg class="star${on ? " is-on" : ""}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;

  function starsHtml(rating, extraClass = "") {
    const r = clampRating(rating);
    let out = `<span class="stars ${extraClass}" role="img" aria-label="${r} von 5 Sternen">`;
    for (let i = 1; i <= 5; i++) out += starSvg(i <= r);
    return out + "</span>";
  }

  /* =========================================================
     Bausteine
     ========================================================= */
  function mediaHtml(entry, withBadge = true) {
    const [a, b, ink] = PALETTEN[hashIndex(entry.name + entry.typ, PALETTEN.length)];
    const foto = safeUrl(entry.foto);
    return (
      '<div class="media">' +
        `<div class="ph" style="--ph-a:${a};--ph-b:${b};--ph-ink:${ink}">` +
          `<span class="ph-initial">${escapeHtml(initial(entry.name))}</span>` +
          `<span class="ph-icon">${ICONS[entry.typ]}</span>` +
        "</div>" +
        (foto ? `<img src="${escapeHtml(foto)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : "") +
        (withBadge ? `<span class="badge badge--${entry.typ}">${ICONS[entry.typ]}${escapeHtml(entry.typ)}</span>` : "") +
      "</div>"
    );
  }

  // Varianten: "grid" (Standard), "feature" (großer Favorit), "mini" (kleiner Favorit), "preview" (Formular)
  function cardHtml(entry, variant = "grid", index) {
    const title = variant === "preview"
      ? escapeHtml(entry.name)
      : `<button type="button" class="card-open" data-key="${escapeHtml(entry._key)}">${escapeHtml(entry.name)}</button>`;
    const delay = typeof index === "number" ? ` style="--i:${Math.min(index, 12)}"` : "";
    const kicker = variant === "feature" ? `<p class="card-kicker">${starSvg()} Bestbewertet</p>` : "";
    const type = variant === "mini" ? `<p class="card-type card-type--${entry.typ}">${escapeHtml(entry.typ)}</p>` : "";
    const note = entry.notiz && variant !== "mini" ? `<p class="card-note">${escapeHtml(entry.notiz)}</p>` : "";
    const date = entry.datum ? `<time datetime="${escapeHtml(entry.datum)}">${escapeHtml(formatDate(entry.datum))}</time>` : "";

    return (
      `<article class="card card--${variant}"${delay}>` +
        mediaHtml(entry, variant !== "mini") +
        '<div class="card-body">' +
          kicker + type +
          `<h3 class="card-title">${title}</h3>` +
          note +
          `<div class="card-meta">${starsHtml(entry.bewertung)}${date}</div>` +
        "</div>" +
      "</article>"
    );
  }

  /* =========================================================
     Darstellung
     ========================================================= */
  function compare(a, b) {
    const [key, order] = state.sort.split("-");
    const dir = order === "asc" ? 1 : -1;
    const byDate = String(a.datum).localeCompare(String(b.datum));
    const byRating = a.bewertung - b.bewertung;
    const cmp = key === "bewertung" ? byRating || byDate : byDate || byRating;
    return cmp * dir || a.name.localeCompare(b.name, "de");
  }

  function groupInfo(entry) {
    if (state.sort.startsWith("bewertung")) {
      const r = entry.bewertung;
      return { key: "r" + r, title: escapeHtml(STERNE_TEXT[r]), deco: r ? starsHtml(r, "stars--sm") : "" };
    }
    const p = parseDate(entry.datum);
    if (!p) return { key: "ohne", title: "Ohne Datum", deco: "" };
    return { key: `${p.y}-${p.m}`, title: `${MONATE[p.m - 1]} <em>${p.y}</em>`, deco: "" };
  }

  function renderStats() {
    const all = state.entries;
    if (!all.length) {
      el.stats.innerHTML = "<span>Die erste Seite wartet noch auf dich</span>";
      return;
    }
    const rezepte = all.filter((e) => e.typ === "Rezept").length;
    const rated = all.filter((e) => e.bewertung > 0);
    const parts = [
      `<strong>${all.length}</strong> ${all.length === 1 ? "Eintrag" : "Einträge"}`,
      `<strong>${rezepte}</strong> ${rezepte === 1 ? "Rezept" : "Rezepte"}`,
      `<strong>${all.length - rezepte}</strong> ${all.length - rezepte === 1 ? "Restaurant" : "Restaurants"}`
    ];
    if (rated.length) {
      const avg = rated.reduce((s, e) => s + e.bewertung, 0) / rated.length;
      parts.push(`Ø <strong>${avg.toFixed(1).replace(".", ",")}</strong> ${starSvg()}`);
    }
    el.stats.innerHTML = parts.map((p) => `<span>${p}</span>`).join("");
  }

  function renderFeatured() {
    const all = state.entries;
    const favs = all.length >= FAVORITEN_AB
      ? all
          .filter((e) => e.bewertung >= 4)
          .sort((a, b) => b.bewertung - a.bewertung || String(b.datum).localeCompare(String(a.datum)))
          .slice(0, 3)
      : [];
    el.featured.hidden = favs.length === 0;
    el.featuredGrid.className = `featured-grid featured-grid--n${favs.length}`;
    el.featuredGrid.innerHTML = favs.map((e, i) => cardHtml(e, i === 0 ? "feature" : "mini", i)).join("");
  }

  function renderTabs() {
    const counts = { Alle: state.entries.length, Rezept: 0, Restaurant: 0 };
    state.entries.forEach((e) => counts[e.typ]++);
    document.querySelectorAll("[data-count]").forEach((span) => {
      span.textContent = counts[span.dataset.count];
    });
    el.tabs.forEach((tab) => {
      const active = tab.dataset.filter === state.filter;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
  }

  function renderList() {
    const total = state.entries.length;
    el.listHead.hidden = total === 0;
    el.toolbar.hidden = total === 0;

    const list = state.entries
      .filter((e) => state.filter === "Alle" || e.typ === state.filter)
      .sort(compare);

    if (!list.length) {
      el.list.innerHTML = "";
      renderEmpty(total);
      return;
    }
    el.empty.hidden = true;
    el.empty.innerHTML = "";

    const groups = [];
    list.forEach((entry) => {
      const info = groupInfo(entry);
      let last = groups[groups.length - 1];
      if (!last || last.key !== info.key) {
        last = { ...info, items: [] };
        groups.push(last);
      }
      last.items.push(entry);
    });

    let index = 0;
    el.list.innerHTML = groups.map((g) =>
      '<section class="group">' +
        '<header class="group-head">' +
          `<h3 class="group-title">${g.deco}<span>${g.title}</span></h3>` +
          `<span class="group-count">${plural(g.items.length, "Eintrag", "Einträge")}</span>` +
        "</header>" +
        `<div class="grid">${g.items.map((e) => cardHtml(e, "grid", index++)).join("")}</div>` +
      "</section>"
    ).join("");
  }

  function renderEmpty(total) {
    el.empty.hidden = false;
    if (total === 0) {
      el.empty.className = "empty";
      el.empty.innerHTML =
        EMPTY_ART +
        "<h2>Die erste Seite ist <em>noch leer</em></h2>" +
        "<p>Hier entsteht deine Sammlung aus Lieblingsrezepten und Restaurants, " +
        "die man nicht vergessen sollte. Fang einfach mit dem ersten Eintrag an.</p>" +
        '<a class="btn btn-primary" href="#hinzufuegen">Ersten Eintrag anlegen</a>';
    } else {
      const label = state.filter === "Rezept" ? "Rezepte" : "Restaurants";
      el.empty.className = "empty empty--small";
      el.empty.innerHTML =
        `<h2>Noch keine <em>${escapeHtml(label)}</em></h2>` +
        "<p>Für diesen Filter gibt es noch nichts. Zeig alle Einträge an oder lege einen neuen an.</p>" +
        '<button type="button" class="btn btn-ghost" data-action="show-all">Alle anzeigen</button>';
    }
  }

  function renderAll() {
    renderStats();
    renderTabs();
    renderFeatured();
    renderList();
  }

  function showLoadError() {
    el.stats.innerHTML = "<span>Einträge konnten nicht geladen werden</span>";
    el.listHead.hidden = true;
    el.toolbar.hidden = true;
    el.empty.hidden = false;
    el.empty.className = "empty empty--small";
    el.empty.innerHTML =
      "<h2>Da ist etwas <em>angebrannt</em></h2>" +
      "<p>Prüfe, ob <code>data/entries.json</code> gültiges JSON enthält. " +
      "Lokal muss die Seite über einen Webserver geöffnet werden, nicht per Doppelklick.</p>";
  }

  /* =========================================================
     Detailansicht
     ========================================================= */
  function openDetail(key) {
    const e = state.entries.find((x) => x._key === key);
    if (!e || typeof el.detail.showModal !== "function") return;
    el.detailBody.innerHTML =
      mediaHtml(e, true) +
      '<div class="detail-body">' +
        `<h2 id="detail-title" class="detail-title">${escapeHtml(e.name)}</h2>` +
        '<div class="detail-meta">' +
          starsHtml(e.bewertung) +
          `<span class="detail-word">${escapeHtml(URTEIL[e.bewertung])}</span>` +
          (e.datum ? `<time class="detail-date" datetime="${escapeHtml(e.datum)}">${escapeHtml(formatDate(e.datum, true))}</time>` : "") +
        "</div>" +
        (e.notiz
          ? `<p class="detail-note">${escapeHtml(e.notiz)}</p>`
          : '<p class="detail-note is-empty">Zu diesem Eintrag gibt es noch keine Notiz.</p>') +
      "</div>";
    el.detail.showModal();
    el.detail.scrollTop = 0;
  }

  el.detailClose.innerHTML = ICON_CLOSE;
  el.detail.addEventListener("click", (ev) => {
    if (ev.target === el.detail) el.detail.close();
  });

  /* =========================================================
     Daten laden
     ========================================================= */
  function normalize(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e && typeof e === "object" && String(e.name ?? "").trim())
      .map((e, i) => ({
        _key: "e" + i,
        id: String(e.id ?? ""),
        name: String(e.name).trim(),
        typ: TYPEN.includes(e.typ) ? e.typ : "Rezept",
        bewertung: clampRating(e.bewertung),
        notiz: e.notiz ? String(e.notiz) : "",
        foto: e.foto ? String(e.foto) : "",
        datum: e.datum ? String(e.datum) : ""
      }));
  }

  async function load() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      state.entries = normalize(await res.json());
      renderAll();
    } catch (err) {
      console.error("Laden fehlgeschlagen:", err);
      showLoadError();
    }
  }

  /* =========================================================
     Filter, Sortierung, Klicks
     ========================================================= */
  function setFilter(filter) {
    state.filter = filter;
    renderTabs();
    renderList();
  }

  el.tabs.forEach((tab) => tab.addEventListener("click", () => setFilter(tab.dataset.filter)));
  el.sort.addEventListener("change", () => {
    state.sort = el.sort.value;
    renderList();
  });

  document.addEventListener("click", (ev) => {
    const open = ev.target.closest(".card-open");
    if (open) {
      openDetail(open.dataset.key);
      return;
    }
    if (ev.target.closest("[data-action='show-all']")) setFilter("Alle");
  });

  // Kaputte Bild-URLs: Bild entfernen, der Platzhalter darunter bleibt sichtbar.
  document.addEventListener("error", (ev) => {
    const t = ev.target;
    if (t instanceof HTMLImageElement && t.closest(".media")) t.remove();
  }, true);

  /* =========================================================
     Formular
     ========================================================= */
  document.querySelectorAll("[data-icon]").forEach((node) => { node.innerHTML = ICONS[node.dataset.icon]; });

  const starButtons = [];

  function paintStars(value) {
    starButtons.forEach((b, i) => b.classList.toggle("is-on", i < value));
    el.ratingWord.textContent = URTEIL[value];
  }

  function setRating(value) {
    state.rating = value;
    starButtons.forEach((b, i) => {
      b.setAttribute("aria-checked", String(i + 1 === value));
      b.tabIndex = (value ? i + 1 === value : i === 0) ? 0 : -1;
    });
    paintStars(value);
    updatePreview();
  }

  for (let n = 1; n <= 5; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "star-btn";
    b.innerHTML = starSvg(false).replace(" is-on", "");
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", `${n} ${n === 1 ? "Stern" : "Sterne"} – ${URTEIL[n]}`);
    b.addEventListener("click", () => {
      setRating(n);
      b.classList.remove("pop");
      void b.offsetWidth; // Animation neu starten
      b.classList.add("pop");
    });
    b.addEventListener("animationend", () => b.classList.remove("pop"));
    b.addEventListener("mouseenter", () => paintStars(n));
    b.addEventListener("keydown", (ev) => {
      let next = null;
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
  }
  el.starInput.addEventListener("mouseleave", () => paintStars(state.rating));

  function draftFromForm() {
    const fd = new FormData(el.form);
    const typ = String(fd.get("typ") || "");
    return {
      name: String(fd.get("name") || "").trim(),
      typ: TYPEN.includes(typ) ? typ : "Rezept",
      bewertung: state.rating,
      notiz: String(fd.get("notiz") || "").trim(),
      foto: String(fd.get("foto") || "").trim(),
      datum: String(fd.get("datum") || "")
    };
  }

  let previewFrame = 0;
  function updatePreview() {
    cancelAnimationFrame(previewFrame);
    previewFrame = requestAnimationFrame(() => {
      const d = draftFromForm();
      el.preview.innerHTML = cardHtml({
        ...d,
        name: d.name || "Name des Eintrags",
        notiz: d.notiz || "Deine Notiz erscheint hier.",
        _key: "preview"
      }, "preview");
      el.notizCount.textContent = `${el.notiz.value.length} / 1000`;
    });
  }

  function showError(message, field) {
    el.formError.textContent = message;
    el.formError.hidden = !message;
    if (field) {
      if (field.classList.contains("input")) field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  }

  function clearInvalid() {
    el.form.querySelectorAll("[aria-invalid]").forEach((f) => f.removeAttribute("aria-invalid"));
  }

  function githubEditUrl() {
    const host = window.location.hostname;
    if (!host.endsWith(".github.io")) return "";
    const owner = host.slice(0, -".github.io".length);
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    const repo = first && !first.includes(".") ? first : host;
    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/edit/main/data/entries.json`;
  }

  let copyTimer = 0;
  function resetCopyButton() {
    el.copyBtn.textContent = "In die Zwischenablage";
    el.copyBtn.classList.remove("is-done");
  }

  el.form.addEventListener("input", (ev) => {
    if (ev.target.hasAttribute("aria-invalid")) ev.target.removeAttribute("aria-invalid");
    updatePreview();
  });
  el.form.addEventListener("change", updatePreview);

  el.form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    clearInvalid();
    const d = draftFromForm();

    if (!d.name) return showError("Bitte gib einen Namen ein.", el.name);
    if (state.rating < 1) return showError("Bitte vergib 1 bis 5 Sterne.", starButtons[0]);
    if (!parseDate(d.datum)) return showError("Bitte wähle ein gültiges Datum.", el.datum);
    if (d.foto && !safeUrl(d.foto)) return showError("Die Foto-URL muss mit http:// oder https:// beginnen.", el.foto);
    showError("");

    const entry = { id: makeId(), name: d.name, typ: d.typ, bewertung: d.bewertung, notiz: d.notiz };
    if (d.foto) entry.foto = d.foto;
    entry.datum = d.datum;

    const json = JSON.stringify(entry, null, 2);
    el.jsonOut.value = json;
    el.jsonOut.rows = json.split("\n").length;

    const gh = githubEditUrl();
    el.ghEdit.hidden = !gh;
    if (gh) el.ghEdit.href = gh;

    resetCopyButton();
    el.output.hidden = false;
    el.output.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  el.form.addEventListener("reset", () => {
    setTimeout(() => {
      clearInvalid();
      showError("");
      el.datum.value = today();
      el.output.hidden = true;
      setRating(0);
    }, 0);
  });

  el.copyBtn.addEventListener("click", async () => {
    const text = el.jsonOut.value;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch { /* Fallback unten */ }
    if (!ok) {
      el.jsonOut.focus();
      el.jsonOut.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
    }
    el.copyBtn.textContent = ok ? "Kopiert ✓" : "Bitte mit Strg/Cmd + C kopieren";
    el.copyBtn.classList.toggle("is-done", ok);
    clearTimeout(copyTimer);
    copyTimer = setTimeout(resetCopyButton, 2600);
  });

  /* =========================================================
     Start
     ========================================================= */
  const now = new Date();
  el.issue.textContent = `Ausgabe ${MONATE[now.getMonth()]} ${now.getFullYear()}`;
  el.datum.value = today();
  setRating(0);
  load();
})();
