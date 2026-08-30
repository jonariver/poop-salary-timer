// ---------- Was gibt's Neues ----------
// Curated, user-facing changelog. Newest first. Ids increment; hasUnseen()
// compares against the last-seen id persisted via storage.js.

export var ENTRIES = [
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
