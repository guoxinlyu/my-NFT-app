import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BrowserProvider, ContractFactory, keccak256, parseEther, ZeroAddress } from 'ethers';
import hre from 'hardhat';
import { WalletController } from '../../src/wallet/controller.ts';
import { LivePassClient } from '../../src/livepass/client.ts';

async function setup(t) {
  const connection = await hre.network.create('frontendTest');
  const rpc = connection.provider;
  const reader = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  const [owner, fan, recipient] = await Promise.all([0, 1, 2].map(i => reader.getSigner(i)));
  const session = { account: owner.address, chain: '0xaa36a7', reject: false, sends: 0, walletCalls: [] };
  const listeners = new Map();
  const injected = {
    on(event, fn) { listeners.set(event, fn); },
    removeListener(event, fn) { if (listeners.get(event) === fn) listeners.delete(event); },
    async request(req) {
      session.walletCalls.push(req.method);
      if (['eth_accounts', 'eth_requestAccounts'].includes(req.method)) return [session.account];
      if (req.method === 'eth_chainId') return session.chain;
      if (req.method === 'eth_sendTransaction') {
        ++session.sends;
        if (session.reject) throw { code: 4001 };
      }
      return rpc.request(req);
    },
  };
  const wallet = new WalletController(async () => injected);
  let client;
  t.after(async () => { client?.stop(); wallet.dispose(); reader.destroy(); await connection.close(); });
  const artifact = JSON.parse(readFileSync(new URL('../deployments/sepolia-build/LivePass.json', import.meta.url)));
  const pass = await new ContractFactory(artifact.abi, artifact.bytecode, owner).deploy(owner.address);
  const deployment = await pass.deploymentTransaction().wait();
  const address = await pass.getAddress();
  client = new LivePassClient(reader, wallet, {
    chainId: 11155111, address, blockNumber: deployment.blockNumber,
    runtimeBytecodeHash: keccak256(await reader.getCode(address)),
  });
  return { rpc, reader, owner, fan, recipient, pass, deployment, wallet, client, session };
}
const tx = async request => (await request).wait();

test('automatic loading makes no contract reads before Sepolia connection and clears data on disconnect', { timeout: 60000 }, async t => {
  const { reader, wallet, client, session, pass } = await setup(t);
  await tx(pass.createShow('Connection gate', 'https://example.com/show.jpg', parseEther('0.0001'), 0, 0));
  const getCode = reader.getCode.bind(reader);
  let checks = 0;
  reader.getCode = (...args) => { ++checks; return getCode(...args); };
  client.start(); await client.load();
  assert.equal(checks, 0); assert.equal(client.getSnapshot().phase, 'idle');
  session.chain = '0x1'; await wallet.connect(); await client.load();
  assert.equal(checks, 0); assert.equal(client.getSnapshot().owner, null);
  session.chain = '0xaa36a7'; await wallet.refresh(); await client.load();
  assert.ok(checks > 0); assert.equal(client.getSnapshot().shows.length, 1);
  wallet.disconnect();
  const before = checks;
  await client.load();
  assert.equal(checks, before); assert.equal(client.getSnapshot().owner, null);
  assert.equal(client.getSnapshot().phase, 'idle'); assert.deepEqual(client.getSnapshot().shows, []);
  assert.deepEqual(client.getSnapshot().tickets, []); assert.equal(client.getSnapshot().identity, null);
});

