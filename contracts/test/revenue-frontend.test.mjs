import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BrowserProvider, ContractFactory, keccak256, parseEther } from 'ethers';
import hre from 'hardhat';
import { WalletController } from '../../src/wallet/controller.ts';
import { LivePassClient } from '../../src/livepass/client.ts';

test('revenue events survive withdrawal; deposits, permissions, stale snapshots and RPC failures stay safe', { timeout: 60000 }, async () => {
  const connection = await hre.network.create('frontendTest');
  const rpc = connection.provider, reader = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  const [owner, fan, other] = await Promise.all([0, 1, 2].map(i => reader.getSigner(i)));
  let account = owner.address, chain = '0xaa36a7', sends = 0, reject = false;
  const listeners = new Map();
  const injected = {
    on(event, fn) { listeners.set(event, fn); }, removeListener(event, fn) { if (listeners.get(event) === fn) listeners.delete(event); },
    async request(req) {
      if (['eth_accounts', 'eth_requestAccounts'].includes(req.method)) return [account];
      if (req.method === 'eth_chainId') return chain;
      if (req.method === 'eth_sendTransaction') { ++sends; if (reject) throw { code: 4001 }; }
      return rpc.request(req);
    },
  };
  const wallet = new WalletController(async () => injected); let client;
  const tx = async request => (await request).wait();
  try {
    const artifact = JSON.parse(readFileSync(new URL('../deployments/sepolia-build/LivePass.json', import.meta.url)));
    const pass = await new ContractFactory(artifact.abi, artifact.bytecode, owner).deploy(owner.address);
    const deployment = await pass.deploymentTransaction().wait(), address = await pass.getAddress();
    client = new LivePassClient(reader, wallet, { chainId: 11155111, address, blockNumber: deployment.blockNumber, runtimeBytecodeHash: keccak256(await reader.getCode(address)) });
    client.start(); await wallet.connect(); await client.loadRevenue();
    let data = client.getSnapshot().revenue.data;
    assert.equal(data.showCount, 0n); assert.equal(data.ticketsSold, 0n); assert.equal(data.withdrawable, 0n);
    assert.equal(await client.withdrawRevenue(data), false); assert.equal(sends, 0);
    assert.match(client.getSnapshot().tx.message, /No ticket revenue/);
    const p1 = parseEther('0.0001'), p2 = parseEther('0.0002'), deposit = parseEther('0.003');
    await tx(pass.createShow('Revenue A', 'https://example.com/a.jpg', p1, 0, 0)); await tx(pass.openSale(0));
    await tx(pass.createShow('Revenue B', 'https://example.com/b.jpg', p2, 1, 0)); await tx(pass.openSale(1));
    await tx(pass.connect(fan).stake({ value: deposit }));
    await tx(pass.connect(fan).buy(0, { value: p1 })); await tx(pass.connect(fan).buy(1, { value: p2 }));
    // Force more than one log range: earliest purchases must still be counted.
    await rpc.request({ method: 'hardhat_mine', params: ['0x3ed'] });
    const getLogs = reader.getLogs.bind(reader), ranges = [];
    reader.getLogs = async filter => { ranges.push(filter); return getLogs(filter); };
    await client.loadRevenue(); data = client.getSnapshot().revenue.data;
    assert.equal(data.showCount, 2n); assert.equal(data.ticketsSold, 2n); assert.equal(data.totalSales, p1 + p2);
    assert.equal(data.withdrawable, p1 + p2); assert.equal(data.totalStaked, deposit); assert.equal(data.contractBalance, deposit + p1 + p2);
    assert.deepEqual(data.shows.map(s => s.sold), [1n, 1n]);
    assert.equal(Number(ranges[0].fromBlock), deployment.blockNumber);
    assert.ok(ranges.length >= 2); assert.ok(ranges.every(r => Number(r.toBlock) - Number(r.fromBlock) <= 999));
    assert.equal(sends, 0); // statistics never sign
    reader.getLogs = getLogs;
    account = fan.address; await wallet.refresh();
    assert.equal(client.getSnapshot().revenue.data, null);
    await client.loadRevenue(); assert.equal(client.getSnapshot().revenue.phase, 'error');
    assert.equal(await client.withdrawRevenue(data), false); assert.equal(sends, 0);
    account = owner.address; await wallet.refresh(); await client.loadRevenue();
    const stale = data; data = client.getSnapshot().revenue.data;
    assert.equal(await client.withdrawRevenue(stale), false); assert.equal(sends, 0);
    reject = true; assert.equal(await client.withdrawRevenue(data), false);
    assert.equal(client.getSnapshot().tx.stage, 'rejected'); assert.equal(client.isLocked(), false);
    assert.equal(await pass.ticketRevenue(), p1 + p2);
    reject = false; const before = sends, balance = await reader.getBalance(owner.address);
    const withdrawing = client.withdrawRevenue(data);
    assert.equal(await client.withdrawRevenue(data), false);
    assert.equal(await withdrawing, true, client.getSnapshot().tx.message); assert.equal(sends, before + 1);
    const receipt = await reader.getTransactionReceipt(client.getSnapshot().tx.hash);
    assert.equal(await reader.getBalance(owner.address), balance + p1 + p2 - receipt.fee);
    data = client.getSnapshot().revenue.data;
    assert.equal(data.withdrawable, 0n); assert.equal(data.totalSales, p1 + p2); assert.equal(data.ticketsSold, 2n);
    assert.equal(data.totalStaked, deposit); assert.equal(data.contractBalance, deposit);
    assert.equal(await pass.stakeOf(fan.address), deposit); assert.equal(await pass.ownerOf(1), fan.address); assert.equal(await pass.used(1), false);
    const beforeZero = sends; assert.equal(await client.withdrawRevenue(data), false); assert.equal(sends, beforeZero);
    await tx(pass.connect(other).buy(0, { value: p1 })); await client.loadRevenue();
    data = client.getSnapshot().revenue.data; assert.equal(data.totalSales, p1 * 2n + p2);
    // Another tab withdraws after confirmation snapshot: stop before a signature.
    await tx(pass.withdraw());
    assert.equal(await client.withdrawRevenue(data), false); assert.equal(sends, beforeZero);
    assert.match(client.getSnapshot().tx.message, /票款已变化/);
    reader.getLogs = async () => { throw Error('Event RPC unavailable'); };
    await client.loadRevenue(); assert.equal(client.getSnapshot().revenue.phase, 'error'); assert.equal(client.getSnapshot().revenue.data, null);
    reader.getLogs = getLogs; await client.loadRevenue(); assert.equal(client.getSnapshot().revenue.phase, 'ready');
    const getCode = reader.getCode.bind(reader); let release;
    const pause = new Promise(resolve => { release = resolve; });
    reader.getCode = async (...args) => { await pause; return getCode(...args); };
    const late = client.loadRevenue(); wallet.disconnect(); release(); await late;
    assert.equal(client.getSnapshot().revenue.phase, 'idle'); reader.getCode = getCode;
    chain = '0x1'; await wallet.connect(); await client.loadRevenue();
    assert.equal(client.getSnapshot().revenue.phase, 'error'); assert.equal(sends, beforeZero);
  } finally { client?.stop(); wallet.dispose(); reader.destroy(); await connection.close(); }
});
