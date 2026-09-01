import assert from 'node:assert/strict';
import test from 'node:test';
import { computeChFederalTax, computeChSocialSecurity, computeTaxRates, computeNet, computeChCantonalTax } from '../js/salary.js';

test('computeChFederalTax matches the official 2026 Grundtarif (Basel-Landschaft PDF) within rounding tolerance', () => {
  // [zvE, official tax] pairs, verified against the official cantonal
  // publication of the federal DBG tariff, "Tarif für Alleinstehende
  // (Grundtarif)", gültig ab 2026.
  var cases = [
    [0, 0],
    [15200, 0],
    [15300, 0.77],
    [33200, 138.60],
    [43500, 229.20],
    [58000, 612.00],
    [100000, 2684.35],
    [200000, 12903.35],
    [793900, 91298.15],
    [1000000, 115000.00]
  ];
  cases.forEach(function (c) {
    var zvE = c[0], expected = c[1];
    var actual = computeChFederalTax(zvE);
    assert.ok(
      Math.abs(actual - expected) < 1,
      'zvE=' + zvE + ': expected ~' + expected + ', got ' + actual
    );
  });
});

test('computeChFederalTax is zero at and below the Grundfreibetrag', () => {
  assert.equal(computeChFederalTax(0), 0);
  assert.equal(computeChFederalTax(15200), 0);
});

test('computeChFederalTax applies the flat 11.5% top rate above CHF 793900', () => {
  var zvE = 2000000;
  assert.equal(computeChFederalTax(zvE), zvE * 0.115);
});

test('computeChFederalTax is monotonically non-decreasing across the full range', () => {
  var prev = 0;
  for (var zvE = 0; zvE <= 1000000; zvE += 10000) {
    var tax = computeChFederalTax(zvE);
    assert.ok(tax >= prev - 0.001, 'tax decreased at zvE=' + zvE + ' (' + tax + ' < ' + prev + ')');
    prev = tax;
  }
});

test('computeChSocialSecurity: AHV/IV/EO has no ceiling', () => {
  var s = computeChSocialSecurity(500000);
  assert.ok(Math.abs(s.ahvIvEo - 500000 * 0.053) < 0.01);
});

test('computeChSocialSecurity: ALV is capped at the CHF 148200 ceiling', () => {
  var below = computeChSocialSecurity(100000);
  assert.ok(Math.abs(below.alv - 100000 * 0.011) < 0.01);
  var above = computeChSocialSecurity(200000);
  assert.ok(Math.abs(above.alv - 148200 * 0.011) < 0.01, 'ALV must not exceed the ceiling-based amount');
});

test('computeChSocialSecurity: BVG is zero below the entry threshold', () => {
  var s = computeChSocialSecurity(20000); // below CHF 22680
  assert.equal(s.bvg, 0);
});

test('computeChSocialSecurity: BVG applies the coordination deduction', () => {
  var s = computeChSocialSecurity(80000);
  var expectedCoordinated = 80000 - 26460; // below the max insured salary, no cap needed
  assert.ok(Math.abs(s.bvg - expectedCoordinated * 0.0625) < 0.01);
});

test('computeChSocialSecurity: BVG coordinated salary is capped at the max insured salary', () => {
  var s = computeChSocialSecurity(200000);
  var expectedCoordinated = 90720 - 26460; // capped at bvgMaxInsuredSalary before the deduction
  assert.ok(Math.abs(s.bvg - expectedCoordinated * 0.0625) < 0.01);
});

test('computeChSocialSecurity: total is the sum of all three parts', () => {
  var s = computeChSocialSecurity(80000);
  assert.ok(Math.abs(s.total - (s.ahvIvEo + s.alv + s.bvg)) < 0.001);
});

test('computeTaxRates: existing DE behavior is unchanged (regression, taxClass 1)', () => {
  var r = computeTaxRates({ mode: 'monthly', monthly: 3200, taxClass: '1', church: false });
  // Golden value captured from this exact settings shape before this plan's changes.
  assert.ok(Math.abs(r.lst - 0.12313815633528646) < 0.0000001);
  assert.equal(r.soli, 0);
  assert.equal(r.church, 0);
  assert.equal(r.sv, 0.205);
});

test('computeTaxRates: missing region defaults to DE behavior', () => {
  var withRegion = computeTaxRates({ mode: 'monthly', monthly: 3200, taxClass: '1', region: 'DE' });
  var withoutRegion = computeTaxRates({ mode: 'monthly', monthly: 3200, taxClass: '1' });
  assert.deepEqual(withRegion, withoutRegion);
});

test('computeTaxRates: DE without taxClass still returns null', () => {
  assert.equal(computeTaxRates({ mode: 'monthly', monthly: 3200 }), null);
});