test('rule edits use the shared transaction flow, enforce owner/freeze rules and refresh show data', { timeout: 60000 }, async t => {
  const { pass, wallet, client, session, fan, owner } = await setup(t);
  const price = parseEther('0.0001'), updated = price + 1n, floor = parseEther('0.001');
  await tx(pass.createShow('Editable show', 'https://example.com/show.jpg', price, 0, 0));
  await wallet.connect(); client.start(); await client.load();
  const edits = [['setPrice', [0n, updated]], ['setResalePolicy', [0n, 2]], ['setStakeRequirement', [0n, floor]]];
  for (const [method, args] of edits) {
    assert.equal(await client.send(method, method, args), true, client.getSnapshot().tx.message);
    assert.equal(client.getSnapshot().tx.stage, 'confirmed');
  }
  const show = client.getSnapshot().shows[0];
  assert.equal(show.priceWei, updated); assert.equal(show.policy, 'Detect'); assert.equal(show.minStake, floor);
  assert.equal((await pass.shows(0)).price, updated);
  assert.equal(await client.send('Disable stake', 'setStakeRequirement', [0n, 0n]), true);
  assert.equal(client.getSnapshot().shows[0].minStake, 0n);

  for (const [method, args, reason] of [
    ['setPrice', [0n, 0n], 'Price must be positive'],
    ['setResalePolicy', [0n, 3], 'Invalid resale policy'],
    ['setStakeRequirement', [0n, floor - 1n], 'Stake requirement below minimum'],
    ['setPrice', [999n, updated], 'Show does not exist'],
  ]) {
    const before = session.sends;
    assert.equal(await client.send(method, method, args), false);
    assert.equal(client.getSnapshot().tx.message, reason); assert.equal(session.sends, before);
    assert.equal(client.isLocked(), false);
  }
  session.account = fan.address; await wallet.refresh();
  for (const [method, args] of edits) {
    const before = session.sends;
    assert.equal(await client.send(method, method, args), false);
    assert.match(client.getSnapshot().tx.message, /不是合约主办方/); assert.equal(session.sends, before);
  }
  session.account = owner.address; await wallet.refresh();
  session.reject = true;
  assert.equal(await client.send('Rejected edit', 'setPrice', [0n, price]), false);
  assert.equal(client.getSnapshot().tx.stage, 'rejected'); assert.equal(client.isLocked(), false);
  assert.equal((await pass.shows(0)).price, updated);
  session.reject = false;
  const before = session.sends;
  const editing = client.send('Retry edit', 'setPrice', [0n, price]);
  assert.equal(await client.send('Duplicate edit', 'setPrice', [0n, price]), false);
  assert.equal(await editing, true); assert.equal(session.sends, before + 1);
  assert.equal(client.getSnapshot().shows[0].priceWei, price);

  await tx(pass.openSale(0)); await tx(pass.closeSale(0));
  for (const [method, args] of edits) {
    const before = session.sends;
    assert.equal(await client.send(method, method, args), false);
    assert.equal(client.getSnapshot().tx.message, 'Rules are frozen after sale opens');
    assert.equal(session.sends, before);
  }
  session.chain = '0x1'; await wallet.refresh();
  for (const [method, args] of edits) {
    const before = session.sends;
    assert.equal(await client.send(method, method, args), false); assert.equal(session.sends, before);
  }
});

