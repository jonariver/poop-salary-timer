import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('maps every session activity to its own share image', async () => {
  const { getShareImagePath } = await import('../js/share.js');

  assert.deepEqual(
    ['poop', 'smoke', 'coffee'].map(getShareImagePath),
    [
      '../assets/share/poop.png',
      '../assets/share/smoke.png',
      '../assets/share/coffee.png'
    ]
  );
});

test('shares the matching image file together with the unchanged session text', async () => {
  const { tryShareSessionImage } = await import('../js/share.js');
  const calls = { fetched: null, canShare: null, shared: null };
  const imageBlob = new Blob(['png-data'], { type: 'image/png' });
  const navigator = {
    canShare(data) {
      calls.canShare = data;
      return true;
    },
    async share(data) {
      calls.shared = data;
    }
  };

  const shared = await tryShareSessionImage('session result', 'coffee', {
    navigator: navigator,
    fetch: async function (url) {
      calls.fetched = String(url);
      return { ok: true, blob: async function () { return imageBlob; } };
    },
    File: File,
    cache: {}
  });

  assert.equal(shared, true);
  assert.match(calls.fetched, /\/assets\/share\/coffee\.png$/);
  assert.equal(calls.shared.text, 'session result');
  assert.equal(calls.shared.files.length, 1);
  assert.equal(calls.shared.files[0].name, 'coffee-salary-result.png');
  assert.equal(calls.shared.files[0].type, 'image/png');
  assert.deepEqual(calls.canShare, { files: calls.shared.files });
});

test('checks file support separately before sharing image and text together', async () => {
  const { tryShareSessionImage } = await import('../js/share.js');
  let sharedData = null;

  const result = await tryShareSessionImage('session result', 'smoke', {
    navigator: {
      canShare(data) {
        return Object.keys(data).length === 1 && data.files.length === 1;
      },
      async share(data) { sharedData = data; }
    },
    fetch: async function () {
      return {
        ok: true,
        blob: async function () { return new Blob(['png'], { type: 'image/png' }); }
      };
    },
    File: File,
    cache: {}
  });

  assert.equal(result, true);
  assert.equal(sharedData.text, 'session result');
  assert.equal(sharedData.files[0].name, 'smoke-salary-result.png');
});

test('returns to text fallback when the browser rejects the file payload', async () => {
  const { tryShareSessionImage } = await import('../js/share.js');
  let nativeShareCalled = false;

  const shared = await tryShareSessionImage('session result', 'poop', {
    navigator: {
      canShare() { return false; },
      async share() { nativeShareCalled = true; }
    },
    fetch: async function () {
      return {
        ok: true,
        blob: async function () { return new Blob(['png'], { type: 'image/png' }); }
      };
    },
    File: File,
    cache: {}
  });

  assert.equal(shared, false);
  assert.equal(nativeShareCalled, false);
});

test('skips image loading when Web Share file capability is unavailable', async () => {
  const { tryShareSessionImage } = await import('../js/share.js');
  let fetchCalled = false;

  const shared = await tryShareSessionImage('session result', 'smoke', {
    navigator: { share: async function () {} },
    fetch: async function () {
      fetchCalled = true;
      throw new Error('must not fetch');
    },
    File: File,
    cache: {}
  });

  assert.equal(shared, false);
  assert.equal(fetchCalled, false);
});

test('returns to text fallback when loading the image fails', async () => {
  const { tryShareSessionImage } = await import('../js/share.js');

  const shared = await tryShareSessionImage('session result', 'coffee', {
    navigator: {
      canShare() { return true; },
      async share() { throw new Error('native share must not run'); }
    },
    fetch: async function () { throw new Error('network failure'); },
    File: File,
    cache: {}
  });

  assert.equal(shared, false);
});

test('returns to text fallback when the image asset is missing', async () => {
  const { tryShareSessionImage } = await import('../js/share.js');
  let nativeShareCalled = false;

  const shared = await tryShareSessionImage('session result', 'poop', {
    navigator: {
      canShare() { return true; },
      async share() { nativeShareCalled = true; }
    },
    fetch: async function () {
      return {
        ok: false,
        status: 404,
        blob: async function () { return new Blob(['not found'], { type: 'text/html' }); }
      };
    },
    File: File,
    cache: {}
  });

  assert.equal(shared, false);
  assert.equal(nativeShareCalled, false);
});

test('caches a slowly loaded image and shares it on the next active tap', async () => {
  const { tryShareSessionImage } = await import('../js/share.js');
  const cache = {};
  let fetchCount = 0;
  let shareCount = 0;
  const userActivation = { isActive: false };
  const dependencies = {
    navigator: {
      userActivation: userActivation,
      canShare() { return true; },
      async share() { shareCount += 1; }
    },
    fetch: async function () {
      fetchCount += 1;
      return {
        ok: true,
        blob: async function () { return new Blob(['png'], { type: 'image/png' }); }
      };
    },
    File: File,
    cache: cache
  };

  const firstResult = await tryShareSessionImage('session result', 'coffee', dependencies);
  userActivation.isActive = true;
  const secondResult = await tryShareSessionImage('session result', 'coffee', dependencies);

  assert.equal(firstResult, 'ready');
  assert.equal(secondResult, true);
  assert.equal(fetchCount, 1);
  assert.equal(shareCount, 1);
  assert.equal(cache.coffee.name, 'coffee-salary-result.png');
});

test('defers text fallback to the next active tap when file loading was slow', async () => {
  const { tryShareSessionImage } = await import('../js/share.js');
  const cache = {};
  const userActivation = { isActive: false };
  let fetchCount = 0;
  let nativeShareCalled = false;
  const dependencies = {
    navigator: {
      userActivation: userActivation,
      canShare() { return false; },
      async share() { nativeShareCalled = true; }
    },
    fetch: async function () {
      fetchCount += 1;
      return {
        ok: true,
        blob: async function () { return new Blob(['png'], { type: 'image/png' }); }
      };
    },
    File: File,
    cache: cache
  };

  const firstResult = await tryShareSessionImage('session result', 'smoke', dependencies);
  userActivation.isActive = true;
  const secondResult = await tryShareSessionImage('session result', 'smoke', dependencies);

  assert.equal(firstResult, 'ready');
  assert.equal(secondResult, false);
  assert.equal(fetchCount, 1);
  assert.equal(nativeShareCalled, false);
});

test('ships all three mapped assets as valid PNG files', async () => {
  const assetNames = ['poop.png', 'smoke.png', 'coffee.png'];
  const validPng = await Promise.all(assetNames.map(async function (name) {
    try {
      const bytes = await readFile(new URL('../assets/share/' + name, import.meta.url));
      return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    } catch (err) {
      return false;
    }
  }));

  assert.deepEqual(validPng, [true, true, true]);
});
