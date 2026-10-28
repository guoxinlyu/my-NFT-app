import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BrowserProvider, ContractFactory, keccak256, parseEther } from 'ethers';
import { TransactionResponse } from '../../node_modules/ethers/lib.esm/index.js';
import hre from 'hardhat';
import { WalletController } from '../../src/wallet/controller.ts';
import { LivePassClient } from '../../src/livepass/client.ts';

const storageKey = 'livepass-pending-transaction';
const deposit = parseEther('0.001');
const tx = async request => (await request).wait();

async function setup(t) {
  const connection = await hre.network.create('frontendTest');
  const rpc = connection.provider, reader = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  const [owner, fan] = await Promise.all([reader.getSigner(0), reader.getSigner(1)]);
  const storage = new Map(), writes = [], clients = [];
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem(key, value) { storage.set(key, value); writes.push(JSON.parse(value)); },
    removeItem: key => storage.delete(key),
  } });
  const session = { sends: 0 };
  const injected = {
    on() {}, removeListener() {},
    async request(req) {
      if (['eth_accounts', 'eth_requestAccounts'].includes(req.method)) return [owner.address];
      if (req.method === 'eth_chainId') return '0xaa36a7';
      if (req.method === 'eth_sendTransaction') ++session.sends;
      return rpc.request(req);
    },
  };
  const wallet = new WalletController(async () => injected);
  t.after(async () => {
    clients.forEach(client => client.stop()); wallet.dispose(); reader.destroy(); await connection.close();
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else delete globalThis.window;
    if (previousStorage) Object.defineProperty(globalThis, 'sessionStorage', previousStorage); else delete globalThis.sessionStorage;
  });
  const artifact = JSON.parse(readFileSync(new URL('../deployments/sepolia-build/LivePass.json', import.meta.url)));
  const pass = await new ContractFactory(artifact.abi, artifact.bytecode, owner).deploy(owner.address);
  const deployed = await pass.deploymentTransaction().wait(), address = await pass.getAddress();
  const config = { chainId: 11155111, address, blockNumber: deployed.blockNumber, runtimeBytecodeHash: keccak256(await reader.getCode(address)) };
  await wallet.connect();
  async function restore(evidence) {
    if (evidence) storage.set(storageKey, JSON.stringify(evidence));
    const client = new LivePassClient(reader, wallet, config); clients.push(client); client.start(); await client.load();
    return client;
  }
  async function pendingStake() {
    await rpc.request({ method: 'evm_setAutomine', params: [false] });
    const nonce = await reader.getTransactionCount(owner.address), data = pass.interface.encodeFunctionData('stake');
    const original = await owner.sendTransaction({ to: address, data, value: deposit, nonce, gasLimit: 1000000n, gasPrice: 1000000000n });
    return { original, evidence: { hash: original.hash, sender: owner.address, action: '存入保证金', dataHash: keccak256(data), value: deposit.toString(), nonce } };
  }
  async function replace(evidence, request) {
    const replacement = await owner.sendTransaction({ nonce: evidence.nonce, gasLimit: 1000000n, gasPrice: 2000000000n, ...request });
    await rpc.request({ method: 'evm_mine', params: [] });
    await rpc.request({ method: 'evm_setAutomine', params: [true] });
    assert.equal(await reader.getTransactionReceipt(evidence.hash), null);
    return replacement;
  }
  return { rpc, reader, owner, fan, wallet, pass, address, deployed, storage, writes, session, restore, pendingStake, replace };
}

