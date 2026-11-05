import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { BrowserProvider, ContractFactory, ZeroAddress, parseEther } from 'ethers';
import hre from 'hardhat';
import { compile } from '../scripts/compile.mjs';

let artifacts, connection, rpc, provider, owner, alice, bob, operator, pass;
const price = parseEther('0.01');

before(async () => {
  artifacts = compile();
  connection = await hre.network.create('hardhatMainnet');
  rpc = connection.provider;
  provider = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  [owner, alice, bob, operator] = await Promise.all([0, 1, 2, 3].map(i => provider.getSigner(i)));
});
after(async () => { provider?.destroy(); await connection?.close(); });

beforeEach(async () => {
  pass = await new ContractFactory(artifacts.LivePass.abi, artifacts.LivePass.bytecode, owner).deploy(owner.address);
  await pass.waitForDeployment();
});

const tx = async promise => (await promise).wait();
async function opened(policy = 1, stake = 0n) {
  const id = await pass.showCount();
  await tx(pass.createShow('LivePass 演出', 'https://example.com/poster.jpg', price, policy, stake));
  await tx(pass.openSale(id));
  return id;
}
async function reason(promise, expected) {
  await assert.rejects(promise, error => {
    assert.equal(error.revert?.name === 'Error' ? error.reason : error.revert?.name ?? error.reason, expected, error.message);
    return true;
  });
}

test('AC-30: operator-wide approval cannot bypass Closed transfer locks', async () => {
  const id = await opened(0);
  const fan = pass.connect(alice);
  await tx(fan.buy(id, { value: price }));
  await tx(fan.setApprovalForAll(operator.address, true));
  const op = pass.connect(operator);
  for (const method of ['transferFrom', 'safeTransferFrom(address,address,uint256)', 'safeTransferFrom(address,address,uint256,bytes)']) {
    const args = method.endsWith(',bytes)') ? [alice.address, bob.address, 1, '0x'] : [alice.address, bob.address, 1];
    await reason(fan[method].staticCall(...args), 'Resale not permitted');
    await reason(op[method].staticCall(...args), 'Resale not permitted');
  }
  assert.equal(await pass.ownerOf(1), alice.address);
  assert.equal(await pass.balanceOf(alice.address), 1n);
});

test('AC-07/31: operator-approved transfer of an Open ticket keeps the transferee admissible', async () => {
  const id = await opened(1);
  const fan = pass.connect(alice);
  await tx(fan.buy(id, { value: price }));
  await tx(fan.setApprovalForAll(operator.address, true));
  await tx(pass.connect(operator).transferFrom(alice.address, bob.address, 1));
  assert.equal(await pass.ownerOf(1), bob.address);
  await tx(pass.verify(id, 1));
  assert.equal(await pass.used(1), true);
});

test('AC-32: Detect stays denied after operator transfer until returned to the first buyer', async () => {
  const id = await opened(2);
  const fan = pass.connect(alice);
  await tx(fan.buy(id, { value: price }));
  await tx(fan.setApprovalForAll(operator.address, true));
  await tx(pass.connect(operator).transferFrom(alice.address, bob.address, 1));
  await reason(pass.verify.staticCall(id, 1), 'Resale not permitted');
  await tx(pass.connect(bob).transferFrom(bob.address, alice.address, 1));
  await tx(pass.verify(id, 1));
  assert.equal(await pass.used(1), true);
});

test('regression: renouncing ownership closes management but purchases and transfers continue', async () => {
  const id = await opened(1);
  await tx(pass.renounceOwnership());
  assert.equal(await pass.owner(), ZeroAddress);
  await Promise.all([
    pass.createShow.staticCall('X', '', price, 1, 0),
    pass.openSale.staticCall(id),
    pass.closeSale.staticCall(id),
    pass.setPrice.staticCall(id, price),
    pass.setResalePolicy.staticCall(id, 0),
    pass.setStakeRequirement.staticCall(id, 0),
    pass.verify.staticCall(id, 1),
    pass.withdraw.staticCall(),
  ].map(call => reason(call, 'OwnableUnauthorizedAccount')));
  const fan = pass.connect(alice);
  await tx(fan.buy(id, { value: price }));
  await tx(fan.transferFrom(alice.address, bob.address, 1));
  assert.equal(await pass.ownerOf(1), bob.address);
  assert.equal(await pass.ticketRevenue(), price);
});
