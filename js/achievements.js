// ---------- Achievements ----------
import { t, fmtMoney, fmtElapsed } from './i18n.js';
import { sessionStats, actKeyOf } from './stats.js';
import { getRawAchievements, saveAchievements } from './storage.js';

export var ACHIEVEMENTS = [
  {
    id: 'first',
    variants: {
      poop: { badge: '🎉', name: { de: 'Das erste Geschäft', en: 'The First Business' }, desc: { de: 'Deine erste Sitzung gespeichert. Jeder Cent zählt.', en: 'Your first session saved. Every cent counts.' } },
      smoke: { badge: '🎉', name: { de: 'Die erste Pause', en: 'The First Break' }, desc: { de: 'Deine erste Rauchpause gespeichert. Jede Kippe zählt.', en: 'Your first smoke break saved. Every cigarette counts.' } },
      coffee: { badge: '🎉', name: { de: 'Die erste Tasse', en: 'The First Cup' }, desc: { de: 'Deine erste Kaffeepause gespeichert. Jeder Schluck zählt.', en: 'Your first coffee break saved. Every sip counts.' } }
    },
    test: function (st) { return st.count >= 1; },
    progress: function (st) { return st.count + '/1'; }
  },
  {
    id: 'streak',
    variants: {
      poop: { badge: '🔥', name: { de: 'Pooping Streak', en: 'Pooping Streak' }, desc: { de: 'An 3 Tagen hintereinander eine Sitzung. Routine ist alles.', en: 'A session on 3 days in a row. Routine is everything.' } },
      smoke: { badge: '🔥', name: { de: 'Raucherpausen-Serie', en: 'Smoke Break Streak' }, desc: { de: 'An 3 Tagen hintereinander eine Rauchpause. Sucht hat Struktur.', en: 'A smoke break on 3 days in a row. Habits die hard.' } },
      coffee: { badge: '🔥', name: { de: 'Kaffeepausen-Serie', en: 'Coffee Break Streak' }, desc: { de: 'An 3 Tagen hintereinander eine Kaffeepause. Koffein-Konstanz.', en: 'A coffee break on 3 days in a row. Caffeine consistency.' } }
    },
    test: function (st) { return st.bestStreak >= 3; },
    progress: function (st) { return st.bestStreak + '/3 ' + t('unitDays'); }
  },
  {
    id: 'sitzfleisch',
    variants: {
      poop: { badge: '🪑', name: { de: 'Sitzfleisch', en: 'Marathon Sitter' }, desc: { de: 'Eine einzelne Sitzung von 15 Minuten oder mehr. Respekt.', en: 'A single session of 15 minutes or more. Respect.' } },
      smoke: { badge: '💨', name: { de: 'Kettenraucher-Session', en: 'Chain Smoker Session' }, desc: { de: 'Eine einzelne Rauchpause von 15 Minuten oder mehr. Starker Tobak.', en: 'A single smoke break of 15 minutes or more. Heavy stuff.' } },
      coffee: { badge: '🫘', name: { de: 'Kaffeeklatsch-Marathon', en: 'Coffee Klatsch Marathon' }, desc: { de: 'Eine einzelne Kaffeepause von 15 Minuten oder mehr. Gemütlich.', en: 'A single coffee break of 15 minutes or more. Cozy.' } }
    },
    test: function (st) { return st.maxDuration >= 15 * 60000; },
    progress: function (st) { return Math.floor(st.maxDuration / 60000) + '/15 ' + t('unitMinShort'); }
  },
  {
    id: 'gold',
    variants: {
      poop: { badge: '💰', name: { de: 'Goldene Schüssel', en: 'Golden Bowl' }, desc: { de: 'Insgesamt 10 € auf dem Thron verdient.', en: 'Earned €10 in total on the throne.' } },
      smoke: { badge: '💸', name: { de: 'Goldener Aschenbecher', en: 'Golden Ashtray' }, desc: { de: 'Insgesamt 10 € beim Rauchen verdient.', en: 'Earned €10 in total while smoking.' } },
      coffee: { badge: '🪙', name: { de: 'Goldene Kaffeetasse', en: 'Golden Coffee Cup' }, desc: { de: 'Insgesamt 10 € beim Kaffeetrinken verdient.', en: 'Earned €10 in total while drinking coffee.' } }
    },
    test: function (st) { return st.totalEarned >= 10; },
    progress: function (st) { return fmtMoney(Math.min(st.totalEarned, 10)) + '/10 €'; }
  },
  {
    id: 'early',
    variants: {
      poop: { badge: '🌅', name: { de: 'Frühschicht', en: 'Early Shift' }, desc: { de: 'Eine Sitzung vor 9 Uhr morgens. Der frühe Vogel verdient mit.', en: 'A session before 9 a.m. The early bird earns extra.' } },
      smoke: { badge: '🌅', name: { de: 'Morgenzigarette', en: 'Morning Cigarette' }, desc: { de: 'Eine Rauchpause vor 9 Uhr morgens. Der frühe Vogel qualmt.', en: 'A smoke break before 9 a.m. The early bird smokes.' } },
      coffee: { badge: '🌅', name: { de: 'Früher Kaffee', en: 'Early Brew' }, desc: { de: 'Eine Kaffeepause vor 9 Uhr morgens. Ohne geht nichts.', en: 'A coffee break before 9 a.m. Nothing works without it.' } }
    },
    test: function (st) { return st.hasEarly; },
    progress: function () { return '–'; }
  },
  {
    id: 'fast',
    variants: {
      poop: { badge: '⚡', name: { de: 'Schnell-Scheißer', en: 'Speed Pooper' }, desc: { de: 'Eine Sitzung unter 2 Minuten. Rein, raus, Geld mitgenommen.', en: 'A session under 2 minutes. In, out, money in the bank.' } },
      smoke: { badge: '⚡', name: { de: 'Kurzer Zug', en: 'Quick Puff' }, desc: { de: 'Eine Rauchpause unter 2 Minuten. Kurz, knackig, bezahlt.', en: 'A smoke break under 2 minutes. Short, sharp, paid.' } },
      coffee: { badge: '⚡', name: { de: 'Espresso-Shot', en: 'Espresso Shot' }, desc: { de: 'Eine Kaffeepause unter 2 Minuten. Rein, Koffein, raus.', en: 'A coffee break under 2 minutes. In, caffeine, out.' } }
    },
    test: function (st) { return st.minEligibleMs < 2 * 60000; },
    progress: function (st) { return st.minEligibleMs === Infinity ? '–' : t('bestTime') + fmtElapsed(st.minEligibleMs); }
  },
  {
    id: 'night',
    variants: {
      poop: { badge: '🦉', name: { de: 'Nachteule', en: 'Night Owl' }, desc: { de: 'Eine Sitzung zwischen 22 und 5 Uhr. Das Geschäft schläft nie.', en: 'A session between 10 p.m. and 5 a.m. Business never sleeps.' } },
      smoke: { badge: '🦉', name: { de: 'Nachtraucher', en: 'Night Smoker' }, desc: { de: 'Eine Rauchpause zwischen 22 und 5 Uhr. Die Kippe schläft nie.', en: 'A smoke break between 10 p.m. and 5 a.m. The cigarette never sleeps.' } },
      coffee: { badge: '🦉', name: { de: 'Nachtkaffee', en: 'Night Brew' }, desc: { de: 'Eine Kaffeepause zwischen 22 und 5 Uhr. Schlaf ist überbewertet.', en: 'A coffee break between 10 p.m. and 5 a.m. Sleep is overrated.' } }
    },
    test: function (st) { return st.hasNight; },
    progress: function () { return '–'; }
  },
  {
    id: 'double',
    variants: {
      poop: { badge: '🔁', name: { de: 'Doppelschicht', en: 'Double Shift' }, desc: { de: 'Zwei Sitzungen an einem Tag. Wer fleißig ist, darf auch zweimal.', en: 'Two sessions in one day. The diligent may go twice.' } },
      smoke: { badge: '🔁', name: { de: 'Doppelte Pause', en: 'Double Break' }, desc: { de: 'Zwei Rauchpausen an einem Tag. Warum nur einmal?', en: 'Two smoke breaks in one day. Why stop at one?' } },
      coffee: { badge: '🔁', name: { de: 'Doppel-Espresso-Tag', en: 'Double Brew Day' }, desc: { de: 'Zwei Kaffeepausen an einem Tag. Ein Kaffee reicht nie.', en: 'Two coffee breaks in one day. One coffee is never enough.' } }
    },
    test: function (st) { return st.maxSameDay >= 2; },
    progress: function (st) { return st.maxSameDay + '/2'; }
  },
  {
    id: 'regular',
    variants: {
      poop: { badge: '🚽', name: { de: 'Stammgast', en: 'Regular' }, desc: { de: '10 gespeicherte Sitzungen. Man kennt dich hier.', en: '10 saved sessions. They know you here.' } },
      smoke: { badge: '🚬', name: { de: 'Kettenraucher', en: 'Chain Smoker' }, desc: { de: '10 gespeicherte Rauchpausen. Die Raucherecke kennt dich.', en: '10 saved smoke breaks. The smoking corner knows you.' } },
      coffee: { badge: '☕', name: { de: 'Stammkunde', en: 'Regular Customer' }, desc: { de: '10 gespeicherte Kaffeepausen. Die Kaffeemaschine kennt dich.', en: '10 saved coffee breaks. The coffee machine knows you.' } }
    },
    test: function (st) { return st.count >= 10; },
    progress: function (st) { return Math.min(st.count, 10) + '/10'; }
  },
  {
    id: 'kroesus',
    variants: {
      poop: { badge: '👑', name: { de: 'Klo-Krösus', en: 'Throne Tycoon' }, desc: { de: 'Insgesamt 50 € verdient. Der Thron trägt seinen Namen zu Recht.', en: 'Earned €50 in total. The throne earns its name.' } },
      smoke: { badge: '👑', name: { de: 'Qualm-Krösus', en: 'Smoke Tycoon' }, desc: { de: 'Insgesamt 50 € beim Rauchen verdient. Geld geht buchstäblich in Rauch auf — zu deinen Gunsten.', en: 'Earned €50 in total while smoking. Money literally goes up in smoke — in your favor.' } },
      coffee: { badge: '👑', name: { de: 'Kaffee-Krösus', en: 'Coffee Tycoon' }, desc: { de: 'Insgesamt 50 € beim Kaffeetrinken verdient. Teuerste Tasse aller Zeiten — im positiven Sinne.', en: 'Earned €50 in total while drinking coffee. Most valuable cup ever — in a good way.' } }
    },
    test: function (st) { return st.totalEarned >= 50; },
    progress: function (st) { return fmtMoney(Math.min(st.totalEarned, 50)) + '/50 €'; }
  },
  {
    id: 'tax',
    variants: {
      poop: { badge: '🧾', name: { de: 'Steuerzahler des Monats', en: 'Taxpayer of the Month' }, desc: { de: 'Insgesamt 10 € an Abzügen „gespendet". Der Finanzminister dankt.', en: 'A total of €10 "donated" in deductions. The treasury thanks you.' } },
      smoke: { badge: '🧾', name: { de: 'Raucher-Steuerzahler', en: 'Smoker Taxpayer' }, desc: { de: 'Insgesamt 10 € an Abzügen beim Rauchen „gespendet". Zusätzlich zur Tabaksteuer.', en: 'A total of €10 "donated" in deductions while smoking. On top of the tobacco tax.' } },
      coffee: { badge: '🧾', name: { de: 'Kaffee-Steuerzahler', en: 'Coffee Taxpayer' }, desc: { de: 'Insgesamt 10 € an Abzügen beim Kaffeetrinken „gespendet". Der Finanzminister freut sich.', en: 'A total of €10 "donated" in deductions while drinking coffee. The treasury is pleased.' } }
    },
    test: function (st) { return st.totalDed >= 10; },
    progress: function (st) { return fmtMoney(Math.min(st.totalDed, 10)) + '/10 €'; }
  }
];

