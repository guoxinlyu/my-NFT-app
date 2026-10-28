import test from 'node:test';
import assert from 'node:assert/strict';
import { WalletController, SEPOLIA_ID } from '../src/wallet/controller.ts';

const A = '0x0000000000000000000000000000000000000001';
const B = '0x0000000000000000000000000000000000000002';
const tick = () => new Promise(resolve => setTimeout(resolve, 30));
class Provider {
  accounts = [A]; chain = SEPOLIA_ID; balance = '0xde0b6b3a7640000';
  handlers = new Map(); calls = []; failure = null; missing = false; balanceRequest = null;
  on(event, listener) { this.handlers.set(event, listener); }
  removeListener(event, listener) { if (this.handlers.get(event) === listener) this.handlers.delete(event); }
  emit(event) { this.handlers.get(event)?.(); }
  async request({ method, params }) {
    this.calls.push({ method, params });
    if (method === 'eth_requestAccounts') { if (this.failure) throw this.failure; return this.accounts; }
    if (method === 'eth_accounts') return this.accounts;
    if (method === 'eth_chainId') return this.chain;
    if (method === 'eth_getBalance') { if (this.balanceRequest) return this.balanceRequest; return this.balance; }
    if (method === 'wallet_switchEthereumChain') {
      if (this.failure) throw this.failure;
      if (this.missing) { this.missing = false; throw { code: 4902 }; }
      this.chain = params[0].chainId; this.emit('chainChanged'); return null;
    }
    if (method === 'wallet_addEthereumChain') return null;
    throw Error(`Unexpected method ${method}`);
  }
}
function setup() { const provider = new Provider(); const wallet = new WalletController(async () => provider); return { provider, wallet }; }

test('connect reads real provider address and Sepolia balance without signatures/transactions', async () => {
  const { provider, wallet } = setup(); await wallet.connect();
  assert.equal(wallet.getSnapshot().address, A); assert.equal(wallet.getSnapshot().balance, '1.0');
  assert.equal(wallet.getSnapshot().chainId, SEPOLIA_ID); assert.equal(wallet.getSnapshot().busy, false);
  assert.ok(!provider.calls.some(call => /sign|sendTransaction/i.test(call.method))); wallet.dispose();
});
test('rejected connection is neutral and releases lock for retry', async () => {
  const { provider, wallet } = setup(); provider.failure = { code: 4001 }; await wallet.connect();
  assert.equal(wallet.getSnapshot().error, null); assert.match(wallet.getSnapshot().notice, /取消/);
  assert.equal(wallet.getSnapshot().busy, false); provider.failure = null; await wallet.connect();
  assert.equal(wallet.getSnapshot().address, A); wallet.dispose();
});
test('wrong chain never exposes its balance; switch handles missing Sepolia', async () => {
  const { provider, wallet } = setup(); provider.chain = '0x1'; await wallet.connect();
  assert.equal(wallet.getSnapshot().balance, null); assert.ok(!provider.calls.some(c => c.method === 'eth_getBalance'));
  provider.missing = true; await wallet.switchToSepolia(); await tick();
  assert.equal(wallet.getSnapshot().chainId, SEPOLIA_ID); assert.equal(wallet.getSnapshot().balance, '1.0');
  const add = provider.calls.find(c => c.method === 'wallet_addEthereumChain'); assert.equal(add.params[0].chainId, SEPOLIA_ID); wallet.dispose();
});
test('account and network changes clear stale state immediately and handle wallet disconnect', async () => {
  const { provider, wallet } = setup(); await wallet.connect(); provider.accounts = [B]; provider.emit('accountsChanged');
  assert.equal(wallet.getSnapshot().address, null); assert.equal(wallet.getSnapshot().balance, null); await tick();
  assert.equal(wallet.getSnapshot().address, B); provider.chain = '0x1'; provider.emit('chainChanged'); await tick();
  assert.equal(wallet.getSnapshot().chainId, '0x1'); assert.equal(wallet.getSnapshot().balance, null);
  provider.emit('disconnect'); assert.equal(wallet.getSnapshot().address, null); assert.equal(provider.handlers.size, 0);
});
test('local disconnect prevents pending connect from reviving the session', async () => {
  const { provider, wallet } = setup(); let finish;
  const original = provider.request.bind(provider);
  provider.request = req => req.method === 'eth_requestAccounts' ? new Promise(resolve => { finish = resolve; }) : original(req);
  const connecting = wallet.connect(); await tick(); wallet.disconnect(); finish([A]); await connecting;
  assert.equal(wallet.getSnapshot().address, null); assert.equal(provider.handlers.size, 0); assert.equal(wallet.getSnapshot().busy, false);
});
test('late balance result cannot overwrite a changed network', async () => {
  const { provider, wallet } = setup(); await wallet.connect(); let finish;
  provider.balanceRequest = new Promise(resolve => { finish = resolve; }); const refreshing = wallet.refresh(); await tick();
  provider.chain = '0x1'; provider.emit('chainChanged'); await tick(); finish('0xde0b6b3a7640000'); await refreshing;
  assert.equal(wallet.getSnapshot().chainId, '0x1'); assert.equal(wallet.getSnapshot().balance, null); wallet.dispose();
});
test('RPC failure is visible and refresh can recover', async () => {
  const { provider, wallet } = setup(); provider.balanceRequest = Promise.resolve('invalid'); await wallet.connect();
  assert.ok(wallet.getSnapshot().error); assert.equal(wallet.getSnapshot().balance, null);
  provider.balanceRequest = null; await wallet.refresh(); assert.equal(wallet.getSnapshot().error, null); assert.equal(wallet.getSnapshot().balance, '1.0'); wallet.dispose();
});

test('refreshing the same wallet preserves identity and existing signing sessions throughout the read', async () => {
  const { provider, wallet } = setup(); await wallet.connect();
  const session = wallet.getSession(), snapshots = []; let finish;
  provider.balanceRequest = new Promise(resolve => { finish = resolve; });
  const unsubscribe = wallet.subscribe(() => snapshots.push(wallet.getSnapshot()));
  try {
    const refreshing = wallet.refresh(); await tick();
    assert.equal(wallet.getSnapshot().busy, true);
    assert.equal(wallet.isCurrentSession(session), true);
    finish('0x1bc16d674ec80000'); await refreshing;
    assert.equal(wallet.getSnapshot().balance, '2.0');
    assert.equal(wallet.getSession().revision, session.revision);
    assert.ok(snapshots.every(s => s.address === A && s.chainId === SEPOLIA_ID));
    assert.ok(!provider.calls.some(c => /sign|sendTransaction/.test(c.method)));
  } finally { finish?.('0x1bc16d674ec80000'); unsubscribe(); wallet.dispose(); }
});

test('refresh detects an unannounced identity change and invalidates old signing sessions', async () => {
  const { provider, wallet } = setup(); await wallet.connect();
  try {
    const previous = wallet.getSession(); provider.accounts = [B];
    await wallet.refresh();
    assert.equal(wallet.getSnapshot().address, B);
    assert.equal(wallet.isCurrentSession(previous), false);
    const next = wallet.getSession(); provider.chain = '0x1'; await wallet.refresh();
    assert.equal(wallet.getSnapshot().balance, null);
    assert.equal(wallet.isCurrentSession(next), false);
  } finally { wallet.dispose(); }
});
