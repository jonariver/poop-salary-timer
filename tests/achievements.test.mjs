import assert from 'node:assert/strict';
import test from 'node:test';
import * as i18n from '../js/i18n.js';
import { ACHIEVEMENTS, achVariant, achDesc } from '../js/achievements.js';

function descText(achievementId, cat, lang) {
  var a = ACHIEVEMENTS.find(function (x) { return x.id === achievementId; });
  var v = achVariant(a, cat);
  return achDesc(v, lang);
}

test('gold/kroesus/earned100/tax descriptions reflect CHF when region is CH', () => {
  i18n.setRegion('CH');
  i18n.buildFormatters();
  ['gold', 'kroesus', 'earned100', 'tax'].forEach(function (id) {
    var text = descText(id, 'poop', 'de');
    assert.ok(text.indexOf('CHF') >= 0, id + ': expected CHF in "' + text + '"');
    assert.ok(text.indexOf('€') === -1, id + ': must not still contain € in "' + text + '"');
  });
  i18n.setRegion('DE');
  i18n.buildFormatters();
});

test('gold/kroesus/earned100/tax descriptions reflect EUR when region is DE', () => {
  ['gold', 'kroesus', 'earned100', 'tax'].forEach(function (id) {
    var text = descText(id, 'poop', 'de');
    assert.ok(text.indexOf('€') >= 0, id + ': expected € in "' + text + '"');
  });
});

test('non-monetary achievement descriptions are still plain strings', () => {
  var a = ACHIEVEMENTS.find(function (x) { return x.id === 'first'; });
  var v = achVariant(a, 'poop');
  assert.equal(typeof v.desc.de, 'string');
});

test('all 16 achievements still have exactly poop/smoke/coffee variants with badge+name+desc', () => {
  assert.equal(ACHIEVEMENTS.length, 16);
  ACHIEVEMENTS.forEach(function (a) {
    ['poop', 'smoke', 'coffee'].forEach(function (cat) {
      var v = achVariant(a, cat);
      assert.ok(v.badge, a.id + '/' + cat + ' missing badge');
      assert.ok(v.name.de && v.name.en, a.id + '/' + cat + ' missing name');
      assert.ok(v.desc.de && v.desc.en, a.id + '/' + cat + ' missing desc');
    });
  });
});

test('gold/kroesus/earned100/tax progress strings reflect CHF when region is CH', () => {
  i18n.setRegion('CH');
  i18n.buildFormatters();
  var st = { totalEarned: 5, totalDed: 5 };
  ['gold', 'kroesus', 'earned100', 'tax'].forEach(function (id) {
    var a = ACHIEVEMENTS.find(function (x) { return x.id === id; });
    var text = a.progress(st);
    assert.ok(text.indexOf('CHF') >= 0, id + ': expected CHF in progress "' + text + '"');
    assert.ok(text.indexOf('€') === -1, id + ': must not still contain € in progress "' + text + '"');
  });
  i18n.setRegion('DE');
  i18n.buildFormatters();
});