test('successful receipts preserve the wallet session and verification context, and persist the broadcast nonce', async t => {
  const { owner, fan, wallet, pass, reader, writes, session, restore } = await setup(t);
  await tx(pass.createShow('Refresh regression', 'https://example.com/show.jpg', deposit, 1, 0));
  await tx(pass.openSale(0)); await tx(pass.connect(fan).buy(0, { value: deposit }));
  const client = await restore(); await client.checkTicket('0', '1');
  const identity = wallet.getSession(), identities = [], checks = [];
  const unsubscribeWallet = wallet.subscribe(() => identities.push(wallet.getSnapshot().address));
  const unsubscribeClient = client.subscribe(() => checks.push(client.getSnapshot().check.phase));
  try {
    assert.equal(await client.send('Verify', 'verify', [0n, 1n]), true);
    assert.ok(identities.length > 0 && identities.every(address => address === owner.address));
    assert.ok(checks.every(phase => phase === 'ready'));
    assert.equal(wallet.isCurrentSession(identity), true);
    await client.checkTicket('0', '1');
    assert.equal(client.getSnapshot().check.result.used, true);
    assert.equal(client.getSnapshot().check.result.verifiedCount, 1n);
    const broadcast = writes.find(record => record.action === 'Verify');
    assert.equal(broadcast.nonce, (await reader.getTransaction(broadcast.hash)).nonce);
    assert.equal(session.sends, 1);
  } finally { unsubscribeWallet(); unsubscribeClient(); }
});

test('restored cancellation checks reject unrelated hashes and RPC failures, then unlock only after its confirmed receipt', async t => {
  const { owner, fan, reader, address, deployed, storage, session, restore, pendingStake, replace } = await setup(t);
  const { evidence } = await pendingStake();
  const cancellation = await replace(evidence, { to: owner.address, value: 0n, gasLimit: 21000n });
  const unrelated = await fan.sendTransaction({ to: fan.address, value: 0n }); await unrelated.wait();
  const client = await restore(evidence);
  assert.equal(client.isLocked(), true);
  for (const hash of ['invalid hash', unrelated.hash, deployed.hash]) {
    await client.checkPending(hash);
    assert.equal(client.isLocked(), true);
    assert.equal(client.getSnapshot().tx.hash, evidence.hash);
    assert.ok(storage.has(storageKey));
  }
  const getReceipt = reader.getTransactionReceipt.bind(reader);
  reader.getTransactionReceipt = async () => { throw new Error('Recovery RPC unavailable'); };
  await client.checkPending(cancellation.hash);
  assert.match(client.getSnapshot().tx.message, /Recovery RPC unavailable/);
  assert.equal(client.isLocked(), true); reader.getTransactionReceipt = getReceipt;
  await client.checkPending(); assert.equal(client.isLocked(), true);
  await client.checkPending(cancellation.hash);
  assert.equal(client.isLocked(), false);
  assert.equal(client.getSnapshot().tx.stage, 'rejected');
  assert.equal(client.getSnapshot().tx.hash, cancellation.hash);
  assert.equal(await reader.getBalance(address), 0n);
  assert.equal(storage.has(storageKey), false);
  assert.equal(session.sends, 0); // Recovery is read-only, including failure and retry.
  assert.equal(await client.send('Stake after cancellation', 'stake', [], deposit), true);
  assert.equal(session.sends, 1);
});

test('a restored speed-up confirms the original operation once and allows subsequent transactions', async t => {
  const { pass, address, session, restore, pendingStake, replace } = await setup(t);
  const { evidence } = await pendingStake();
  const replacement = await replace(evidence, { to: address, data: pass.interface.encodeFunctionData('stake'), value: deposit });
  const client = await restore(evidence);
  await client.checkPending(replacement.hash);
  assert.equal(client.isLocked(), false); assert.equal(client.getSnapshot().tx.stage, 'confirmed');
  assert.equal(client.getSnapshot().tx.hash, replacement.hash);
  assert.equal(client.getSnapshot().stake, deposit); assert.equal(session.sends, 0);
  assert.equal(await client.send('Another deposit', 'stake', [], deposit), true);
  assert.equal(client.getSnapshot().stake, deposit * 2n); assert.equal(session.sends, 1);
});

test('an unconfirmed replacement keeps the original record and transaction lock', async t => {
  const { rpc, owner, pass, address, session, restore, pendingStake } = await setup(t);
  const { evidence } = await pendingStake();
  const replacement = await owner.sendTransaction({ to: address, data: pass.interface.encodeFunctionData('stake'), value: deposit,
    nonce: evidence.nonce, gasLimit: 1000000n, gasPrice: 2000000000n });
  const client = await restore(evidence);
  await client.checkPending(replacement.hash);
  assert.equal(client.isLocked(), true); assert.equal(client.getSnapshot().tx.hash, evidence.hash); assert.equal(session.sends, 0);
  await rpc.request({ method: 'evm_mine', params: [] });
  await rpc.request({ method: 'evm_setAutomine', params: [true] });
  await client.checkPending(replacement.hash);
  assert.equal(client.getSnapshot().tx.stage, 'confirmed');
});

