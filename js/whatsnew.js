// ---------- Was gibt's Neues ----------
// Curated, user-facing changelog. Newest first. Ids increment; hasUnseen()
// compares against the last-seen id persisted via storage.js.

export var ENTRIES = [
  {
    id: 17,
    emoji: '🔥',
    title: { de: 'Heatmap: Umschalter & Monatsfilter', en: 'Heatmap: metric toggle & month filter' },
    body: {
      de: 'Die Sitzungs-Heatmap lässt sich jetzt zwischen Verdienst und Sitzungsanzahl umschalten und auf einen einzelnen Monat filtern.',
      en: 'The session heatmap can now switch between earnings and session count, and be filtered down to a single month.'
    }
  },
  {
    id: 16,
    emoji: '📊',
    title: { de: 'Monatsvergleich & persönliche Rekorde', en: 'Month comparison & personal records' },
    body: {
      de: 'Der Jahr-Tab zeigt jetzt, wie der aktuelle Monat im Vergleich zum letzten abschneidet, plus deinen besten Monat, die meisten Sitzungen an einem Tag und den höchsten Tagesverdienst.',
      en: 'The Year tab now shows how the current month compares to the last one, plus your best month, most sessions in a day, and highest daily earnings.'
    }
  },
  {
    id: 15,
    emoji: '🧾',
    title: { de: 'Netto-Details pro Sitzung', en: 'Net details per session' },
    body: {
      de: 'Sitzungen mit Netto-Schätzung zeigen jetzt ein 🧾-Symbol — antippen zeigt Netto, Abzug und Stundenlohn direkt in der Liste.',
      en: 'Sessions with a net estimate now show a 🧾 icon — tap it to see net, deducted, and hourly wage right in the list.'
    }
  },
  {
    id: 14,
    emoji: '🏆',
    title: { de: '5 neue Erfolge & Wochentag-Verdienst', en: '5 new achievements & weekday earnings' },
    body: {
      de: 'Neue Erfolgs-Stufen für 7-/30-Tage-Serien, 50/100 Sitzungen und 100 € Verdienst. Außerdem zeigt der Jahr-Tab jetzt, wie sich dein Verdienst auf die Wochentage verteilt.',
      en: 'New achievement tiers for 7-/30-day streaks, 50/100 sessions, and €100 earned. The Year tab also now shows how your earnings break down by weekday.'
    }
  },
  {
    id: 13,
    emoji: '🎭',
    title: { de: 'Mehr Sprüche', en: 'More sayings' },
    body: {
      de: 'Die Titel und Sprüche nach einer Sitzung gibt es jetzt in 10 statt 5 Varianten pro Aktivität — mehr Abwechslung beim Klo, Rauchen und Kaffee.',
      en: 'The titles and sayings after a session now come in 10 variants per activity instead of 5 — more variety for toilet, smoking, and coffee breaks.'
    }
  },
  {
    id: 12,
    emoji: '📤',
    title: { de: 'Session-Bilder beim Teilen', en: 'Session images when sharing' },
    body: {
      de: 'Geteilte Sitzungen bringen jetzt passend zu Klo, Rauchen oder Kaffee ihr eigenes Bild mit — sofern dein Gerät Datei-Sharing unterstützt.',
      en: 'Shared sessions now include a matching image for toilet, smoking, or coffee breaks — when your device supports file sharing.'
    }
  },
  {
    id: 11,
    emoji: '🧾',
    title: { de: 'Netto-Schätzung auf 2026 aktualisiert', en: 'Net estimate updated to 2026' },
    body: {
      de: 'Die Steuerparameter der Netto-Schätzung basierten noch auf 2025. Jetzt aktualisiert auf 2026 (Grundfreibetrag, Tarifzonen, Soli-Freigrenze) — deine Netto-Zahlen können sich dadurch leicht ändern.',
      en: 'The net estimate\'s tax parameters were still based on 2025. Updated to 2026 (basic allowance, tax brackets, solidarity surcharge threshold) — your net numbers may shift slightly as a result.'
    }
  },
  {
    id: 10,
    emoji: '📄',
    title: { de: 'Echter CSV-Download', en: 'Real CSV download' },
    body: {
      de: 'Der CSV-Export lädt jetzt eine richtige Datei herunter, statt nur den Text in die Zwischenablage zu kopieren.',
      en: 'CSV export now downloads an actual file instead of just copying the text to your clipboard.'
    }
  },
  {
    id: 9,
    emoji: '💾',
    title: { de: 'Export-Erinnerung', en: 'Export reminder' },
    body: {
      de: 'Da alles nur lokal gespeichert wird, erinnert dich die App jetzt ab und zu daran, deine Daten als CSV zu sichern.',
      en: 'Since everything is only stored locally, the app now nudges you every so often to back up your data as CSV.'
    }
  },
  {
    id: 8,
    emoji: '🔥',
    title: { de: 'Sitzungs-Heatmap', en: 'Session heatmap' },
    body: {
      de: 'Im Jahr-Tab siehst du jetzt eine GitHub-artige Heatmap deines Jahres. Tippe auf einen Tag für die Details.',
      en: 'The Year tab now shows a GitHub-style heatmap of your year. Tap a day for the details.'
    }
  },
  {
    id: 7,
    emoji: '🧾',
    title: { de: 'Dein Geschäftsjahr', en: 'Your business year' },
    body: {
      de: 'Neuer Tab mit Monatsverdienst, Rekorden des Jahres und einer Hochrechnung, wie viel am Jahresende zusammenkommt.',
      en: 'New tab with your monthly earnings, this year’s records, and a projection of what you’ll rack up by year’s end.'
    }
  },
  {
    id: 6,
    emoji: '💸',
    title: { de: 'Live-Meilensteine im Timer', en: 'Live milestones in the timer' },
    body: {
      de: 'Während du sitzt, siehst du jetzt in Echtzeit, was du dir schon leisten kannst — vom Kaffee bis zur PS5.',
      en: 'While you sit, you now see in real time what you can already afford — from coffee to a PS5.'
    }
  },
  {
    id: 5,
    emoji: '🧾',
    title: { de: 'Netto-Schätzung', en: 'Net estimate' },
    body: {
      de: 'Steuerklasse und Kirchensteuer eintragen und sehen, was nach Abzügen wirklich übrig bleibt.',
      en: 'Enter your tax class and church tax to see what actually stays in your pocket after deductions.'
    }
  },
  {
    id: 4,
    emoji: '📄',
    title: { de: 'CSV-Export & -Import', en: 'CSV export & import' },
    body: {
      de: 'Sitzungen als Tabelle exportieren oder importieren — praktisch für ein eigenes Backup oder eigene Auswertungen.',
      en: 'Export or import your sessions as a spreadsheet — handy for your own backup or analysis.'
    }
  },
  {
    id: 3,
    emoji: '🌍',
    title: { de: 'Deutsch & Englisch', en: 'German & English' },
    body: {
      de: 'Die App spricht jetzt auch Englisch. Einfach oben rechts umschalten.',
      en: 'The app now speaks English too. Just switch it in the top right.'
    }
  },
  {
    id: 2,
    emoji: '🚬☕',
    title: { de: 'Rauchen & Kaffee', en: 'Smoking & coffee' },
    body: {
      de: 'Nicht nur fürs Klo: Jetzt lassen sich auch Rauch- und Kaffeepausen erfassen.',
      en: 'Not just for the bathroom anymore: now you can also track smoke and coffee breaks.'
    }
  },
  {
    id: 1,
    emoji: '🎉',
    title: { de: 'Los geht\'s!', en: 'Here we go!' },
    body: {
      de: 'Poop Salary Timer ist da: Timer, Verlauf, Erfolge und eine Teilen-Funktion.',
      en: 'Poop Salary Timer is here: timer, history, achievements, and a share feature.'
    }
  }
];

export function latestId() { return ENTRIES.length ? ENTRIES[0].id : null; }

export function hasUnseen(lastSeenId) {
  return ENTRIES.length > 0 && (lastSeenId == null || ENTRIES[0].id > lastSeenId);
}
