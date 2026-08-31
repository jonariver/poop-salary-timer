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
