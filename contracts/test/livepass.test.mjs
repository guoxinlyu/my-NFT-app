import assert from 'node:assert/strict';
import { before, after, beforeEach, test } from 'node:test';
import { BrowserProvider, ContractFactory, ZeroAddress, parseEther } from 'ethers';
import hre from 'hardhat';
import { compile } from '../scripts/compile.mjs';
import { verifyDeployment } from '../scripts/verify-deployment.mjs';

let artifacts, connection, rpc, provider, owner, alice, bob, operator, pass;
const price = parseEther('0.01');
const floor = parseEther('0.001');
before(async () => {
  artifacts = compile();
  connection = await hre.network.create('hardhatMainnet');
  rpc = connection.provider;
  provider = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  [owner, alice, bob, operator] = await Promise.all([0, 1, 2, 3].map(i => provider.getSigner(i)));
});
after(async () => { provider?.destroy(); await connection?.close(); });
beforeEach(async () => {
  const artifact = artifacts.LivePass;
  pass = await new ContractFactory(artifact.abi, artifact.bytecode, owner).deploy(owner.address);
  await pass.waitForDeployment();
});

async function tx(promise) { return (await promise).wait(); }
async function create(policy = 1, stake = 0n, name = 'LivePass 演出') {
  const id = await pass.showCount();
  await tx(pass.createShow(name, 'https://example.com/poster.jpg', price, policy, stake));
  return id;
}
async function opened(policy = 1, stake = 0n) {
  const id = await create(policy, stake); await tx(pass.openSale(id)); return id;
}
async function advance(seconds) {
  await rpc.request({ method: 'evm_increaseTime', params: [seconds] });
  await rpc.request({ method: 'evm_mine', params: [] });
}
function logs(receipt, name) {
  return receipt.logs.flatMap(log => { try { const decoded = pass.interface.parseLog(log); return decoded?.name === name ? [decoded] : []; } catch { return []; } });
}
async function reason(promise, expected) {
  await assert.rejects(promise, error => {
    assert.equal(error.revert?.name === 'Error' ? error.reason : error.revert?.name ?? error.reason, expected, error.message);
    return true;
  });
}
async function accounted() {
  assert.equal(await provider.getBalance(await pass.getAddress()), await pass.ticketRevenue() + await pass.totalStaked());
}
function metadata(uri) {
  assert.ok(uri.startsWith('data:application/json;base64,'));
  const json = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
  assert.ok(json.image.startsWith('data:image/svg+xml;base64,'));
  return { json, svg: Buffer.from(json.image.split(',')[1], 'base64').toString('utf8') };
}
async function actor() {
  const a = await new ContractFactory(artifacts.Adversary.abi, artifacts.Adversary.bytecode, owner).deploy(await pass.getAddress());
  await a.waitForDeployment(); return a;
}

test('AC-01: deployment, ERC721 support, empty counters and immutable constants', async () => {
  assert.equal(await pass.name(), 'LivePass'); assert.equal(await pass.symbol(), 'LIVEPASS');
  assert.equal(await pass.owner(), owner.address); assert.equal(await pass.showCount(), 0n);
  assert.equal(await pass.supportsInterface('0x80ac58cd'), true);
  assert.equal(await pass.supportsInterface('0x5b5e139f'), true);
  assert.equal(await pass.STAKE_COOLDOWN(), 600n); assert.equal(await pass.MIN_STAKE_FLOOR(), floor);
  await reason(pass.withdraw.staticCall(), 'No ticket revenue'); await accounted();
});