export function achVariant(a, cat) { return a.variants[cat] || a.variants.poop; }

export function migrateAchievements(raw) {
  if (raw && (raw.poop || raw.smoke || raw.coffee)) {
    return { poop: raw.poop || {}, smoke: raw.smoke || {}, coffee: raw.coffee || {} };
  }
  if (raw && Object.keys(raw).length) {
    // Altes Format vor der Aktivitäts-Trennung: als „poop" übernehmen
    var migrated = { poop: raw, smoke: {}, coffee: {} };
    saveAchievements(migrated);
    return migrated;
  }
  return { poop: {}, smoke: {}, coffee: {} };
}

export function checkAchievements(sessions) {
  var unlockedAll = migrateAchievements(getRawAchievements());
  var result = {};
  var anyNew = false;
  ['poop', 'smoke', 'coffee'].forEach(function (cat) {
    var catSessions = sessions.filter(function (s) { return actKeyOf(s.activity) === cat; });
    var st = sessionStats(catSessions);
    var unlocked = unlockedAll[cat];
    var newly = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (!unlocked[a.id] && a.test(st)) {
        unlocked[a.id] = Date.now();
        newly.push(a);
      }
    });
    if (newly.length) anyNew = true;
    result[cat] = { unlocked: unlocked, newly: newly, stats: st };
  });
  if (anyNew) saveAchievements(unlockedAll);
  return result;
}
