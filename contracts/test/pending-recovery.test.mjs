import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BrowserProvider, ContractFactory, keccak256, parseEther } from 'ethers';
import hre from 'hardhat';
import { WalletController } from '../../src/wallet/controller.ts';
import { LivePassClient } from '../../src/livepass/client.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 15));
async function until(condition) {
  for (let i = 0; i < 300; i++) { if (condition()) return; await tick(); }
  assert.fail('Timed out waiting for frontend state');
}
class MemoryStorage {
  #entries = new Map();
  getItem(key) { return this.#entries.get(key) ?? null; }
  setItem(key, value) { this.#entries.set(key, String(value)); }
  removeItem(key) { this.#entries.delete(key); }
}
const storageKey = 'livepass-pending-transaction';
const price = parseEther('0.0001');

let connection, rpc, reader, owner, fan, sends = 0;

before(async () => {
  connection = await hre.network.create('frontendTest');
  rpc = connection.provider;
  reader = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  [owner, fan] = await Promise.all([0, 1].map(i => reader.getSigner(i)));
});
after(async () => { reader?.destroy(); await connection?.close(); delete globalThis.window; delete globalThis.sessionStorage; });

function useSessionStorage() {
  const storage = new MemoryStorage();
  // client.ts checks `typeof window` but reads the bare global `sessionStorage`, matching browser semantics
  globalThis.window = { sessionStorage: storage };
  globalThis.sessionStorage = storage;
  return storage;
}
async function automine(enable) {
  try { await rpc.request({ method: 'evm_setAutomine', params: [enable] }); }
  catch { await rpc.request({ method: 'hardhat_setAutomine', params: [enable] }); }
}
async function harness() {
  await automine(true); // also resets automine state leaked by a previous timeout
  const artifact = JSON.parse(readFileSync(new URL('../deployments/sepolia-build/LivePass.json', import.meta.url)));
  const pass = await new ContractFactory(artifact.abi, artifact.bytecode, owner).deploy(owner.address);
  const deployment = await pass.deploymentTransaction().wait();
  const address = await pass.getAddress();
  await (await pass.createShow('Pending test', 'https://example.com/pending.jpg', price, 1, 0)).wait();
  await (await pass.openSale(0)).wait();
  const config = { chainId: 11155111, address, blockNumber: deployment.blockNumber, runtimeBytecodeHash: keccak256(await reader.getCode(address)) };
  const store = useSessionStorage();
  // ethers wait() polls eth_blockNumber twice before its listener bootstrap settles (initial
  // replacement check + polling subscriber bootstrap); observing the second call lets tests
  // broadcast replacements only after the bootstrap pinned the pre-replacement head. Without
  // this gate the bootstrap can pin the post-replacement head and, on a chain that never
  // mines again, no "block" event ever fires and replacement detection cannot run.
  let blockNumberPolls = 0;
  const listeners = new Map();
  const injected = {
    on(event, fn) { listeners.set(event, fn); },
    removeListener(event, fn) { if (listeners.get(event) === fn) listeners.delete(event); },
    async request(req) {
      if (req.method === 'eth_accounts' || req.method === 'eth_requestAccounts') return [fan.address];
      if (req.method === 'eth_chainId') return '0xaa36a7';
      if (req.method === 'eth_sendTransaction') { ++sends; }
      const result = await rpc.request(req);
      if (req.method === 'eth_blockNumber') ++blockNumberPolls;
      return result;
    },
  };
  const wallet = new WalletController(async () => injected);
  const client = new LivePassClient(reader, wallet, config);
  return { pass, address, config, store, wallet, client, listeners, blockNumberPolls: () => blockNumberPolls };
}
function freshClient(wallet, config) {
  const client = new LivePassClient(reader, wallet, config);
  client.start();
  return client;
}
async function replacementReady(client, blockNumberPolls) {
  await until(() => client.getSnapshot().tx.stage === 'pending');
  await until(() => blockNumberPolls() >= 2);
  const first = await reader.getTransaction(client.getSnapshot().tx.hash);
  assert.ok(first && first.data && first.nonce != null, 'pending transaction must be readable before replacement');
  return first;
}
async function mineOne() { await rpc.request({ method: 'evm_mine', params: [] }); }

test('regression: session evidence restores a mined purchase and checkPending confirms without rebroadcast', { timeout: 60000 }, async () => {
  const { pass, store, wallet, client } = await harness();
  try {
    const receipt = await (await pass.connect(fan).buy(0, { value: price })).wait();
    const tx = await reader.getTransaction(receipt.hash);
    store.setItem(storageKey, JSON.stringify({ hash: receipt.hash, sender: fan.address, action: '购买 Pending test', dataHash: keccak256(tx.data), value: price.toString() }));
    client.start();
    await wallet.connect();
    assert.equal(client.getSnapshot().tx.stage, 'pending');
    assert.equal(client.getSnapshot().tx.hash, receipt.hash);
    assert.match(client.getSnapshot().tx.message, /恢复待确认交易/);
    const before = sends;
    await client.checkPending();
    assert.equal(sends, before); // reconciliation is read-only, never a rebroadcast
    assert.equal(client.getSnapshot().tx.stage, 'confirmed');
    assert.equal(client.getSnapshot().tx.hash, receipt.hash);
    assert.equal(store.getItem(storageKey), null);
    await until(() => client.getSnapshot().personalPhase === 'ready');
    assert.equal(client.getSnapshot().tickets.length, 1);
    assert.equal(client.getSnapshot().bought['0'], true);
  } finally { client?.stop(); wallet.dispose(); await automine(true); }
});

test('regression: mismatched pending evidence is rejected and retained until corrected', { timeout: 60000 }, async () => {
  const { pass, config, store, wallet } = await harness();
  try {
    await wallet.connect();
    const receipt = await (await pass.connect(fan).buy(0, { value: price })).wait();
    const tx = await reader.getTransaction(receipt.hash);
    const evidence = { hash: receipt.hash, sender: fan.address, action: '购买', dataHash: keccak256(tx.data), value: price.toString() };
    for (const patch of [{ dataHash: keccak256('0x1234') }, { sender: `0x${'ab'.repeat(20)}` }, { value: '0' }]) {
      store.setItem(storageKey, JSON.stringify({ ...evidence, ...patch }));
      const probe = freshClient(wallet, config);
      try {
        assert.equal(probe.getSnapshot().tx.stage, 'pending');
        await probe.checkPending();
        assert.match(probe.getSnapshot().tx.message, /核对失败，仍保留原交易：待确认记录与链上交易不匹配/);
        assert.equal(probe.getSnapshot().tx.stage, 'pending');
        assert.notEqual(store.getItem(storageKey), null);
      } finally { probe.stop(); }
    }
    store.setItem(storageKey, JSON.stringify(evidence));
    const resolved = freshClient(wallet, config);
    try {
      await resolved.checkPending();
      assert.equal(resolved.getSnapshot().tx.stage, 'confirmed');
      assert.equal(store.getItem(storageKey), null);
    } finally { resolved.stop(); }
  } finally { wallet.dispose(); await automine(true); }
});

test('regression: malformed session evidence is ignored on start', { timeout: 60000 }, async () => {
  const { config, store, wallet } = await harness();
  try {
    await wallet.connect();
    store.setItem(storageKey, 'not json');
    const first = freshClient(wallet, config);
    try { assert.equal(first.getSnapshot().tx.stage, 'idle'); } finally { first.stop(); }
    store.setItem(storageKey, JSON.stringify({ hash: '0x123', sender: 'not-an-address', dataHash: '', value: 'x', action: 5 }));
    const second = freshClient(wallet, config);
    try { assert.equal(second.getSnapshot().tx.stage, 'idle'); } finally { second.stop(); }
    assert.notEqual(store.getItem(storageKey), null); // invalid entries are never consumed
  } finally { wallet.dispose(); await automine(true); }
});

test('regression: unmined transaction keeps the pending hint until a block lands', { timeout: 60000 }, async () => {
  const { pass, store, wallet, client } = await harness();
  try {
    await wallet.connect();
    await automine(false);
    const response = await pass.connect(fan).buy(0, { value: price });
    store.setItem(storageKey, JSON.stringify({ hash: response.hash, sender: fan.address, action: '购买', dataHash: keccak256(response.data), value: price.toString() }));
    client.start();
    assert.equal(client.getSnapshot().tx.stage, 'pending');
    await client.checkPending();
    assert.match(client.getSnapshot().tx.message, /尚未确认或 RPC 尚未索引/);
    assert.equal(client.getSnapshot().tx.stage, 'pending');
    assert.notEqual(store.getItem(storageKey), null);
    await mineOne();
    await client.checkPending();
    assert.equal(client.getSnapshot().tx.stage, 'confirmed');
    await until(() => client.getSnapshot().tickets.length === 1);
    assert.equal(await pass.ownerOf(1), fan.address);
  } finally { client?.stop(); wallet.dispose(); await automine(true); }
});

test('regression: insufficient balance fails before any signature and recovers after top-up', { timeout: 60000 }, async () => {
  const { pass, wallet, client } = await harness();
  try {
    client.start();
    await wallet.connect();
    await rpc.request({ method: 'hardhat_setBalance', params: [fan.address, '0x1'] });
    const before = sends;
    assert.equal(await client.send('购买', 'buy', [0n], price), false);
    assert.equal(sends, before); // the pre-flight check stops before eth_sendTransaction
    assert.equal(client.getSnapshot().tx.stage, 'failed');
    assert.match(client.getSnapshot().tx.message, /Sepolia 测试 ETH 不足/);
    assert.equal(client.isLocked(), false);
    await rpc.request({ method: 'hardhat_setBalance', params: [fan.address, `0x${parseEther('10').toString(16)}`] });
    assert.equal(await client.send('购买', 'buy', [0n], price), true, client.getSnapshot().tx.message);
    await until(() => client.getSnapshot().personalPhase === 'ready');
    assert.equal(client.getSnapshot().bought['0'], true);
    assert.equal(await pass.ownerOf(1), fan.address);
  } finally { client?.stop(); wallet.dispose(); await automine(true); }
});

test('regression: same-data fee replacement is adopted with the new hash', { timeout: 90000 }, async () => {
  const { pass, address, store, wallet, client, blockNumberPolls } = await harness();
  try {
    client.start();
    await wallet.connect();
    await automine(false);
    const buying = client.send('购买', 'buy', [0n], price);
    const first = await replacementReady(client, blockNumberPolls);
    const replacement = await fan.sendTransaction({
      to: address, data: first.data, value: price, nonce: first.nonce, gasLimit: first.gasLimit,
      type: 2, maxFeePerGas: first.maxFeePerGas * 3n, maxPriorityFeePerGas: first.maxPriorityFeePerGas * 3n + 1n, chainId: 11155111,
    });
    await mineOne();
    await mineOne(); // insurance: a post-replacement block guarantees the poller sees a change
    assert.equal(await buying, true, client.getSnapshot().tx.message);
    assert.equal(client.getSnapshot().tx.stage, 'confirmed');
    assert.equal(client.getSnapshot().tx.hash, replacement.hash);
    assert.equal(store.getItem(storageKey), null);
    await until(() => client.getSnapshot().tickets.length === 1);
    assert.equal(await pass.ownerOf(1), fan.address);
  } finally { client?.stop(); wallet.dispose(); await automine(true); }
});

test('regression: wallet cancellation marks failure and clears stored evidence', { timeout: 90000 }, async () => {
  const { pass, address, store, wallet, client, blockNumberPolls } = await harness();
  try {
    client.start();
    await wallet.connect();
    await automine(false);
    const buying = client.send('购买', 'buy', [0n], price);
    const first = await replacementReady(client, blockNumberPolls);
    const cancel = await fan.sendTransaction({
      to: fan.address, data: '0x', value: 0n, nonce: first.nonce, gasLimit: 21000n,
      type: 2, maxFeePerGas: first.maxFeePerGas * 3n, maxPriorityFeePerGas: first.maxPriorityFeePerGas * 3n + 1n, chainId: 11155111,
    });
    await mineOne();
    await mineOne();
    assert.equal(await buying, false);
    assert.equal(client.getSnapshot().tx.stage, 'failed');
    assert.match(client.getSnapshot().tx.message, /已被替换或取消/);
    assert.equal(client.getSnapshot().tx.hash, cancel.hash);
    assert.equal(store.getItem(storageKey), null);
    assert.equal(client.isLocked(), false);
    assert.equal((await pass.shows(0)).nextTicketNo, 1n); // no ticket was minted
  } finally { client?.stop(); wallet.dispose(); await automine(true); }
});