test('deployment recorder checks receipt, exact bytecode, constructor owner and initial state', async () => {
  const hash = pass.deploymentTransaction().hash;
  const record = await verifyDeployment(provider, artifacts.LivePass, hash, 31337n);
  assert.equal(record.address, await pass.getAddress());
  assert.equal(record.initialOwner, owner.address); assert.equal(record.chainId, 31337);
  await assert.rejects(verifyDeployment(provider, artifacts.LivePass, hash), /expected chain/);
  await assert.rejects(verifyDeployment(provider, artifacts.LivePass, '0x123'), /Invalid transaction hash/);
  await assert.rejects(verifyDeployment(provider, { ...artifacts.LivePass, bytecode: '0x00' }, hash, 31337n), /Creation bytecode/);
  await assert.rejects(verifyDeployment(provider, { ...artifacts.LivePass, deployedBytecode: '0x00' }, hash, 31337n), /runtime bytecode/);
  await create(); // historical block reads must still verify the deployment state
  assert.equal((await verifyDeployment(provider, artifacts.LivePass, hash, 31337n)).checks.initialShowCount, '0');
});

test('deployment recorder rejects a different initial owner and non-creation transactions', async () => {
  const a = artifacts.LivePass;
  const other = await new ContractFactory(a.abi, a.bytecode, owner).deploy(alice.address);
  await other.waitForDeployment();
  await assert.rejects(verifyDeployment(provider, a, other.deploymentTransaction().hash, 31337n), /Initial owner/);
  const ordinary = await owner.sendTransaction({ to: alice.address, value: 0n }); await ordinary.wait();
  await assert.rejects(verifyDeployment(provider, a, ordinary.hash, 31337n), /contract deployment/);
});

test('management is owner-only; unknown shows cannot create phantom state', async () => {
  const fan = pass.connect(alice);
  await Promise.all([fan.createShow.staticCall('Show', '', price, 1, 0), fan.openSale.staticCall(0), fan.closeSale.staticCall(0),
    fan.setPrice.staticCall(0, price), fan.setResalePolicy.staticCall(0, 0), fan.setStakeRequirement.staticCall(0, 0),
    fan.verify.staticCall(0, 1), fan.withdraw.staticCall()].map(call => reason(call, 'OwnableUnauthorizedAccount')));
  await Promise.all([pass.openSale.staticCall(0), pass.closeSale.staticCall(0), pass.setPrice.staticCall(0, price),
    pass.setResalePolicy.staticCall(0, 1), pass.setStakeRequirement.staticCall(0, 0), fan.buy.staticCall(0, { value: price })].map(call => reason(call, 'Show does not exist')));
  assert.equal(await pass.showCount(), 0n);
});

test('validates rules, UTF-8 names and JSON/SVG injection boundaries', async () => {
  for (const name of ['', ' ', ' Show', 'Show ', 'x'.repeat(65), 'A"B', 'A\\B', '<script>', 'A&B', 'A\nB', 'A\x7fB']) {
    await reason(pass.createShow.staticCall(name, '', price, 1, 0), 'Invalid show name');
  }
  await reason(pass.createShow.staticCall('Show', '', 0, 1, 0), 'Price must be positive');
  await reason(pass.createShow.staticCall('Show', '', price, 3, 0), 'Invalid resale policy');
  await reason(pass.createShow.staticCall('Show', '', price, 1, 1), 'Stake requirement below minimum');
  await reason(pass.createShow.staticCall('Show', 'x'.repeat(2049), price, 1, 0), 'Poster too long');
  await create(1, 0, '演'.repeat(64));
  await reason(pass.createShow.staticCall('演'.repeat(65), '', price, 1, 0), 'Invalid show name');
  // ethers won't encode invalid Unicode strings: build the ABI bytes deliberately.
  const encoded = pass.interface.encodeFunctionData('createShow', ['AA', '', price, 1, 0]);
  const malicious = encoded.replace('4141' + '00'.repeat(30), 'c080' + '00'.repeat(30));
  await assert.rejects(owner.call({ to: await pass.getAddress(), data: malicious }), /Invalid show name/);
});