test('provenance returns the full ordered issuance/transfer history and a current block snapshot without a wallet', { timeout: 60000 }, async t => {
  const { rpc, reader, owner, fan, recipient, pass, deployment, client, session } = await setup(t);
  const price = parseEther('0.0001');
  await tx(pass.createShow('Open show', 'https://example.com/open.jpg', price, 1, 0));
  await tx(pass.createShow('Other show', 'https://example.com/other.jpg', price, 0, 0));
  await tx(pass.openSale(0)); await tx(pass.openSale(1));
  const purchase = await tx(pass.connect(fan).buy(0, { value: price }));
  await tx(pass.connect(fan).buy(1, { value: price })); // must not appear in Token #1 history
  await rpc.request({ method: 'hardhat_mine', params: ['0x3e9'] });
  // Two transfers in the same block must retain their log order.
  let outward, returned;
  await rpc.request({ method: 'evm_setAutomine', params: [false] });
  try {
    const gas = { gasLimit: 1000000n, gasPrice: 1000000000n };
    const a = await pass.connect(fan).transferFrom(fan.address, recipient.address, 1, gas);
    const b = await pass.connect(recipient).transferFrom(recipient.address, fan.address, 1, gas);
    await rpc.request({ method: 'evm_mine', params: [] });
    [outward, returned] = await Promise.all([a.wait(), b.wait()]);
  } finally { await rpc.request({ method: 'evm_setAutomine', params: [true] }); }
  assert.equal(outward.status, 1); assert.equal(returned.status, 1);
  assert.equal(outward.blockNumber, returned.blockNumber);
  await tx(pass.verify(0, 1));
  const afterUse = await tx(pass.connect(fan).transferFrom(fan.address, recipient.address, 1));
  await tx(pass.transferOwnership(recipient.address));

  const getLogs = reader.getLogs.bind(reader), ranges = [];
  reader.getLogs = async filter => { ranges.push(filter); return (await getLogs(filter)).reverse(); };
  const result = await client.getProvenance(1n);
  assert.equal(result.tokenId, '1'); assert.equal(result.showId, '0');
  assert.equal(result.issuer, owner.address); assert.equal(result.firstBuyer, fan.address);
  assert.equal(result.currentHolder, recipient.address); assert.equal(result.mintedAt, (await pass.mintedAt(1)).toString());
  assert.equal(result.used, true); assert.equal(result.policy, 'Open'); assert.equal(result.status, 'VERIFIED · ADMIT');
  assert.equal(result.ticket.id, '1'); assert.equal(result.ticket.showId, '0');
  assert.equal(result.ticket.name, 'Open show'); assert.equal(result.ticket.ticketNo, null);
  assert.equal(result.ticket.holder, result.currentHolder); assert.equal(result.ticket.used, result.used);
  assert.equal(result.ticket.status, result.status);
  const metadata = JSON.parse(Buffer.from((await pass.tokenURI(1)).split(',')[1], 'base64').toString('utf8'));
  assert.equal(result.ticket.image, metadata.image);
  assert.equal(result.blockNumber, await reader.getBlockNumber());
  assert.deepEqual(result.history.map(event => event.event), ['TicketIssued', 'Transfer', 'Transfer', 'Transfer', 'Transfer']);
  const [issued, minted, moved, back, last] = result.history;
  assert.equal(issued.issuer, owner.address); assert.equal(issued.buyer, fan.address);
  assert.equal(issued.transactionHash, purchase.hash);
  assert.equal(minted.from, ZeroAddress); assert.equal(minted.to, fan.address);
  assert.equal(moved.from, fan.address); assert.equal(moved.to, recipient.address);
  assert.equal(back.from, recipient.address); assert.equal(back.to, fan.address);
  assert.equal(last.from, fan.address); assert.equal(last.to, recipient.address);
  assert.deepEqual(result.history.map(event => event.transactionHash), [purchase.hash, purchase.hash, outward.hash, returned.hash, afterUse.hash]);
  assert.ok(moved.logIndex < back.logIndex);
  for (const event of result.history) assert.equal(event.timestamp, (await reader.getBlock(event.blockNumber)).timestamp);
  assert.equal(minted.timestamp.toString(), result.mintedAt);
  assert.ok(ranges.length >= 4); // both filters cross at least two ranges
  assert.equal(Number(ranges[0].fromBlock), deployment.blockNumber);
  assert.ok(ranges.every(range => Number(range.toBlock) - Number(range.fromBlock) <= 999));
  assert.equal(session.walletCalls.length, 0); assert.equal(session.sends, 0);

  // A late range failure must reject instead of returning a truncated history.
  reader.getLogs = async filter => {
    if (Number(filter.fromBlock) > deployment.blockNumber) throw Error('History RPC unavailable');
    return getLogs(filter);
  };
  await assert.rejects(client.getProvenance(1n), /History RPC unavailable/);
  reader.getLogs = getLogs;
  assert.equal((await client.getProvenance(1n)).history.length, 5);
  for (const tokenId of [0n, 999n]) await assert.rejects(client.getProvenance(tokenId), /ERC721NonexistentToken/);
});
