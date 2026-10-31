import test from 'node:test';
import assert from 'node:assert/strict';

// Mock browser globals (window, location, sessionStorage, localStorage)
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockWindow = {
  location: {
    search: '',
    hostname: 'cafestore.infinigrowsoftech.com',
  },
  sessionStorage: new MockStorage(),
  localStorage: new MockStorage(),
};

globalThis.window = mockWindow;
globalThis.sessionStorage = mockWindow.sessionStorage;
globalThis.localStorage = mockWindow.localStorage;
globalThis.atob = (str) => Buffer.from(str, 'base64').toString('binary');
globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

const {
  getResolvedTenantSlug,
  getCustomerStorageKey,
  cleanupPreviousTenantStorage,
} = await import('../src/utils/tenantHelper.js');

const {
  getCached,
  setCached,
  clearClientCache,
} = await import('../src/utils/menuCache.js');

test('Customer Frontend Tenant & Cache Isolation Test Suite', async (t) => {
  t.beforeEach(() => {
    mockWindow.location.search = '';
    mockWindow.location.hostname = 'cafestore.infinigrowsoftech.com';
    mockWindow.sessionStorage.clear();
    mockWindow.localStorage.clear();
    clearClientCache();
  });

  // ── TEST 1: TenantHelper Priority 1 - Explicit Cafe URL parameter ──────────
  await t.test('Priority 1: Explicit URL parameter resolves cafe and overrides old storage', () => {
    // Stale slug in localStorage from a previous visit
    mockWindow.localStorage.setItem('active_cafe_slug', 'velvetrossie');
    mockWindow.sessionStorage.setItem('active_cafe_slug', 'velvetrossie');

    // User visits Hiren with explicit parameter
    mockWindow.location.search = '?cafe=hiren';
    const resolved = getResolvedTenantSlug();

    assert.equal(resolved, 'hiren', 'Explicit URL parameter must take precedence');
  });

  // ── TEST 2: TenantHelper Priority 2 - Signed QR token ──────────────────────
  await t.test('Priority 2: Signed QR token resolves tenant ID without URL slug', () => {
    const payload = Buffer.from(JSON.stringify({
      tableId: '6ae58095210369e66f5fcdde',
      tenantId: '6ae58095210369e66f5fcddf',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');
    const mockToken = `${payload}.mockSignatureHere`;

    mockWindow.location.search = `?token=${mockToken}`;
    const resolved = getResolvedTenantSlug();

    assert.equal(resolved, '6ae58095210369e66f5fcddf');
  });

  // ── TEST 3: TenantHelper Priority 3 - Verified Custom Cafe Subdomains ──────
  await t.test('Priority 3: Verified custom subdomains resolve correct cafe slugs', () => {
    // Velvetrossie subdomain
    mockWindow.location.search = '';
    mockWindow.location.hostname = 'velvetrossie.cafestore.infinigrowsoftech.com';
    assert.equal(getResolvedTenantSlug(), 'velvetrossie');

    // Hiren subdomain
    mockWindow.location.hostname = 'hiren.cafestore.infinigrowsoftech.com';
    assert.equal(getResolvedTenantSlug(), 'hiren');

    // Brewhaus subdomain
    mockWindow.location.hostname = 'brewhaus.cafestore.infinigrowsoftech.com';
    assert.equal(getResolvedTenantSlug(), 'brewhaus');

    // Localhost subdomain for local testing
    mockWindow.location.hostname = 'hiren.localhost';
    assert.equal(getResolvedTenantSlug(), 'hiren');

    // Reserved subdomains (www, admin, cafe) must NOT resolve as tenant
    mockWindow.location.hostname = 'www.cafestore.infinigrowsoftech.com';
    assert.equal(getResolvedTenantSlug(), '');

    mockWindow.location.hostname = 'admin.cafestore.infinigrowsoftech.com';
    assert.equal(getResolvedTenantSlug(), '');
  });

  // ── TEST 4: TenantHelper Priority 4 - No tenant context returns empty string
  await t.test('Priority 4: No tenant context returns empty string (never falls back to localStorage)', () => {
    mockWindow.location.search = '';
    mockWindow.location.hostname = 'cafestore.infinigrowsoftech.com';
    // Stale localStorage slug
    mockWindow.localStorage.setItem('active_cafe_slug', 'velvetrossie');

    const resolved = getResolvedTenantSlug();
    assert.equal(resolved, '', 'Must not use old localStorage to fabricate a tenant context');
  });

  // ── TEST 5: Switching cafes does not retain previous cafe cart in storage ───
  await t.test('Cart storage isolation: switching cafes cleans up previous cafe storage', () => {
    // Velvetrossie cart in storage
    const velvetCartKey = getCustomerStorageKey('velvetrossie', 'cart');
    mockWindow.localStorage.setItem(velvetCartKey, JSON.stringify({
      state: { items: [{ name: 'Velvet Truffle Mocha', quantity: 2 }] },
    }));
    mockWindow.sessionStorage.setItem('active_cafe_slug', 'velvetrossie');

    // Switch to Hiren
    cleanupPreviousTenantStorage('hiren');

    // Verify Velvetrossie cart was purged
    assert.equal(mockWindow.localStorage.getItem(velvetCartKey), null);
    assert.equal(mockWindow.sessionStorage.getItem('active_cafe_slug'), null);

    // Hiren cart key is isolated
    const hirenCartKey = getCustomerStorageKey('hiren', 'cart');
    mockWindow.localStorage.setItem(hirenCartKey, JSON.stringify({
      state: { items: [{ name: 'Hiren Geisha', quantity: 1 }] },
    }));

    assert.ok(mockWindow.localStorage.getItem(hirenCartKey));
    assert.equal(mockWindow.localStorage.getItem(velvetCartKey), null);
  });

  // ── TEST 6: Menu cache never leaks between cafes ───────────────────────────
  await t.test('Menu cache isolation: cache never leaks between cafes', () => {
    const velvetCats = [{ id: 'vc1', name: 'Velvet Brews' }];
    const hirenCats = [{ id: 'hc1', name: 'Hiren Pour-Overs' }];

    // Set cache for Velvetrossie
    setCached('categories', velvetCats, 60000, 'velvetrossie');

    // Velvetrossie reads Velvetrossie cache
    assert.deepEqual(getCached('categories', 'velvetrossie'), velvetCats);

    // Hiren reading cache must NOT get Velvetrossie's items
    assert.equal(getCached('categories', 'hiren'), null);

    // Set cache for Hiren
    setCached('categories', hirenCats, 60000, 'hiren');

    // Each cafe gets only its own cached items
    assert.deepEqual(getCached('categories', 'velvetrossie'), velvetCats);
    assert.deepEqual(getCached('categories', 'hiren'), hirenCats);

    // Clearing cache for Velvetrossie leaves Hiren intact if targeted
    clearClientCache('velvetrossie');
    assert.equal(getCached('categories', 'velvetrossie'), null);
    assert.deepEqual(getCached('categories', 'hiren'), hirenCats);

    // Full clearClientCache wipes all customer caches
    clearClientCache();
    assert.equal(getCached('categories', 'hiren'), null);
  });
});
