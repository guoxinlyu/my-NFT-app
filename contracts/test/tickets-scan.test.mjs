import assert from 'node:assert/strict';
import { test } from 'node:test';
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
const price = parseEther('0.0001');

async function setup() {
  const connection = await hre.network.create('frontendTest');
  const rpc = connection.provider;
  const reader = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  const [owner, fan, other] = await Promise.all([0, 1, 2].map(i => reader.getSigner(i)));
  let account = fan.address;
  const listeners = new Map();
  const injected = {
    on(event, fn) { listeners.set(event, fn); },
    removeListener(event, fn) { if (listeners.get(event) === fn) listeners.delete(event); },
    async request(req) {
      if (req.method === 'eth_accounts' || req.method === 'eth_requestAccounts') return [account];
      if (req.method === 'eth_chainId') return '0xaa36a7';
      return rpc.request(req);
    },
  };
  const wallet = new WalletController(async () => injected);
  const artifact = JSON.parse(readFileSync(new URL('../deployments/sepolia-build/LivePass.json', import.meta.url)));
  const pass = await new ContractFactory(artifact.abi, artifact.bytecode, owner).deploy(owner.address);
  const deployment = await pass.deploymentTransaction().wait();
  const address = await pass.getAddress();
  for (const name of ['Segment A', 'Segment B']) {
    await (await pass.createShow(name, 'https://example.com/segment.jpg', price, 1, 0)).wait();
    await (await pass.openSale((await pass.showCount()) - 1n)).wait();
  }
  const config = { chainId: 11155111, address, blockNumber: deployment.blockNumber, runtimeBytecodeHash: keccak256(await reader.getCode(address)) };
  const client = new LivePassClient(reader, wallet, config);
  return { connection, rpc, reader, owner, fan, other, pass, address, config, wallet, client, listeners, setAccount: value => { account = value; } };
}

test('regression: ticket wallet scans Transfer segments from the deployment block across 2000+ blocks', { timeout: 60000 }, async () => {
  const s = await setup();
  try {
    s.client.start();
    await s.wallet.connect();
    await (await s.pass.connect(s.fan).buy(0, { value: price })).wait();
    await s.rpc.request({ method: 'hardhat_mine', params: ['0x7d0'] });
    await (await s.pass.connect(s.fan).buy(1, { value: price })).wait();
    const getLogs = s.reader.getLogs.bind(s.reader);
    const ranges = [];
    s.reader.getLogs = async filter => { ranges.push(filter); return getLogs(filter); };
    await s.client.load();
    s.reader.getLogs = getLogs;
    await until(() => s.client.getSnapshot().personalPhase === 'ready');
    const snapshot = s.client.getSnapshot();
    assert.equal(snapshot.tickets.length, 2);
    assert.deepEqual(snapshot.tickets.map(ticket => ticket.showId).sort(), ['0', '1']);
    assert.ok(ranges.length >= 3, `expected at least 3 scan segments, got ${ranges.length}`);
    assert.equal(Number(ranges[0].fromBlock), s.config.blockNumber);
    assert.ok(ranges.every(range => Number(range.toBlock) - Number(range.fromBlock) <= 999));
  } finally { s.client?.stop(); s.wallet.dispose(); s.reader.destroy(); await s.connection.close(); }
});

test('regression: tickets acquired or spent in old segments follow current ownership', { timeout: 60000 }, async () => {
  const s = await setup();
  try {
    s.client.start();
    await s.wallet.connect();
    await (await s.pass.connect(s.fan).buy(0, { value: price })).wait();
    await (await s.pass.connect(s.fan).transferFrom(s.fan.address, s.other.address, 1)).wait();
    await s.rpc.request({ method: 'hardhat_mine', params: ['0x7d0'] });
    await (await s.pass.connect(s.other).buy(1, { value: price })).wait();
    await s.client.load();
    await until(() => s.client.getSnapshot().personalPhase === 'ready' && s.client.getSnapshot().identity === s.fan.address);
    assert.equal(s.client.getSnapshot().tickets.length, 0); // minted long ago, transferred out, must not resurface
    s.setAccount(s.other.address);
    s.listeners.get('accountsChanged')?.();
    await until(() => s.client.getSnapshot().identity === s.other.address && s.client.getSnapshot().personalPhase === 'ready');
    const received = s.client.getSnapshot().tickets.find(ticket => ticket.id === '1');
    assert.ok(received, 'ticket received in an old segment must still be found');
    assert.equal(received.ticketNo, null);
    assert.equal(received.status, 'TRANSFERRED · ADMISSIBLE');
    const own = s.client.getSnapshot().tickets.find(ticket => ticket.id === '2');
    assert.ok(own);
    assert.equal(own.status, 'UNUSED · VALID');
    assert.equal(own.ticketNo, '1');
  } finally { s.client?.stop(); s.wallet.dispose(); s.reader.destroy(); await s.connection.close(); }
});
