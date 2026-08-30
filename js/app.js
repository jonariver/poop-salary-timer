import * as storage from './storage.js';
import * as i18n from './i18n.js';
import * as salary from './salary.js';
import * as stats from './stats.js';
import * as achievements from './achievements.js';
import * as timer from './timer.js';
import * as whatsnew from './whatsnew.js';
import * as sharing from './share.js';

(function () {
  'use strict';

  var t = i18n.t;

  // ---------- Aktivität (Kacken / Rauchen / Kaffee) ----------
  var ACT_EMOJI = { poop: '💩', smoke: '🚬', coffee: '☕' };
  var SUMMARY_EMOJI = { poop: '🧻', smoke: '🚬', coffee: '☕' };
  var activity = stats.actKeyOf(storage.getActivity());

  // ---------- Settings ----------
  var settings = storage.getSettings(); // {mode:'monthly'|'hourly', monthly, hoursPerWeek, hourly, rate}

  // ---------- Elements ----------
  function $(id) { return document.getElementById(id); }
  var views = { setup: $('view-setup'), timer: $('view-timer'), summary: $('view-summary'), history: $('view-history'), year: $('view-year'), achievements: $('view-achievements') };
  var tabBar = $('tab-bar');

  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].classList.toggle('hidden', k !== name); });
    var firstRun = name === 'setup' && !settings;
    tabBar.classList.toggle('hidden', firstRun || name === 'summary');
    $('tab-timer').setAttribute('aria-current', String(name === 'timer'));
    $('tab-history').setAttribute('aria-current', String(name === 'history'));
    $('tab-year').setAttribute('aria-current', String(name === 'year'));
    $('tab-achievements').setAttribute('aria-current', String(name === 'achievements'));
    $('tab-settings').setAttribute('aria-current', String(name === 'setup'));
    $('btn-save-settings').textContent = settings ? t('btnSaveChanges') : t('btnSaveFirst');
  }

  // ---------- Setup form ----------
  var mode = (settings && settings.mode) || 'monthly';
  function renderModeSwitch() {
    $('mode-monthly').setAttribute('aria-pressed', String(mode === 'monthly'));
    $('mode-hourly').setAttribute('aria-pressed', String(mode === 'hourly'));
    $('fields-monthly').classList.toggle('hidden', mode !== 'monthly');
    $('fields-hourly').classList.toggle('hidden', mode !== 'hourly');
    updateDerived();
  }
  $('mode-monthly').addEventListener('click', function () { mode = 'monthly'; renderModeSwitch(); });
  $('mode-hourly').addEventListener('click', function () { mode = 'hourly'; renderModeSwitch(); });

  function parseNum(el) {
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isFinite(v) ? v : NaN;
  }
  function updateDerived() {
    var box = $('derived-rate');
    if (mode !== 'monthly') { box.classList.add('hidden'); return; }
    var m = parseNum($('inp-monthly')), h = parseNum($('inp-hours'));
    if (m > 0 && h > 0) {
      var r = m / (h * 52 / 12);
      $('derived-value').textContent = i18n.fmtMoney(r);
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }
  $('inp-monthly').addEventListener('input', updateDerived);
  $('inp-hours').addEventListener('input', updateDerived);

  function fillSetupForm() {
    if (!settings) return;
    mode = settings.mode || mode;
    if (settings.monthly) $('inp-monthly').value = settings.monthly;
    if (settings.hoursPerWeek) $('inp-hours').value = settings.hoursPerWeek;
    if (settings.hourly) $('inp-rate').value = settings.hourly;
    $('inp-taxclass').value = settings.taxClass || '';
    $('inp-church').checked = !!settings.church;
    $('inp-church-rate').value = String(Number(settings.churchRate) === 8 ? 8 : 9);
    $('inp-dedlabel').value = settings.dedLabel || '';
    renderModeSwitch();
  }

  $('btn-save-settings').addEventListener('click', function () {
    var err = $('form-error');
    var s = { mode: mode };
    if (mode === 'monthly') {
      s.monthly = parseNum($('inp-monthly'));
      s.hoursPerWeek = parseNum($('inp-hours'));
      if (!(s.monthly > 0) || !(s.hoursPerWeek > 0)) { err.style.display = 'block'; return; }
    } else {
      s.hourly = parseNum($('inp-rate'));
      if (!(s.hourly > 0)) { err.style.display = 'block'; return; }
    }
    err.style.display = 'none';
    s.rate = salary.computeRate(s);
    s.taxClass = $('inp-taxclass').value || null;
    s.church = $('inp-church').checked;
    s.churchRate = Number($('inp-church-rate').value) === 8 ? 8 : 9;
    s.dedLabel = $('inp-dedlabel').value.trim();
    settings = s;
    storage.saveSettings(s);
    renderRateChip();
    show('timer');
    renderTimer();
  });

  $('chip-rate').addEventListener('click', function () {
    fillSetupForm();
    show('setup');
  });
  function renderRateChip() {
    var r = settings ? settings.rate : 0;
    $('chip-rate-text').textContent = i18n.fmtMoney(r) + '/h';
  }

  // ---------- Timer rendering ----------
  var stateLabel = $('state-label'), moneyEl = $('money-display'), elapsedEl = $('elapsed-display');
  var btnStart = $('btn-start'), btnStop = $('btn-stop'), holdHint = $('hold-hint');
  var milestoneEl = $('milestone-display');
  var lastMilestoneIndex = -1;
  var milestoneFlashTimer = null;

  function renderTimer() {
    var active = timer.getActive();
    var ms = timer.elapsedMs();
    var earned = settings ? salary.calculateEarnings(ms, settings.rate) : 0;
    moneyEl.textContent = i18n.fmtMoneyLive(earned);
    moneyEl.classList.toggle('zero', ms === 0);
    var netInfo = salary.computeNet(earned, settings);
    var netEl = $('net-display');
    netEl.classList.toggle('hidden', !netInfo);
    if (netInfo) netEl.innerHTML = t('netLabel') + ' <strong>' + i18n.fmtMoneyLive(netInfo.net) + '</strong>';
    milestoneEl.classList.toggle('hidden', !settings);
    if (settings) {
      var milestoneStatus = salary.milestoneStatus(earned, salary.MILESTONE_PRICES);
      milestoneEl.textContent = i18n.fmtMilestoneMessage(milestoneStatus);
      if (milestoneStatus.reachedIndex > lastMilestoneIndex) {
        milestoneEl.classList.add('flash');
        if (milestoneFlashTimer) clearTimeout(milestoneFlashTimer);
        milestoneFlashTimer = setTimeout(function () { milestoneEl.classList.remove('flash'); }, 700);
      }
      lastMilestoneIndex = milestoneStatus.reachedIndex;
    }
    elapsedEl.textContent = i18n.fmtElapsed(ms);
    var running = !!(active && active.startTs);
    var paused = !!(active && !active.startTs && active.accumulatedMs > 0);
    var actKey = stats.actKeyOf(active ? active.activity : activity);
    stateLabel.textContent = ACT_EMOJI[actKey] + ' ' + (running ? t('stateRunning') : (paused ? t('statePaused') : t('stateReady')));
    btnStart.textContent = paused ? t('btnResume') : t('btnStart');
    btnStart.classList.toggle('hidden', running);
    btnStop.classList.toggle('hidden', !running && !paused);
    holdHint.innerHTML = (running || paused) ? t('holdHint') : '&nbsp;';
  }
  function renderActivityPicker() {
    var active = timer.getActive();
    var current = stats.actKeyOf(active ? active.activity : activity);
    ['poop', 'smoke', 'coffee'].forEach(function (k) {
      $('act-' + k).setAttribute('aria-pressed', String(k === current));
    });
    $('activity-picker').classList.toggle('locked', !!active);
  }
  ['poop', 'smoke', 'coffee'].forEach(function (k) {
    $('act-' + k).addEventListener('click', function () {
      if (timer.getActive()) return;
      activity = k;
      storage.saveActivity(k);
      renderActivityPicker();
      renderTimer();
    });
  });
  var tickHandle = null;
  function startTicking() {
    if (tickHandle) return;
    tickHandle = setInterval(renderTimer, 60);
  }
  function stopTicking() {
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  }

  btnStart.addEventListener('click', function () {
    timer.startOrResume(activity);
    startTicking();
    renderTimer();
    renderActivityPicker();
  });

  // ---------- Stop: short press = pause, long press = end ----------
  var HOLD_MS = 900;
  var holdTimer = null, heldToEnd = false;

  function beginHold() {
    heldToEnd = false;
    btnStop.classList.add('holding');
    holdTimer = setTimeout(function () {
      heldToEnd = true;
      endSession();
    }, HOLD_MS);
  }
  function cancelHold(firePause) {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    btnStop.classList.remove('holding');
    if (firePause && !heldToEnd) pauseTimer();
    heldToEnd = false;
  }
  function pauseTimer() {
    timer.pause();
    stopTicking();
    renderTimer();
  }
  btnStop.addEventListener('pointerdown', function (e) { e.preventDefault(); beginHold(); });
  btnStop.addEventListener('pointerup', function () { cancelHold(true); });
  btnStop.addEventListener('pointerleave', function () { cancelHold(false); });
  btnStop.addEventListener('pointercancel', function () { cancelHold(false); });
  btnStop.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  btnStop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pauseTimer(); }
    if (e.key === 'e' || e.key === 'E') { endSession(); } // Tastatur-Alternative zum Halten
  });

  // ---------- Summary ----------
  function endSession() {
    cancelHold(false);
    var result = timer.end(); // {durationMs, activity}
    var earned = settings ? salary.calculateEarnings(result.durationMs, settings.rate) : 0;
    var sessActivity = stats.actKeyOf(result.activity !== undefined ? result.activity : activity);
    stopTicking();
    pendingSummary = { durationMs: result.durationMs, earned: earned, ts: Date.now(), tax: salary.computeNet(earned, settings), activity: sessActivity };
    lastSummary = pendingSummary;
    var titleList = t('titles')[sessActivity] || t('titles').poop;
    lastTitleIdx = Math.floor(Math.random() * titleList.length);
    renderSummary();
    show('summary');
    renderActivityPicker();
  }

  function renderSummary() {
    if (!lastSummary) return;
    var sessActivity = stats.actKeyOf(lastSummary.activity);
    $('summary-emoji').textContent = SUMMARY_EMOJI[sessActivity];
    var titleList = t('titles')[sessActivity] || t('titles').poop;
    $('summary-title').textContent = titleList[lastTitleIdx % titleList.length];
    $('summary-sub').textContent = t('summarySub')(i18n.fmtDurationWords(lastSummary.durationMs));
    $('summary-duration').textContent = i18n.fmtElapsed(lastSummary.durationMs);
    $('summary-earned').textContent = i18n.fmtMoney(lastSummary.earned);
    $('summary-fact').textContent = i18n.funFact(lastSummary.earned);
    var tax = lastSummary.tax;
    $('sum-k-earned').textContent = tax ? t('sumKGross') : t('sumKEarned');
    $('sum-tile-net').classList.toggle('hidden', !tax);
    $('sum-tile-ded').classList.toggle('hidden', !tax);
    $('ded-block').classList.toggle('hidden', !tax);
    $('funded-block').classList.toggle('hidden', !tax);
    if (!tax) return;
    $('summary-net').textContent = i18n.fmtMoney(tax.net);
    $('summary-ded').textContent = i18n.fmtMoney(tax.ded);
    var label = (settings && settings.dedLabel) ? settings.dedLabel : t('dedLabelDefault');
    $('ded-headline').textContent = label + ' ' + i18n.fmtMoney(tax.ded);
    var parts = [[t('dedLst'), tax.lst], [t('dedSoli'), tax.soli], [t('dedChurch'), tax.church], [t('dedSv'), tax.sv]];
    $('ded-parts').textContent = parts
      .filter(function (p) { return p[1] > 0.00005; })
      .map(function (p) { return p[0] + ' ' + i18n.fmtMoney(p[1]); })
      .join(' · ');
    $('funded-title').textContent = t('fundedTitle');
    $('funded-disclaimer').textContent = t('fundedDisclaimer');
    var list = $('funded-list');
    list.innerHTML = '';
    t('fundedItems').forEach(function (name, i) {
      var li = document.createElement('li');
      li.textContent = i18n.fmtFunded(tax.ded / salary.FUND_RATES[i]) + ' ' + name;
      list.appendChild(li);
    });
  }

  $('btn-save-session').addEventListener('click', function () {
    if (pendingSummary) {
      var sessions = storage.getSessions() || [];
      var entry = {
        id: pendingSummary.ts,
        ts: pendingSummary.ts,
        durationMs: pendingSummary.durationMs,
        earned: pendingSummary.earned,
        rate: settings ? settings.rate : 0,
        activity: stats.actKeyOf(pendingSummary.activity)
      };
      if (pendingSummary.tax) { entry.net = pendingSummary.tax.net; entry.ded = pendingSummary.tax.ded; }
      sessions.unshift(entry);
      storage.saveSessions(sessions);
      pendingSummary = null;
    }
    renderHistory();
    show('history');
    renderTimer();
  });
  $('btn-discard-session').addEventListener('click', function () {
    pendingSummary = null;
    show('timer');
    renderTimer();
  });

  // ---------- History ----------
  function checkAndToastAchievements(sessions) {
    var achAll = achievements.checkAchievements(sessions);
    renderAchievements(achAll);
    var newlyFlat = [];
    ['poop', 'smoke', 'coffee'].forEach(function (cat) {
      achAll[cat].newly.forEach(function (a) { newlyFlat.push({ cat: cat, a: a }); });
    });
    if (newlyFlat.length) showToasts(newlyFlat);
    return achAll;
  }

  function renderHistory() {
    var sessions = storage.getSessions() || [];
    sessions.sort(function (a, b) { return b.ts - a.ts; });

    checkAndToastAchievements(sessions);
    renderExportReminder(sessions);

    var list = $('session-list');
    list.innerHTML = '';
    $('empty-history').classList.toggle('hidden', sessions.length > 0);

    var totalEarned = 0, totalMs = 0, totalNet = 0, totalDed = 0;
    sessions.forEach(function (s) {
      totalEarned += s.earned;
      totalMs += s.durationMs;
      if (typeof s.net === 'number') totalNet += s.net;
      if (typeof s.ded === 'number') totalDed += s.ded;
    });
    var showTax = totalDed > 0 || !!salary.computeTaxRates(settings);
    $('stat-tile-net').classList.toggle('hidden', !showTax);
    $('stat-tile-ded').classList.toggle('hidden', !showTax);
    $('stat-total-net').textContent = i18n.fmtMoney(totalNet);
    $('stat-total-ded').textContent = i18n.fmtMoney(totalDed);
    $('stat-total-earned').textContent = i18n.fmtMoney(totalEarned);
    $('stat-total-time').textContent = i18n.fmtDurationWords(totalMs);
    $('stat-count').textContent = String(sessions.length);
    $('stat-avg').textContent = sessions.length
      ? i18n.fmtMoney(totalEarned / sessions.length) + ' / ' + i18n.fmtDurationWords(totalMs / sessions.length)
      : '–';

    sessions.forEach(function (s) {
      var li = document.createElement('li');
      var d = new Date(s.ts);
      var actEl = document.createElement('span');
      actEl.className = 'session-activity';
      actEl.textContent = ACT_EMOJI[stats.actKeyOf(s.activity)];
      var when = document.createElement('div');
      when.className = 'session-when';
      var dEl = document.createElement('div'); dEl.className = 'd'; dEl.textContent = i18n.getDateFmt().format(d);
      if (s.manual) {
        var tag = document.createElement('span');
        tag.className = 'session-tag';
        tag.textContent = t('tagBackfilled');
        dEl.appendChild(tag);
      }
      var tEl = document.createElement('div'); tEl.className = 't'; tEl.textContent = i18n.getTimeFmt().format(d) + t('clockSuffix');
      when.appendChild(dEl); when.appendChild(tEl);
      var dur = document.createElement('span'); dur.className = 'session-dur'; dur.textContent = i18n.fmtElapsed(s.durationMs);
      var earn = document.createElement('span'); earn.className = 'session-earn'; earn.textContent = i18n.fmtMoney(s.earned);
      var del = document.createElement('button');
      del.className = 'session-del';
      del.setAttribute('aria-label', t('delAria'));
      del.textContent = '✕';
      del.addEventListener('click', function () {
        var all = (storage.getSessions() || []).filter(function (x) { return x.id !== s.id; });
        storage.saveSessions(all);
        renderHistory();
      });
      li.appendChild(actEl); li.appendChild(when); li.appendChild(dur); li.appendChild(earn); li.appendChild(del);
      list.appendChild(li);
    });
  }

  // ---------- Export-Reminder ----------
  function renderExportReminder(sessions) {
    var banner = $('export-reminder');
    if (!sessions.length) { banner.classList.add('hidden'); return; }
    var now = Date.now();
    var lastExport = storage.getLastExport();
    var reference = lastExport || Math.min.apply(null, sessions.map(function (s) { return s.ts; }));
    var daysSince = (now - reference) / 86400000;
    var dismissedAt = storage.getExportReminderDismissed();
    var snoozed = dismissedAt && (now - dismissedAt) / 86400000 < 7;
    if (daysSince < 14 || snoozed) { banner.classList.add('hidden'); return; }
    $('export-reminder-text').textContent = lastExport
      ? t('exportReminderTextDays')(Math.floor(daysSince))
      : t('exportReminderTextNever');
    banner.classList.remove('hidden');
  }

  function downloadCsv(csvText) {
    var d = new Date();
    var localDate = d.getFullYear() + '-' + i18n.pad(d.getMonth() + 1) + '-' + i18n.pad(d.getDate());
    var blob = new Blob(['﻿' + csvText], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'poop-salary-timer-' + localDate + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function runCsvExport() {
    var sessions = storage.getSessions() || [];
    if (!sessions.length) { infoToast(t('toastNoExport')); return; }
    try {
      downloadCsv(stats.csvFromSessions(sessions));
    } catch (e) {
      infoToast(t('toastExportFailed'));
      return;
    }
    storage.saveLastExport(Date.now());
    infoToast(t('toastExported'));
    renderExportReminder(sessions);
  }

  // ---------- Geschäftsjahr ----------
  function renderYear() {
    var y = stats.businessYearStats(storage.getSessions() || [], new Date());
    $('stat-month-earned').textContent = i18n.fmtMoney(y.monthEarned);
    $('stat-month-count').textContent = String(y.monthCount);
    $('stat-year-avg').textContent = y.yearCount ? i18n.fmtMoney(y.yearAvg) : '–';
    $('stat-best-weekday').textContent = y.bestWeekdayIdx >= 0 ? i18n.fmtWeekdayLong(y.bestWeekdayTs) : '–';
    $('stat-longest').textContent = y.longest ? i18n.fmtDurationWords(y.longest.durationMs) : '–';
    $('stat-priciest').textContent = y.priciest ? i18n.fmtMoney(y.priciest.earned) : '–';
    $('stat-year-time').textContent = i18n.fmtDurationWords(y.yearTotalMs);
    $('stat-streak').textContent = String(y.currentStreak);
    $('stat-best-streak').textContent = String(y.bestStreak);
    $('year-projection').classList.toggle('hidden', !y.projectionEligible);
    $('year-not-enough-data').classList.toggle('hidden', y.projectionEligible);
    if (y.projectionEligible) $('year-projection-value').textContent = i18n.fmtMoney(y.projection);
    renderHeatmap();
  }

  var selectedHeatmapCell = null;
  function selectHeatmapDay(day, cell) {
    if (selectedHeatmapCell) selectedHeatmapCell.classList.remove('selected');
    cell.classList.add('selected');
    selectedHeatmapCell = cell;
    var dateStr = i18n.getDateFmt().format(new Date(day.ts));
    $('heatmap-detail').textContent = day.count
      ? t('heatmapDetailSome')(dateStr, day.count, i18n.fmtDurationWords(day.durationMs), i18n.fmtMoney(day.earned))
      : t('heatmapDetailNone')(dateStr);
  }

  function renderHeatmap() {
    var now = new Date();
    var todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var h = stats.yearHeatmap(storage.getSessions() || [], now);
    var monthsEl = $('heatmap-months');
    var gridEl = $('heatmap-grid');
    monthsEl.innerHTML = '';
    gridEl.innerHTML = '';
    selectedHeatmapCell = null;
    var todayCell = null;

    var lastMonth = -1;
    h.weeks.forEach(function (week) {
      var monthLabel = document.createElement('div');
      var firstDay = week.filter(function (c) { return c; })[0];
      if (firstDay) {
        var m = new Date(firstDay.ts).getMonth();
        if (m !== lastMonth) { monthLabel.textContent = i18n.fmtMonthShort(firstDay.ts); lastMonth = m; }
      }
      monthsEl.appendChild(monthLabel);

      week.forEach(function (day) {
        var cell = document.createElement('button');
        cell.className = 'heatmap-cell';
        cell.type = 'button';
        if (!day) {
          cell.classList.add('empty');
          cell.disabled = true;
          cell.tabIndex = -1;
        } else {
          cell.setAttribute('data-level', String(day.level));
          cell.setAttribute('aria-label', i18n.getDateFmt().format(new Date(day.ts)));
          cell.addEventListener('click', function () { selectHeatmapDay(day, cell); });
          cell.addEventListener('focus', function () { selectHeatmapDay(day, cell); });
          if (day.ts === todayTs) todayCell = cell;
        }
        gridEl.appendChild(cell);
      });
    });
    $('heatmap-detail').textContent = t('heatmapDetailHint');
    if (todayCell) {
      // rAF, da der Tab beim Aufruf hier oft noch "hidden" ist (show() läuft erst danach) —
      // scrollIntoView auf einem display:none-Vorfahren wäre sonst ein No-op.
      requestAnimationFrame(function () { todayCell.scrollIntoView({ inline: 'end', block: 'nearest' }); });
    }
  }

  // ---------- Achievements ----------
  var achCategory = stats.actKeyOf(storage.getAchCategory());

  function renderAchCategoryPicker() {
    ['poop', 'smoke', 'coffee'].forEach(function (k) {
      $('ach-cat-' + k).setAttribute('aria-pressed', String(k === achCategory));
    });
  }
  ['poop', 'smoke', 'coffee'].forEach(function (k) {
    $('ach-cat-' + k).addEventListener('click', function () {
      if (k === achCategory) return;
      achCategory = k;
      storage.saveAchCategory(k);
      renderAchievements(achievements.checkAchievements(storage.getSessions() || []));
    });
  });

  function renderAchievements(allResults) {
    var cat = achCategory;
    var unlocked = allResults[cat].unlocked;
    var st = allResults[cat].stats;
    var grid = $('ach-grid');
    grid.innerHTML = '';
    var lang = i18n.getLang();
    var openCount = achievements.ACHIEVEMENTS.filter(function (a) { return unlocked[a.id]; }).length;
    $('ach-count').textContent = openCount + ' / ' + achievements.ACHIEVEMENTS.length;
    achievements.ACHIEVEMENTS.forEach(function (a) {
      var v = achievements.achVariant(a, cat);
      var isOpen = !!unlocked[a.id];
      var el = document.createElement('div');
      el.className = 'ach ' + (isOpen ? 'unlocked' : 'locked');
      var badge = document.createElement('div'); badge.className = 'badge'; badge.textContent = v.badge;
      var info = document.createElement('div'); info.className = 'info';
      var nm = document.createElement('div'); nm.className = 'name'; nm.textContent = v.name[lang] || v.name.de;
      var ds = document.createElement('div'); ds.className = 'desc'; ds.textContent = v.desc[lang] || v.desc.de;
      info.appendChild(nm); info.appendChild(ds);
      var status = document.createElement('div'); status.className = 'status';
      status.textContent = isOpen ? '✓ ' + i18n.getAchDateFmt().format(new Date(unlocked[a.id])) : a.progress(st);
      el.appendChild(badge); el.appendChild(info); el.appendChild(status);
      grid.appendChild(el);
    });
    renderAchCategoryPicker();
  }

  var toastQueue = [], toastBusy = false;
  function showToasts(list) {
    list.forEach(function (item) { toastQueue.push(item); });
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    var item = toastQueue.shift();
    var toast = $('ach-toast');
    if (!item) { toastBusy = false; return; }
    toastBusy = true;
    var v = achievements.achVariant(item.a, item.cat);
    $('ach-toast-badge').textContent = v.badge;
    $('ach-toast-name').textContent = v.name[i18n.getLang()] || v.name.de;
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(nextToast, 350);
    }, 2600);
  }

  // ---------- Teilen ----------
  var lastSummary = null;
  var lastTitleIdx = 0;
  var pendingSummary = null; // {durationMs, earned}
  var infoToastTimer = null;
  function infoToast(msg) {
    var el = $('info-toast');
    el.textContent = msg;
    el.classList.add('show');
    if (infoToastTimer) clearTimeout(infoToastTimer);
    infoToastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  function openShareModal(text, title) {
    $('share-title').textContent = title || t('shareTitleDefault');
    $('share-text').value = text;
    $('share-overlay').classList.remove('hidden');
  }
  $('share-close').addEventListener('click', function () { $('share-overlay').classList.add('hidden'); });
  $('share-overlay').addEventListener('click', function (e) {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
  $('share-copy').addEventListener('click', function () {
    var ta = $('share-text');
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); infoToast(t('toastCopied')); } catch (e) {}
    $('share-overlay').classList.add('hidden');
  });
  function copyFallback(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { infoToast(t('toastCopied')); },
        function () { openShareModal(text); }
      );
    } else {
      openShareModal(text);
    }
  }
  function shareContent(text) {
    if (navigator.share) {
      navigator.share({ text: text }).catch(function (err) {
        if (err && err.name === 'AbortError') return; // Nutzer hat abgebrochen
        copyFallback(text);
      });
    } else {
      copyFallback(text);
    }
  }
  function buildTaxShareText(tax) {
    if (!tax) return '';
    var label = (settings && settings.dedLabel) ? settings.dedLabel : t('dedLabelDefault');
    var parts = [[t('dedLst'), tax.lst], [t('dedSoli'), tax.soli], [t('dedChurch'), tax.church], [t('dedSv'), tax.sv]]
      .filter(function (p) { return p[1] > 0.00005; })
      .map(function (p) { return p[0] + ' ' + i18n.fmtMoney(p[1]); })
      .join(' · ');
    var funded = t('fundedItems').map(function (name, i) {
      return i18n.fmtFunded(tax.ded / salary.FUND_RATES[i]) + ' ' + name;
    }).join('\n');
    return '\n\n' + label + ' ' + i18n.fmtMoney(tax.ded) + '\n' + parts +
      '\n' + t('fundedTitle') + '\n' + funded +
      '\n' + t('fundedDisclaimer');
  }
  $('btn-share-session').addEventListener('click', function () {
    if (!lastSummary) return;
    var sessionActivity = stats.actKeyOf(lastSummary.activity);
    var text = t('shareSession')(sessionActivity, i18n.fmtDurationWords(lastSummary.durationMs), i18n.fmtMoney(lastSummary.earned), i18n.funFact(lastSummary.earned));
    text += buildTaxShareText(lastSummary.tax);
    sharing.tryShareSessionImage(text, sessionActivity).then(function (sharedWithImage) {
      if (sharedWithImage === 'ready') {
        infoToast(t('toastShareImageReady'));
        return;
      }
      if (!sharedWithImage) shareContent(text);
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return; // Nutzer hat abgebrochen
      copyFallback(text);
    });
  });
  $('btn-share-achievements').addEventListener('click', function () {
    var unlockedAll = achievements.migrateAchievements(storage.getRawAchievements());
    var unlocked = unlockedAll[achCategory] || {};
    var open = achievements.ACHIEVEMENTS.filter(function (a) { return unlocked[a.id]; });
    var text = t('shareAchTitle')(achCategory, open.length, achievements.ACHIEVEMENTS.length);
    text += open.length
      ? open.map(function (a) { var v = achievements.achVariant(a, achCategory); return v.badge + ' ' + (v.name[i18n.getLang()] || v.name.de); }).join('\n')
      : t('shareAchNone');
    text += t('shareAchFooter');
    shareContent(text);
  });

  // ---------- Backfill: vergessene Sessions nachtragen ----------
  var bfForm = $('backfill-form');
  $('btn-show-backfill').addEventListener('click', function () {
    var willShow = bfForm.classList.contains('hidden');
    bfForm.classList.toggle('hidden', !willShow);
    if (willShow) {
      var now = new Date();
      $('bf-date').value = now.getFullYear() + '-' + i18n.pad(now.getMonth() + 1) + '-' + i18n.pad(now.getDate());
      $('bf-time').value = i18n.pad(now.getHours()) + ':' + i18n.pad(now.getMinutes());
      $('bf-duration').value = '';
      $('bf-error').style.display = 'none';
      updateBfDerived();
      $('bf-duration').focus();
    }
  });
  function updateBfDerived() {
    var mins = parseNum($('bf-duration'));
    var box = $('bf-derived');
    if (mins > 0 && settings) {
      $('bf-derived-value').textContent = i18n.fmtMoney((mins / 60) * settings.rate);
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }
  $('bf-duration').addEventListener('input', updateBfDerived);
  $('bf-cancel').addEventListener('click', function () { bfForm.classList.add('hidden'); });
  $('bf-save').addEventListener('click', function () {
    var dateStr = $('bf-date').value, timeStr = $('bf-time').value;
    var mins = parseNum($('bf-duration'));
    var ts = (dateStr && timeStr) ? new Date(dateStr + 'T' + timeStr).getTime() : NaN;
    if (!isFinite(ts) || !(mins > 0)) {
      $('bf-error').textContent = t('bfError');
      $('bf-error').style.display = 'block';
      return;
    }
    if (ts > Date.now()) {
      $('bf-error').textContent = t('bfErrorFuture');
      $('bf-error').style.display = 'block';
      return;
    }
    $('bf-error').style.display = 'none';
    var rate = settings ? settings.rate : 0;
    var durationMs = mins * 60000;
    var bfEarned = salary.calculateEarnings(durationMs, rate);
    var bfTax = salary.computeNet(bfEarned, settings);
    var sessions = storage.getSessions() || [];
    var bfEntry = {
      id: 'm' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
      ts: ts,
      durationMs: durationMs,
      earned: bfEarned,
      rate: rate,
      manual: true,
      activity: activity
    };
    if (bfTax) { bfEntry.net = bfTax.net; bfEntry.ded = bfTax.ded; }
    sessions.push(bfEntry);
    storage.saveSessions(sessions);
    bfForm.classList.add('hidden');
    renderHistory();
  });

  // ---------- CSV Export / Import ----------
  $('btn-export-csv').addEventListener('click', runCsvExport);
  $('export-reminder-cta').addEventListener('click', runCsvExport);
  $('export-reminder-dismiss').addEventListener('click', function () {
    storage.saveExportReminderDismissed(Date.now());
    $('export-reminder').classList.add('hidden');
  });

  $('btn-import-csv').addEventListener('click', function () {
    $('import-file').value = '';
    $('import-text').value = '';
    $('import-error').style.display = 'none';
    $('import-overlay').classList.remove('hidden');
  });
  $('import-cancel').addEventListener('click', function () { $('import-overlay').classList.add('hidden'); });
  $('import-overlay').addEventListener('click', function (e) {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
  $('import-file').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () { $('import-text').value = String(reader.result || ''); };
    reader.readAsText(f);
  });
  $('import-run').addEventListener('click', function () {
    var rows = stats.parseCsv($('import-text').value, settings ? settings.rate : 0);
    if (!rows.length) { $('import-error').style.display = 'block'; return; }
    var sessions = storage.getSessions() || [];
    var existing = {};
    sessions.forEach(function (s) { existing[stats.sessionKey(s.ts, s.durationMs, s.activity, s.earned)] = true; });
    var added = 0, skipped = 0;
    rows.forEach(function (row) {
      var key = stats.sessionKey(row.ts, row.durationMs, row.activity, row.earned);
      if (existing[key]) { skipped++; return; }
      existing[key] = true;
      var imp = {
        id: 'i' + row.ts + '-' + Math.floor(Math.random() * 1e6),
        ts: row.ts,
        durationMs: row.durationMs,
        earned: row.earned,
        rate: row.rate,
        manual: row.manual,
        activity: stats.actKeyOf(row.activity)
      };
      if (typeof row.net === 'number') imp.net = row.net;
      if (typeof row.ded === 'number') imp.ded = row.ded;
      sessions.push(imp);
      added++;
    });
    storage.saveSessions(sessions);
    $('import-overlay').classList.add('hidden');
    renderHistory();
    infoToast(t('toastImported')(added, skipped));
  });

  // ---------- Was gibt's Neues ----------
  var whatsNewBtn = $('whatsnew-btn'), whatsNewBadge = $('whatsnew-badge'), whatsNewOverlay = $('whatsnew-overlay');
  function renderWhatsNewBadge() {
    whatsNewBadge.classList.toggle('hidden', !whatsnew.hasUnseen(storage.getWhatsNewSeen()));
  }
  function renderWhatsNewList() {
    var lang = i18n.getLang();
    var list = $('whatsnew-list');
    list.innerHTML = '';
    whatsnew.ENTRIES.forEach(function (entry) {
      var item = document.createElement('div');
      item.className = 'whatsnew-item';
      var emoji = document.createElement('div'); emoji.className = 'emoji'; emoji.textContent = entry.emoji;
      var info = document.createElement('div');
      var title = document.createElement('div'); title.className = 'title'; title.textContent = entry.title[lang] || entry.title.de;
      var body = document.createElement('div'); body.className = 'body'; body.textContent = entry.body[lang] || entry.body.de;
      info.appendChild(title); info.appendChild(body);
      item.appendChild(emoji); item.appendChild(info);
      list.appendChild(item);
    });
  }
  whatsNewBtn.addEventListener('click', function () {
    renderWhatsNewList();
    whatsNewOverlay.classList.remove('hidden');
    storage.saveWhatsNewSeen(whatsnew.latestId());
    renderWhatsNewBadge();
  });
  $('whatsnew-close').addEventListener('click', function () { whatsNewOverlay.classList.add('hidden'); });
  whatsNewOverlay.addEventListener('click', function (e) {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });

  // ---------- Sprachumschalter ----------
  function applyLang() {
    i18n.applyBindings();
    i18n.buildFormatters();
    $('btn-save-settings').textContent = settings ? t('btnSaveChanges') : t('btnSaveFirst');
    renderRateChip();
    renderTimer();
    renderActivityPicker();
    renderHistory();
    renderYear();
    if (!views.summary.classList.contains('hidden')) renderSummary();
    if (!whatsNewOverlay.classList.contains('hidden')) renderWhatsNewList();
  }
  function setLang(l) {
    if (l === i18n.getLang()) return;
    i18n.setLang(l);
    applyLang();
  }
  $('lang-de').addEventListener('click', function () { setLang('de'); });
  $('lang-en').addEventListener('click', function () { setLang('en'); });

  // ---------- Tabs ----------
  $('tab-timer').addEventListener('click', function () { show('timer'); renderTimer(); renderActivityPicker(); });
  $('tab-history').addEventListener('click', function () { renderHistory(); show('history'); });
  $('tab-year').addEventListener('click', function () { renderYear(); show('year'); });
  $('tab-achievements').addEventListener('click', function () {
    checkAndToastAchievements(storage.getSessions() || []);
    show('achievements');
  });
  $('tab-settings').addEventListener('click', function () { fillSetupForm(); show('setup'); });

  // ---------- Boot ----------
  renderWhatsNewBadge();
  applyLang();
  if (!settings) {
    show('setup');
    renderModeSwitch();
  } else {
    fillSetupForm();
    show('timer');
    renderTimer();
    renderActivityPicker();
    var bootActive = timer.getActive();
    if (bootActive && bootActive.startTs) startTicking();
  }
})();
