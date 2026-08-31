import assert from 'node:assert/strict';
import test from 'node:test';
import { computeChFederalTax } from '../js/salary.js';

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