test('computeTaxRates: CH branch returns a rate object without needing taxClass', () => {
  var r = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000 });
  assert.ok(r !== null);
  assert.ok(r.lst > 0);
  assert.ok(r.sv > 0);
  assert.equal(r.soli, 0);
  assert.equal(r.church, 0);
});

test('computeTaxRates: CH branch with zero/missing gross returns null', () => {
  assert.equal(computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 0 }), null);
});

test('computeTaxRates: CH branch works with no canton selected (cantonal tax contributes 0)', () => {
  var r = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000 });
  var rWithUnavailableCanton = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000, canton: 'BE' });
  // BE (Bern) is not yet in CH_CANTON_TAX — both must be identical.
  assert.deepEqual(r, rWithUnavailableCanton);
});

test('computeTaxRates: total never exceeds the 0.9 safety cap for either region', () => {
  var de = computeTaxRates({ mode: 'monthly', monthly: 3200, taxClass: '1', church: true, churchRate: 9 });
  var ch = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 3200 });
  assert.ok(de.total <= 0.9);
  assert.ok(ch.total <= 0.9);
});

test('computeNet: DE net+ded reconstructs gross exactly (regression)', () => {
  var settings = { mode: 'monthly', monthly: 3200, taxClass: '1', church: false };
  var r = computeNet(3200, settings);
  assert.ok(Math.abs(r.net + r.ded - 3200) < 0.001);
});

test('computeNet: CH net+ded reconstructs gross exactly', () => {
  var settings = { region: 'CH', mode: 'monthly', monthly: 6000 };
  var r = computeNet(6000, settings);
  assert.ok(Math.abs(r.net + r.ded - 6000) < 0.001);
  assert.equal(r.soli, 0);
  assert.equal(r.church, 0);
});

test('computeNet: no taxClass and DE region returns null (unchanged behavior)', () => {
  assert.equal(computeNet(3200, { mode: 'monthly', monthly: 3200 }), null);
});

test('computeChCantonalTax: Zürich matches the official ESTV Steuerrechner (Stadt Zürich, 2026)', () => {
  var cases = [[80000, 9351.80], [150000, 23807.50]];
  cases.forEach(function (c) {
    var zvE = c[0], expected = c[1];
    var actual = computeChCantonalTax(zvE, 'ZH');
    assert.ok(Math.abs(actual - expected) < 1, 'zvE=' + zvE + ': expected ~' + expected + ', got ' + actual);
  });
});

test('computeChCantonalTax: Zug matches the official Kanton-Zug Steuerrechner (Stadt Zug, 2026)', () => {
  var cases = [[80000, 5109.65], [150000, 13434.85]];
  cases.forEach(function (c) {
    var zvE = c[0], expected = c[1];
    var actual = computeChCantonalTax(zvE, 'ZG');
    assert.ok(Math.abs(actual - expected) < 1, 'zvE=' + zvE + ': expected ~' + expected + ', got ' + actual);
  });
});

test('computeChCantonalTax: Genève matches the official AFC-GE barème at verified bracket boundaries (Ville de Genève, 2025)', () => {
  // Base-tax values (before the combined multiplier) verified to the cent against the official
  // AFC-GE cumulative tariff table at these exact bracket-boundary incomes; multiplied here by
  // the independently-derived Ville-de-Genève combined multiplier (1.7629).
  var cases = [[48309, 5536.21], [77518, 12333.25]];
  cases.forEach(function (c) {
    var zvE = c[0], expected = c[1];
    var actual = computeChCantonalTax(zvE, 'GE');
    assert.ok(Math.abs(actual - expected) < 1, 'zvE=' + zvE + ': expected ~' + expected + ', got ' + actual);
  });
});

test('computeChCantonalTax: unavailable canton returns 0', () => {
  assert.equal(computeChCantonalTax(80000, 'BE'), 0);
  assert.equal(computeChCantonalTax(80000, undefined), 0);
});

test('computeTaxRates: selecting an available canton increases lst vs. no canton', () => {
  var noCanton = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000 });
  var withZh = computeTaxRates({ region: 'CH', mode: 'monthly', monthly: 6000, canton: 'ZH' });
  assert.ok(withZh.lst > noCanton.lst);
  assert.ok(withZh.total <= 0.9);
});

import { FUND_RATES_CH } from '../js/salary.js';

test('FUND_RATES_CH has 3 positive, ascending, finite rates (mirrors FUND_RATES shape)', () => {
  assert.equal(FUND_RATES_CH.length, 3);
  FUND_RATES_CH.forEach(function (r) { assert.ok(isFinite(r) && r > 0); });
  assert.ok(FUND_RATES_CH[0] < FUND_RATES_CH[1]);
  assert.ok(FUND_RATES_CH[1] < FUND_RATES_CH[2]);
});