test('AC-03/33: edits before sale; first opening freezes all rules permanently', async () => {
  const id = await create();
  await tx(pass.setPrice(id, price * 2n)); await tx(pass.setResalePolicy(id, 2)); await tx(pass.setStakeRequirement(id, floor));
  await reason(pass.setPrice.staticCall(id, 0), 'Price must be positive');
  await reason(pass.setResalePolicy.staticCall(id, 3), 'Invalid resale policy');
  await reason(pass.setStakeRequirement.staticCall(id, 1), 'Stake requirement below minimum');
  const receipt = await tx(pass.openSale(id)); assert.equal(logs(receipt, 'SaleToggled')[0].args.open, true);
  await tx(pass.closeSale(id));
  assert.equal((await pass.shows(id)).saleOpen, false); assert.equal((await pass.shows(id)).rulesFrozen, true);
  await Promise.all([pass.setPrice.staticCall(id, price), pass.setResalePolicy.staticCall(id, 0), pass.setStakeRequirement.staticCall(id, 0)].map(call => reason(call, 'Rules are frozen after sale opens')));
  await tx(pass.openSale(id)); assert.equal((await pass.shows(id)).price, price * 2n);
});

test('AC-02/04/05/06/24/36: exact payment, atomic mint, one first purchase per show', async () => {
  const id = await create(); const fan = pass.connect(alice);
  await reason(fan.buy.staticCall(id, { value: price }), 'Sale is not open');
  await tx(pass.openSale(id));
  for (const value of [0n, price - 1n, price + 1n]) await reason(fan.buy.staticCall(id, { value }), 'Send the exact ticket price');
  const receipt = await tx(fan.buy(id, { value: price }));
  assert.equal(await pass.ownerOf(1), alice.address); assert.equal(await pass.hasBought(alice.address, id), true);
  assert.equal(await pass.ticketOf(alice.address, id), 1n); assert.equal(await pass.tokenShow(1), id);
  assert.equal(logs(receipt, 'TicketBought')[0].args.price, price);
  assert.equal(logs(receipt, 'TicketIssued')[0].args.issuer, owner.address);
  assert.equal(logs(receipt, 'Transfer')[0].args.from, ZeroAddress);
  await reason(fan.buy.staticCall(id, { value: price }), 'One ticket per wallet');
  await tx(fan.transferFrom(alice.address, bob.address, 1));
  await reason(fan.buy.staticCall(id, { value: price }), 'One ticket per wallet');
  assert.equal(await pass.ticketOf(bob.address, id), 0n);
  await tx(pass.connect(bob).buy(id, { value: price })); // receiving is not a first purchase
  const other = await opened(); await tx(fan.buy(other, { value: price }));
  assert.equal(await pass.tokenShow(3), other); assert.equal(await pass.ticketNumber(3), 1n);
  await tx(pass.closeSale(id)); await reason(pass.connect(operator).buy.staticCall(id, { value: price }), 'Sale is not open');
  await accounted();
});

test('AC-30: Closed rejects direct, safe and approved transfers, while allowing mint', async () => {
  const id = await opened(0); const fan = pass.connect(alice);
  await tx(fan.buy(id, { value: price })); await tx(fan.approve(operator.address, 1));
  for (const method of ['transferFrom', 'safeTransferFrom(address,address,uint256)', 'safeTransferFrom(address,address,uint256,bytes)']) {
    const args = method.endsWith(',bytes)') ? [alice.address, bob.address, 1, '0x'] : [alice.address, bob.address, 1];
    await reason(fan[method].staticCall(...args), 'Resale not permitted');
    await reason(pass.connect(operator)[method].staticCall(...args), 'Resale not permitted');
  }
  assert.equal(await pass.ownerOf(1), alice.address);
  assert.equal(metadata(await pass.tokenURI(1)).json.attributes[0].value, 'UNUSED - VALID');
});

