import assert from 'node:assert/strict';
import test from 'node:test';
import * as i18n from '../js/i18n.js';

test('default region is DE', () => {
  assert.equal(i18n.getRegion(), 'DE');
});

test('fmtMoney uses EUR formatting by default', () => {
  i18n.setRegion('DE');
  i18n.setLang('de');
  i18n.buildFormatters();
  var s = i18n.fmtMoney(10);
  assert.ok(s.indexOf('€') >= 0, 'expected € in "' + s + '"');
});

test('fmtMoney switches to CHF formatting when region is CH', () => {
  i18n.setRegion('CH');
  i18n.buildFormatters();
  var s = i18n.fmtMoney(10);
  assert.ok(s.indexOf('CHF') >= 0, 'expected CHF in "' + s + '"');
  i18n.setRegion('DE'); // reset for subsequent tests in this file
  i18n.buildFormatters();
});

test('fmtMoneyLive appends the correct currency for each region', () => {
  i18n.setRegion('DE');
  i18n.buildFormatters();
  assert.ok(i18n.fmtMoneyLive(1.5).indexOf('€') >= 0);
  i18n.setRegion('CH');
  i18n.buildFormatters();
  assert.ok(i18n.fmtMoneyLive(1.5).indexOf('CHF') >= 0);
  i18n.setRegion('DE');
  i18n.buildFormatters();
});

test('setRegion rejects unknown values by falling back to DE', () => {
  i18n.setRegion('XX');
  assert.equal(i18n.getRegion(), 'DE');
});

test('lang and region are independent (Swiss region, English language)', () => {
  i18n.setRegion('CH');
  i18n.setLang('en');
  i18n.buildFormatters();
  assert.equal(i18n.getRegion(), 'CH');
  assert.equal(i18n.getLang(), 'en');
  var s = i18n.fmtMoney(10);
  assert.ok(s.indexOf('CHF') >= 0);
  i18n.setRegion('DE');
  i18n.setLang('de');
  i18n.buildFormatters();
});

test('CANTON_NAMES has all 26 cantons with non-empty de/en names, including the 3 available ones', () => {
  var codes = Object.keys(i18n.CANTON_NAMES);
  assert.equal(codes.length, 26);
  codes.forEach(function (code) {
    var n = i18n.CANTON_NAMES[code];
    assert.ok(n.de && n.de.length > 0, code + ' missing de name');
    assert.ok(n.en && n.en.length > 0, code + ' missing en name');
  });
  assert.equal(i18n.CANTON_NAMES.ZH.de, 'Zürich');
  assert.equal(i18n.CANTON_NAMES.ZG.de, 'Zug');
  assert.equal(i18n.CANTON_NAMES.GE.de, 'Genève');
});

test('taxHintCh and fundedItemsCh are distinct CH-specific content, not the DE strings', () => {
  i18n.setLang('de');
  assert.notEqual(i18n.t('taxHintCh'), i18n.t('taxHint'));
  assert.ok(i18n.t('taxHintCh').indexOf('€') === -1, 'CH tax hint must not mention €');
  var itemsCh = i18n.t('fundedItemsCh');
  var itemsDe = i18n.t('fundedItems');
  assert.equal(itemsCh.length, 3);
  assert.notDeepEqual(itemsCh, itemsDe);
});

test('lblMonthlyCh and lblRateCh mention CHF, not €', () => {
  i18n.setLang('de');
  assert.ok(i18n.t('lblMonthlyCh').indexOf('CHF') >= 0);
  assert.ok(i18n.t('lblMonthlyCh').indexOf('€') === -1);
  assert.ok(i18n.t('lblRateCh').indexOf('CHF') >= 0);
  assert.ok(i18n.t('lblRateCh').indexOf('€') === -1);
});
