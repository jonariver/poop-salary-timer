import assert from 'node:assert/strict';
import test from 'node:test';
import * as storage from '../js/storage.js';

test('storage.js no longer exports getRegion/saveRegion (region lives in pst_settings now)', () => {
  assert.equal(storage.getRegion, undefined);
  assert.equal(storage.saveRegion, undefined);
});

test('storage.js still exports getLang/saveLang unchanged (regression)', () => {
  assert.equal(typeof storage.getLang, 'function');
  assert.equal(typeof storage.saveLang, 'function');
});