test('AC-07/08/09/31: Open transferee can enter once, wrong show/token rejected', async () => {
  const id = await opened(1); await create(); await tx(pass.connect(alice).buy(id, { value: price }));
  await reason(pass.connect(bob).transferFrom.staticCall(alice.address, bob.address, 1), 'ERC721InsufficientApproval');
  await tx(pass.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, bob.address, 1));
  assert.equal(metadata(await pass.tokenURI(1)).json.attributes[0].value, 'TRANSFERRED - ADMISSIBLE');
  await reason(pass.verify.staticCall(1, 1), 'Ticket does not belong to this show');
  await reason(pass.verify.staticCall(0, 999), 'ERC721NonexistentToken');
  await reason(pass.connect(bob).verify.staticCall(id, 1), 'OwnableUnauthorizedAccount');
  assert.equal(logs(await tx(pass.verify(id, 1)), 'TicketVerified')[0].args.venue, owner.address);
  await reason(pass.verify.staticCall(id, 1), 'Ticket already used');
  assert.equal(metadata(await pass.tokenURI(1)).json.attributes[0].value, 'VERIFIED - ADMIT');
  await accounted();
});

test('AC-32: Detect rejects transferee, accepts returned original buyer; used status has priority', async () => {
  const id = await opened(2); await tx(pass.connect(alice).buy(id, { value: price }));
  assert.equal(metadata(await pass.tokenURI(1)).json.attributes[0].value, 'UNUSED - VALID');
  await tx(pass.connect(alice).transferFrom(alice.address, bob.address, 1));
  assert.equal(metadata(await pass.tokenURI(1)).json.attributes[0].value, 'RESOLD - NOT ADMISSIBLE');
  await reason(pass.verify.staticCall(id, 1), 'Resale not permitted');
  await tx(pass.connect(bob).transferFrom(bob.address, alice.address, 1));
  await tx(pass.verify(id, 1));
  // Canon leaves post-verification transfer allowed for Open/Detect; it never clears used.
  await tx(pass.connect(alice).transferFrom(alice.address, bob.address, 1));
  assert.equal(metadata(await pass.tokenURI(1)).json.attributes[0].value, 'VERIFIED - ADMIT');
  await reason(pass.verify.staticCall(id, 1), 'Ticket already used');
});

test('AC-10/38/39: Unicode JSON/SVG metadata and provenance follow current ownership, issuer stays original', async () => {
  const id = await opened(); await tx(pass.connect(alice).buy(id, { value: price }));
  const beforeTransfer = await pass.provenance(1);
  assert.equal(beforeTransfer.issuerAddress, owner.address); assert.equal(beforeTransfer.firstBuyer, alice.address);
  assert.ok(beforeTransfer.mintTime > 0n);
  await tx(pass.transferOwnership(operator.address));
  await tx(pass.connect(alice).transferFrom(alice.address, bob.address, 1));
  const p = await pass.provenance(1); assert.equal(p.currentHolder, bob.address);
  assert.equal(p.issuerAddress, owner.address); assert.equal(p.firstBuyer, alice.address); assert.equal(p.mintTime, beforeTransfer.mintTime);
  const { json, svg } = metadata(await pass.tokenURI(1));
  assert.equal(json.name, 'LivePass 演出 - Ticket #1');
  for (const text of ['LivePass 演出', 'Ticket #1', 'Token #1', owner.address.toLowerCase(), alice.address.toLowerCase(), bob.address.toLowerCase(), 'TRANSFERRED - ADMISSIBLE']) assert.ok(svg.includes(text), text);
  await reason(pass.tokenURI(999), 'ERC721NonexistentToken');
  await reason(pass.provenance(999), 'ERC721NonexistentToken');
  await tx(pass.connect(operator).verify(id, 1));
});

