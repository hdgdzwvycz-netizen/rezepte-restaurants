# Genussbuch – Rezepte & Restaurants

Eine statische Webseite zum Sammeln und Bewerten von Rezepten und Restaurants. Reines HTML, CSS und JavaScript, ohne Build-Schritt und ohne Backend.

**Live:** https://hdgdzwvycz-netizen.github.io/rezepte-restaurants/

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenstruktur |
| `css/style.css` | Design im Kochbuch-Magazin-Stil (Fraunces + Inter, hell/dunkel umschaltbar) |
| `js/app.js` | Laden, Filtern, Sortieren, Favoriten, Detailansicht, Formular mit Live-Vorschau |
| `data/entries.json` | Alle Einträge (JSON-Array) |

## Neuen Eintrag hinzufügen

GitHub Pages kann keine Dateien schreiben. Deshalb erzeugt die Seite den Eintrag nur, und du speicherst ihn selbst:

1. Seite öffnen und das Formular **„Eintrag hinzufügen“** ausfüllen (Sterne anklicken).
2. **„JSON erzeugen“** und danach **„In die Zwischenablage“** klicken. Auf der Live-Seite öffnet der Button **„data/entries.json auf GitHub öffnen“** die Datei direkt im GitHub-Editor.
3. `data/entries.json` öffnen (lokal oder direkt auf GitHub über das Stift-Symbol) und den Eintrag in das Array einfügen. Mehrere Einträge werden durch Kommas getrennt:

   ```json
   [
     {
       "id": "3f2c…",
       "name": "Omas Käsespätzle",
       "typ": "Rezept",
       "bewertung": 5,
       "notiz": "Mit Röstzwiebeln!",
       "foto": "https://example.com/spaetzle.jpg",
       "datum": "2026-11-02"
     }
   ]
   ```

4. Änderung committen und pushen. Nach etwa einer Minute ist der Eintrag auf der Seite.

Vor dem Commit kannst du die Datei prüfen:

```bash
python3 -m json.tool data/entries.json > /dev/null
```

## Gestaltung

- Ab 4 Einträgen erscheint oben ein Bereich **Favoriten** mit den bis zu drei besten Einträgen (ab 4 Sternen).
- Einträge werden nach Monat gruppiert, bei Sortierung nach Bewertung nach Sternen.
- Ein Klick auf eine Karte öffnet die Detailansicht mit der vollständigen Notiz.
- Einträge ohne Foto bekommen einen Farbverlauf mit dem Anfangsbuchstaben.
- Fotos können auch im Repo liegen, z. B. `"foto": "img/spaetzle.jpg"`.

## Datenmodell

- `id`: eindeutige Kennung (erzeugt das Formular)
- `name`: Name des Rezepts oder Restaurants
- `typ`: `"Rezept"` oder `"Restaurant"`
- `bewertung`: 1 bis 5
- `notiz`: freier Text
- `foto`: Bild-URL (optional, sonst Platzhalter)
- `datum`: `YYYY-MM-DD`

## Lokal ansehen

`fetch` funktioniert nicht über `file://`. Starte im Projektordner einen kleinen Server:

```bash
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.
