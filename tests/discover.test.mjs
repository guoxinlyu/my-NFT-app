import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { discoverMetaMask } from '../src/wallet/discover.web.ts';

function metamaskProvider() {
  return { isMetaMask: true, request: async () => null, on() {}, removeListener() {} };
}
function installWindow(ethereum) {
  const listeners = new Set();
  const announcements = [];
  globalThis.window = {
    ethereum,
    addEventListener(type, fn) { if (type === 'eip6963:announceProvider') listeners.add(fn); },
    removeEventListener(type, fn) { listeners.delete(fn); },
    dispatchEvent(event) {
      if (event.type === 'eip6963:requestProvider') {
        for (const fn of listeners) for (const announcement of announcements) fn({ detail: announcement });
      }
      return true;
    },
  };
  return { announcements };
}
afterEach(() => { delete globalThis.window; });

test('regression: EIP-6963 announcement wins over legacy injection', async () => {
  const announced = metamaskProvider();
  const legacy = metamaskProvider();
  const { announcements } = installWindow(legacy);
  announcements.push({ info: { rdns: 'io.metamask' }, provider: announced });
  assert.equal(await discoverMetaMask(), announced);
});

test('regression: legacy multi-provider injection selects the isMetaMask entry', async () => {
  const decoy = { isMetaMask: false, request: async () => null, on() {}, removeListener() {} };
  const real = metamaskProvider();
  installWindow({ isMetaMask: true, providers: [decoy, real] });
  assert.equal(await discoverMetaMask(), real);
});

test('regression: single injected MetaMask is used when nothing announces', async () => {
  const injected = metamaskProvider();
  installWindow(injected);
  assert.equal(await discoverMetaMask(), injected);
});

test('regression: missing or non-MetaMask providers fail with install guidance', async () => {
  installWindow(undefined);
  await assert.rejects(discoverMetaMask(), /未检测到 MetaMask/);
  const { announcements } = installWindow(undefined);
  announcements.push({ info: { rdns: 'io.rabby' }, provider: metamaskProvider() });
  await assert.rejects(discoverMetaMask(), /未检测到 MetaMask/);
});

test('regression: providers missing required request or listeners are rejected', async () => {
  const { announcements } = installWindow(undefined);
  announcements.push({ info: { rdns: 'io.metamask' }, provider: { on() {}, removeListener() {} } });
  await assert.rejects(discoverMetaMask(), /未检测到 MetaMask/);
});

test('regression: discovery outside a browser fails closed', async () => {
  await assert.rejects(discoverMetaMask(), /请在浏览器中连接 MetaMask/);
});