test('AC-34/35/37: deposit gates, full cooldown reset, partial/immediate refund and separate ticket payment', async () => {
  const id = await opened(1, floor); const fan = pass.connect(alice);
  await reason(fan.buy.staticCall(id, { value: price }), 'Insufficient stake');
  await reason(fan.stake.staticCall(), 'Stake must be positive');
  await tx(fan.stake({ value: floor })); const start = await pass.stakeSince(alice.address);
  await reason(fan.buy.staticCall(id, { value: price }), 'Stake cooling down');
  // Pin the boundary to the actual stake block rather than wall-clock mining drift.
  await rpc.request({ method: 'evm_setNextBlockTimestamp', params: [Number(start + 599n)] });
  await rpc.request({ method: 'evm_mine', params: [] });
  await reason(fan.buy.staticCall(id, { value: price }), 'Stake cooling down');
  await rpc.request({ method: 'evm_setNextBlockTimestamp', params: [Number(start + 600n)] });
  await rpc.request({ method: 'evm_mine', params: [] });
  await fan.buy.staticCall(id, { value: price });
  await tx(fan.stake({ value: 1n })); assert.ok(await pass.stakeSince(alice.address) > start);
  await reason(fan.buy.staticCall(id, { value: price }), 'Stake cooling down');
  await reason(fan.unstake.staticCall(0), 'Amount must be positive');
  await reason(fan.unstake.staticCall(floor + 2n), 'Insufficient stake');
  await tx(fan.unstake(1)); assert.equal(await pass.stakeOf(alice.address), floor); // refund not locked by cooldown
  await advance(600);
  await reason(fan.buy.staticCall(id, { value: price - floor }), 'Send the exact ticket price');
  await tx(fan.buy(id, { value: price })); assert.equal(await pass.stakeOf(alice.address), floor);
  const balance = await provider.getBalance(alice.address);
  const refund = await tx(fan.unstake(floor));
  assert.equal(await provider.getBalance(alice.address), balance + floor - refund.fee);
  assert.equal(await pass.stakeOf(alice.address), 0n); assert.equal(await pass.stakeSince(alice.address), 0n);
  assert.equal(await pass.totalStaked(), 0n); await accounted();
});

test('AC-11: organizer can withdraw only revenue; total sales events survive withdrawal', async () => {
  const id = await opened(); await tx(pass.connect(alice).stake({ value: floor * 3n }));
  await tx(pass.connect(bob).stake({ value: floor }));
  await tx(pass.connect(alice).buy(id, { value: price })); await tx(pass.connect(bob).buy(id, { value: price }));
  await accounted(); const balance = await provider.getBalance(owner.address);
  const receipt = await tx(pass.withdraw());
  assert.equal(logs(receipt, 'Withdrawn')[0].args.amount, price * 2n);
  assert.equal(await provider.getBalance(owner.address), balance + price * 2n - receipt.fee);
  assert.equal(await pass.ticketRevenue(), 0n); assert.equal(await pass.totalStaked(), floor * 4n);
  assert.equal((await pass.queryFilter(pass.filters.TicketBought(), 0)).length, 2);
  await tx(pass.connect(alice).unstake(floor * 3n)); await tx(pass.connect(bob).unstake(floor)); await accounted();
});

test('mint callback rejection rolls back ETH, purchase limit, counters and events', async () => {
  const id = await opened(); const a = await actor();
  await tx(a.configure(false, true, false, ZeroAddress));
  await reason(a.purchase.staticCall(id, { value: price }), 'Reject NFT');
  await assert.rejects(tx(a.purchase(id, { value: price, gasLimit: 2000000 })), /revert/i);
  assert.equal(await pass.hasBought(await a.getAddress(), id), false);
  assert.equal((await pass.shows(id)).nextTicketNo, 1n); assert.equal(await pass.ticketRevenue(), 0n);
  assert.equal((await pass.queryFilter(pass.filters.TicketBought(), 0)).length, 0);
  await accounted();
  await tx(a.configure(false, false, true, ZeroAddress)); await tx(a.purchase(id, { value: price }));
  assert.equal(await a.reentrySucceeded(), false); assert.equal(await pass.ownerOf(1), await a.getAddress());
  assert.equal(await a.reentryError(), pass.interface.getError('ReentrancyGuardReentrantCall').selector);
  await accounted();
});