for (const reverted of [false, true]) test(`a ${reverted ? 'reverted' : 'different'} replacement settles the nonce without reporting the original operation as successful`, async t => {
  const { pass, address, restore, pendingStake, replace } = await setup(t);
  const { evidence } = await pendingStake();
  const replacement = await replace(evidence, { to: address, data: reverted ? '0xdeadbeef' : pass.interface.encodeFunctionData('stake'), value: deposit * 2n });
  const client = await restore(evidence); await client.checkPending(replacement.hash);
  assert.equal(client.isLocked(), false);
  assert.equal(client.getSnapshot().tx.stage, reverted ? 'reverted' : 'failed');
  assert.equal(client.getSnapshot().tx.hash, replacement.hash);
  assert.equal(client.getSnapshot().stake, reverted ? 0n : deposit * 2n);
});

test('legacy pending records recover the original receipt but do not guess a dropped transaction nonce', async t => {
  const { rpc, owner, writes, storage, restore, pendingStake, replace } = await setup(t);
  let { evidence } = await pendingStake();
  const legacy = { ...evidence }; delete legacy.nonce;
  const client = await restore(legacy);
  await client.checkPending(); assert.equal(client.isLocked(), true);
  assert.equal(writes.at(-1).nonce, evidence.nonce);
  await rpc.request({ method: 'evm_mine', params: [] });
  await rpc.request({ method: 'evm_setAutomine', params: [true] });
  await client.checkPending(); assert.equal(client.getSnapshot().tx.stage, 'confirmed');
  client.stop();
  ({ evidence } = await pendingStake());
  const cancellation = await replace(evidence, { to: owner.address, value: 0n, gasLimit: 21000n });
  delete evidence.nonce;
  const restored = await restore(evidence); await restored.checkPending(cancellation.hash);
  assert.equal(restored.isLocked(), true); assert.match(restored.getSnapshot().tx.message, /旧记录缺少/);
  assert.ok(storage.has(storageKey));
});

test('a late original wait cannot overwrite a manually recovered cancellation or the next successful transaction', { timeout: 10000 }, async t => {
  const { rpc, owner, address, storage, restore, replace } = await setup(t);
  const client = await restore();
  await rpc.request({ method: 'evm_setAutomine', params: [false] });
  const wait = TransactionResponse.prototype.wait;
  let release, started;
  const paused = new Promise(resolve => { release = resolve; });
  const waiting = new Promise(resolve => { started = resolve; });
  let intercepted = false;
  TransactionResponse.prototype.wait = async function (...args) {
    if (this.to === address && !intercepted) {
      intercepted = true; started(this); await paused;
      throw new Error('Late original wait timeout');
    }
    return wait.apply(this, args);
  };
  const originalSend = client.send('Original deposit', 'stake', [], deposit);
  try {
    const original = await waiting;
    const evidence = JSON.parse(storage.get(storageKey));
    const cancellation = await replace(evidence, { to: owner.address, value: 0n, gasLimit: 21000n,
      gasPrice: (original.maxFeePerGas ?? original.gasPrice) * 2n + 1n });
    await client.checkPending(cancellation.hash);
    assert.equal(client.getSnapshot().tx.stage, 'rejected');
    assert.equal(await client.send('Next deposit', 'stake', [], deposit), true);
    const nextHash = client.getSnapshot().tx.hash;
    release(); assert.equal(await originalSend, false);
    assert.equal(client.getSnapshot().tx.stage, 'confirmed');
    assert.equal(client.getSnapshot().tx.hash, nextHash);
    assert.equal(client.getSnapshot().stake, deposit);
  } finally { release(); TransactionResponse.prototype.wait = wait; await originalSend; }
});
