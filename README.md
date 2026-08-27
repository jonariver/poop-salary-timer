# 💩 Poop Salary Timer

Eine kleine Web-App, die misst, wie viel du während deiner Toilettenpause **verdienst**. Zeit ist Geld — auch hier.

## Features

- **Lohn-Eingabe:** Monatslohn + Arbeitsstunden pro Woche, alternativ direkt der Stundenlohn (Umrechnung: Monatslohn ÷ (Wochenstunden × 52 ÷ 12))
- **Live-Timer:** Start startet die Sitzung, mit tickender Verdienstanzeige auf vier Nachkommastellen
- **Pause & Hold-to-Stop:** Kurz auf Stop drücken pausiert; Stop ~0,9 s gedrückt halten beendet die Sitzung mit Zusammenfassung (Dauer, Verdienst, Fun-Fact)
- **Verlauf mit Statistiken:** Gesamtverdienst, Gesamtzeit, Anzahl und Ø pro Sitzung; Sessions einzeln löschbar
- **Nachtragen:** Vergessene Sitzungen lassen sich mit Datum, Uhrzeit und Dauer nachtragen (Label „nachgetragen")
- **10 Achievements:** vom 🎉 „Ersten Geschäft" über den ⚡ „Schnell-Scheißer" und die 🔥 „Pooping Streak" bis zum 👑 „Klo-Krösus" — mit Fortschrittsanzeige und Toast beim Freischalten
- **Teilen:** Session-Zusammenfassung und Erfolgsliste per Web Share API teilen (Fallback: Zwischenablage bzw. Kopier-Dialog)
- **Hell & Dunkel:** folgt dem System-Theme

## Datenschutz

Alle Daten (Lohn, Sitzungen, Erfolge) werden ausschließlich **lokal im Browser** gespeichert (`localStorage`). Kein Server, kein Konto, kein Tracking.

## Nutzung

Einfach `index.html` im Browser öffnen — die App ist eine einzelne, in sich geschlossene HTML-Datei ohne Build-Schritt und ohne Abhängigkeiten (nur die Google-Fonts werden von extern geladen, mit Fallback-Schriften).

## Technik

- Vanilla HTML/CSS/JS, eine Datei
- Timer auf Zeitstempel-Basis (`Date.now()`): läuft im Hintergrund-Tab korrekt weiter, eine laufende Sitzung übersteht sogar ein Neuladen
- `localStorage`-Keys: `pst_settings`, `pst_sessions`, `pst_active`, `pst_achievements`
- Design: Porzellan/Kachel-Optik mit Gold-Akzent; Fonts: Bricolage Grotesque + Spline Sans (Mono für Ziffern)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