test('ETH receiver rejection rolls back refunds and revenue; reentry cannot drain deposits', async () => {
  const a = await actor(); await tx(a.deposit({ value: floor * 2n }));
  await tx(a.configure(true, false, false, ZeroAddress));
  await reason(a.refund.staticCall(floor), 'ETH transfer failed');
  await assert.rejects(tx(a.refund(floor, { gasLimit: 500000 })), /revert/i);
  assert.equal(await pass.stakeOf(await a.getAddress()), floor * 2n); await accounted();
  await tx(a.configure(false, false, true, ZeroAddress)); await tx(a.refund(floor));
  assert.equal(await a.reentrySucceeded(), false); assert.equal(await pass.stakeOf(await a.getAddress()), floor);
  assert.equal(await a.reentryError(), pass.interface.getError('ReentrancyGuardReentrantCall').selector);
  const id = await opened(); await tx(pass.connect(alice).buy(id, { value: price }));
  await tx(pass.transferOwnership(await a.getAddress())); await tx(a.configure(true, false, false, ZeroAddress));
  await reason(a.collect.staticCall(), 'ETH transfer failed');
  await assert.rejects(tx(a.collect({ gasLimit: 500000 })), /revert/i);
  assert.equal(await pass.ticketRevenue(), price); await accounted();
});

test('receiver may forward Open ticket during safeMint, without corrupting original provenance', async () => {
  const id = await opened(); const a = await actor();
  await tx(a.configure(false, false, false, bob.address));
  const receipt = await tx(a.purchase(id, { value: price }));
  assert.equal(await pass.ownerOf(1), bob.address); assert.equal(await pass.mintHolder(1), await a.getAddress());
  assert.equal(await pass.hasBought(await a.getAddress(), id), true);
  const decoded = receipt.logs.flatMap(log => { try { return [pass.interface.parseLog(log)]; } catch { return []; } }).filter(Boolean);
  const issued = decoded.findIndex(log => log.name === 'TicketIssued');
  const onward = decoded.findIndex(log => log.name === 'Transfer' && log.args.from !== ZeroAddress);
  assert.ok(issued < onward); await accounted();
});

test('accounting remains solvent across a deterministic mixed sequence of deposits, refunds, sales and withdrawals', async () => {
  const ids = [await opened(0), await opened(1), await opened(2, floor)];
  const fans = [alice, bob, operator]; let seed = 7610;
  for (let i = 0; i < 60; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const fan = fans[seed % fans.length]; const connected = pass.connect(fan); const action = (seed >>> 8) % 5;
    if (action === 0) await tx(connected.stake({ value: BigInt(seed % 100 + 1) * floor }));
    else if (action === 1) {
      const amount = await pass.stakeOf(fan.address); if (amount > 0n) await tx(connected.unstake((amount + 1n) / 2n));
    } else if (action === 2) {
      const id = ids[(seed >>> 16) % ids.length]; await advance(600);
      if (!(await pass.hasBought(fan.address, id)) && ((await pass.shows(id)).minStake === 0n || await pass.stakeOf(fan.address) >= floor)) await tx(connected.buy(id, { value: price }));
    } else if (action === 3 && await pass.ticketRevenue() > 0n) await tx(pass.withdraw());
    else await advance(60);
    assert.equal(await pass.totalStaked(), (await Promise.all(fans.map(fan => pass.stakeOf(fan.address)))).reduce((sum, n) => sum + n, 0n));
    await accounted();
  }
});

test('unsolicited transfers revert; forced ETH is surplus, not withdrawable ticket revenue', async () => {
  await assert.rejects(alice.sendTransaction({ to: await pass.getAddress(), value: floor }), /revert/i);
  await rpc.request({ method: 'hardhat_setBalance', params: [await pass.getAddress(), '0x' + floor.toString(16)] });
  assert.equal(await pass.ticketRevenue(), 0n); assert.equal(await pass.totalStaked(), 0n);
  await reason(pass.withdraw.staticCall(), 'No ticket revenue');
  const id = await opened(); await tx(pass.connect(alice).buy(id, { value: price })); await tx(pass.withdraw());
  assert.equal(await provider.getBalance(await pass.getAddress()), floor);
});
