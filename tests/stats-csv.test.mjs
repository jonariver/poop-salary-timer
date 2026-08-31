import assert from 'node:assert/strict';
import test from 'node:test';
import * as i18n from '../js/i18n.js';
import { csvFromSessions } from '../js/stats.js';

var sampleSessions = [
  { ts: new Date(2026, 0, 1, 10, 0, 0).getTime(), durationMs: 300000, earned: 3.5, rate: 18.46, manual: false, activity: 'poop' }
];

test('csvFromSessions header says EUR when region is DE', () => {
  i18n.setRegion('DE');
  i18n.setLang('de');
  i18n.buildFormatters();
  var csv = csvFromSessions(sampleSessions);
  var header = csv.split('\n')[0];
  assert.ok(header.indexOf('(EUR)') >= 0, header);
  assert.ok(header.indexOf('(CHF)') === -1, header);
});

test('csvFromSessions header says CHF when region is CH', () => {
  i18n.setRegion('CH');
  i18n.buildFormatters();
  var csv = csvFromSessions(sampleSessions);
  var header = csv.split('\n')[0];
  assert.ok(header.indexOf('(CHF)') >= 0, header);
  assert.ok(header.indexOf('(EUR)') === -1, header);
  i18n.setRegion('DE');
  i18n.buildFormatters();
});

test('csvFromSessions data rows are unaffected by region (positional format unchanged)', () => {
  i18n.setRegion('DE');
  i18n.buildFormatters();
  var deCsv = csvFromSessions(sampleSessions);
  i18n.setRegion('CH');
  i18n.buildFormatters();
  var chCsv = csvFromSessions(sampleSessions);
  i18n.setRegion('DE');
  i18n.buildFormatters();
  var deRow = deCsv.split('\n')[1];
  var chRow = chCsv.split('\n')[1];
  assert.equal(deRow, chRow, 'data rows must be identical — only the header label changes');
});
